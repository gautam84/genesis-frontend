# Genesis Frontend — Architecture & Clean-Code Audit

**Date:** 2026-05-22  
**Scope:** `src/` — full codebase review  
**TypeScript check:** `tsc --noEmit` — PASS (0 errors)  
**ESLint:** `pnpm run lint` — PASS (0 warnings)

---

## Executive Summary

The frontend is in a solid intermediate state. The API layer has been correctly refactored from a monolithic `api.ts` into per-domain modules under `src/lib/api/`. The auth story is architecturally sound: middleware handles proactive token refresh, HttpOnly cookies are the authoritative session store, and `server-only` guards prevent server code from leaking into the client bundle. The barrel-export index keeps backwards-compatible imports across all consumers.

The primary risks are concentrated in the editor layer. The four editor components (`coref-editor.tsx` at 1 309 lines, `pos-editor.tsx` at 1 042 lines, `ner-editor.tsx` at 798 lines) each contain the full application stack — data fetching, business logic, state management, and rendering — in a single client component. This creates severe duplication, makes testing impossible, and means bugs get fixed in one editor but not the others. A secondary risk is the dual-token architecture (localStorage bearer tokens alongside HttpOnly cookies) which is a deliberate migration-in-progress but carries real XSS exposure until completed.

---

## Top 5 Architecture Risks

### RISK-1 — Massive editor god-components with no shared abstraction layer
**Severity: Critical (Architecture)**

`coref-editor.tsx` (1 309 lines), `pos-editor.tsx` (1 042 lines), and `ner-editor.tsx` (798 lines) each re-implement the same patterns: workspace load on mount, session restore with scroll position, document switching, document status toggle, the full sticky header with logo/avatar/back button, and page-level error/loading states. There is no shared hook or component for any of this. When a bug is fixed in one editor, it must be manually replicated in three others. This has already diverged: `CorefEditor` uses a 500ms `setTimeout` for scroll restore and logs `console.log` debug lines; `NerEditor` and `PosEditor` use the same timeout but without the debug logs; `WsdEditor` skips session restore entirely.

**Risk:** Bug-fix labour multiplied by 4. New annotation type requires a full copy-paste fork.

### RISK-2 — Dual authentication token channels (localStorage + HttpOnly cookies)
**Severity: High (Architecture / Security)**

`src/lib/auth.tsx` explicitly comments that `localStorage` is kept as a mirror because "legacy Bearer fetchers still read from localStorage." The WebSocket connection in `src/lib/notifications.tsx` reads the access token from `localStorage` (via `tokenStorage.getAccessToken()`) and sends it in the STOMP `connectHeaders`. `fetchWithAuth` in `src/lib/api/client.ts` also reads from `localStorage`. This means the access token lives in `localStorage`, which is reachable by any JavaScript on the page. If a third-party script or XSS vulnerability is ever introduced, the access token is exposed. HttpOnly cookies prevent exactly this class of attack. The migration is described in comments but there is no completion date or tracking issue.

**Risk:** XSS → session hijack remains possible for as long as the localStorage mirror exists.

### RISK-3 — No data-fetching cache; every navigation triggers redundant API calls
**Severity: High (Architecture / Performance)**

The workspace detail page (`workspace/[id]/page.tsx`) fires three parallel API calls (`getById`, `list`, `getMembers`) on every mount. Each editor fires 2–4 more. There is no React Query, SWR, or Next.js cache involved. Navigating from the editor back to the workspace page refetches everything. More critically, multiple concurrent fetches of the same data (e.g. `getById` is called in both `EditorPage` and each editor component independently) cannot be deduplicated without a cache layer. A stale-while-revalidate strategy would also enable instant page display while background-refreshing.

**Risk:** Poor perceived performance on slow connections; backend hit count scales linearly with navigation frequency.

### RISK-4 — `AuthGuard` is positioned *inside* the loading branch in editor/page.tsx
**Severity: High (Architecture)**

In `src/app/workspace/[id]/editor/page.tsx`, `AuthGuard` wraps the editor components only after the workspace API call completes and the annotation type is resolved. The full loading state (`FullScreenLoader`) and error state render *outside* `AuthGuard`. An unauthenticated request reaching the editor page will trigger `workspaceApi.getById(workspaceId)` — a network call that will fail — before `AuthGuard` can redirect to login. The middleware provides a first line of defence, but the component-level guard should wrap the outermost element, not the inner conditional render.

```tsx
// Current (problematic):
if (loading) return <FullScreenLoader />;        // outside AuthGuard
if (error) return <div>...</div>;               // outside AuthGuard
return (
  <AuthGuard>                                   // guard comes last
    {annotationType === 'POS' && <PosEditor />}
  </AuthGuard>
);

// Correct pattern:
return (
  <AuthGuard>
    {loading && <FullScreenLoader />}
    {error && <div>...</div>}
    {annotationType === 'POS' && <PosEditor />}
  </AuthGuard>
);
```

### RISK-5 — `fetchData` in workspace page is called but not wrapped in `useCallback`; stale-closure suppression hides a dependency bug
**Severity: High (Architecture)**

`src/app/workspace/[id]/page.tsx` line 79 calls `fetchData()` inside a `useEffect` with `[workspaceId, user]` dependencies, but `fetchData` itself is defined as a plain `async function` inside the component (line 106), not as a `useCallback`. The ESLint suppress comment (`// eslint-disable-next-line react-hooks/exhaustive-deps`) hides the fact that `fetchData` is a new function reference on every render, meaning the effect dependency array is technically incomplete. More importantly, if `user` changes (e.g., after token refresh updates the user object), the effect will fire with whatever version of `fetchData` closes over the current render, which may have stale state. The correct fix is wrapping `fetchData` in `useCallback` with proper deps, or inlining the logic directly.

---

## Top 10 Clean-Code Wins

### CC-1 — `console.log` debug lines left in production CorefEditor
**Severity: Medium (Clean Code)**  
**Location:** `src/app/workspace/[id]/editor/coref-editor.tsx:98,101,133,138`

Four `console.log` calls that expose session-restore internals remain in the coreference editor. No other editor has these. They will appear in every user's browser console in production.

```ts
// Lines 98, 101, 133, 138 — remove all four:
console.log('Loaded session:', savedSession);
console.log('Restoring to document index:', initialDocIndex);
console.log('Will restore scroll to:', savedSession.scrollPosition);
console.log('Restored scroll position');
```

### CC-2 — `verify-email/page.tsx` contains stub/mock code with TODOs and `alert()`
**Severity: High (Clean Code / UX)**  
**Location:** `src/app/verify-email/page.tsx:37-57`

The email verification page ships two unimplemented `TODO` comments, two `console.log` calls, and `alert('Verification email sent! ...')`. The token verification is simulated with a `setTimeout`. This page is reachable in production via the signup flow. Users who click a real verification link will see a fake success screen.

```ts
// TODO: Implement actual token verification with backend
console.log('Verifying token:', token);
setTimeout(() => { setVerificationStatus('success'); }, 2000);  // fake

// TODO: Implement actual resend email logic  
setTimeout(() => { alert('Verification email sent! ...'); }, 1000);  // alert in prod
```

### CC-3 — `window.confirm()` used for destructive-action confirmation in four places
**Severity: Medium (Clean Code / A11y)**  
**Locations:**  
- `src/app/workspace/[id]/page.tsx:160,182,195`  
- `src/app/workspace/[id]/editor/ner-editor.tsx:440,704`  
- `src/app/workspace/[id]/wsd-senses/page.tsx:98`

`window.confirm()` is a blocking browser dialog that cannot be styled, is inaccessible to screen readers in a predictable way, and does not follow the existing shadcn/ui design system. The project already uses `Dialog` from shadcn for non-destructive confirmations. All destructive operations should use a shadcn `AlertDialog` component that matches the design language and is testable.

### CC-4 — `getUserInitials()` and `getUserDisplayName()` are duplicated verbatim in WorkspacePage and HomeClient
**Severity: Medium (Clean Code / DRY)**  
**Locations:**  
- `src/app/workspace/[id]/page.tsx:82-95`  
- `src/app/home/HomeClient.tsx:99-112`

The two functions are character-for-character identical. They should be extracted to a utility in `src/lib/utils.ts` or a `useUserDisplay()` hook that takes a `UserResponse`.

### CC-5 — Sticky header markup is duplicated across all four editors and the workspace page
**Severity: High (Clean Code / DRY)**  
**Locations:** `coref-editor.tsx:771`, `ner-editor.tsx:500`, `pos-editor.tsx` (line ~530), `wsd-editor.tsx`, `workspace/[id]/page.tsx:284`

Every editor and the workspace page renders an identical sticky header: genesis logo navigating to `/home`, a separator, the workspace name + subtitle, and an avatar fallback. The `CorefEditor` header additionally has annotation-mode badges and a "Back to Workspace" button. The entire header block (~30 lines) could become a shared `<EditorHeader>` component with slots/props for the right-hand action zone.

### CC-6 — Non-null assertions in `ner-editor.tsx` without guards
**Severity: High (Type Safety)**  
**Location:** `src/app/workspace/[id]/editor/ner-editor.tsx:320,322`

```ts
map.get(i)!.push({ span, depth });
usedDepthsPerToken.get(i)!.add(depth);
```

Both `!` assertions come two lines after `map.set(i, [])` and `usedDepthsPerToken.set(i, new Set())`, which means they are structurally guaranteed not to be `undefined` at this point. However, using `!` instead of a local variable assignment (e.g. `const arr = map.get(i)!`) makes it invisible to future readers that the invariant was just established. Extract to a local variable with a typed guard or use the `??= []` pattern to make the guarantee explicit.

### CC-7 — `formatFileSize` has a residual placeholder string bug
**Severity: Low (Clean Code)**  
**Location:** `src/app/workspace/[id]/_components/DocumentGrid.tsx:54`

```ts
if (!bytes) return 'Unknown logic';  // should be 'Unknown'
```

The string `'Unknown logic'` is visible to end users when `doc.fileSize` is `undefined` or `0`. This is clearly a leftover from development. The correct return value is `'Unknown'` or `'—'`.

### CC-8 — `useEditorSession` includes `isSaving` in `saveSession`'s `useCallback` deps, creating an unnecessary re-render cascade
**Severity: Medium (Performance)**  
**Location:** `src/hooks/useEditorSession.ts:37,55`

`saveSession` is defined with `useCallback([..., isSaving, ...])`. `isSaving` is state that is set to `true` inside `saveSession` itself, which means every save invalidates the `saveSession` reference, which invalidates `handleScroll`, which the editors pass to `onScroll`. In practice the `saveSessionRef` pattern on lines 59–66 breaks the unmount loop, but `handleScroll` still gets a new identity every time a save completes, causing unnecessary re-binds on the scroll handler. Remove `isSaving` from the deps and use a `useRef<boolean>` for the in-flight guard instead.

### CC-9 — `authApi.login()` in `src/lib/api/auth.ts` sets localStorage tokens as a side effect, making it a hidden state mutation
**Severity: Medium (Clean Code / Architecture)**  
**Location:** `src/lib/api/auth.ts:69`

```ts
tokenStorage.setTokens(result.data.accessToken, result.data.refreshToken);
return result;
```

`authApi.login` is an API function, not a state-management function. It silently mutates `localStorage` as a side effect. The authoritative token-set flow now goes through `loginAction` (server action) → `setSessionCookies` → `AuthContext.login` which calls `tokenStorage.setTokens` explicitly. The `authApi.login` method's direct `setTokens` call is a vestige that should be removed to prevent double-write and confusion about who owns token persistence.

### CC-10 — `WsdEditor` dependency-suppression comment hides a missing `loadDocumentAt` dep
**Severity: Medium (Async Correctness)**  
**Location:** `src/app/workspace/[id]/editor/wsd-editor.tsx:78`

```ts
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [workspaceId]);
```

The `useEffect` calls `loadDocumentAt(0, documents)` but `loadDocumentAt` is not in the deps array. `loadDocumentAt` is defined as a plain `async function` inside the component (line 81), so it would be a new reference every render. The correct fix is to wrap `loadDocumentAt` in `useCallback` and add it to the deps array. The ESLint suppress masks this, which is exactly why suppress comments on exhaustive-deps are a maintenance hazard.

---

## Full Findings

### ARCHITECTURE

#### A-1 — Parallel 401 race condition in `fetchWithAuth`
**Severity: High | Category: Architecture**  
**Location:** `src/lib/api/client.ts:92-113`

If two requests fire concurrently and both receive a 401, `tryRefreshToken()` will be called twice in parallel. Both will POST to `/api/auth/refresh` with the same refresh token. Spring will rotate the token on the first call and invalidate the token used in the second call. The second call will return a non-`ok` response, causing `tokenStorage.clearTokens()` to run and throwing `SessionExpiredError`, logging the user out in the middle of a valid session.

**Fix:** Use a module-level `Promise` singleton to serialize refresh attempts:

```ts
let refreshPromise: Promise<boolean> | null = null;

// Inside fetchWithAuth, replace the direct tryRefreshToken() call:
if (response.status === 401 && tokenStorage.getRefreshToken()) {
  if (!refreshPromise) {
    refreshPromise = tryRefreshToken().finally(() => { refreshPromise = null; });
  }
  const refreshed = await refreshPromise;
  // ... rest of retry logic
}
```

#### A-2 — `NotificationProvider` WebSocket reconnects on every user object reference change
**Severity: Medium | Category: Architecture**  
**Location:** `src/lib/notifications.tsx:46-97`

The WebSocket `useEffect` has `[isAuthenticated, user]` as deps (line 97). Because `user` is an object from `useState`, its reference changes on any `AuthContext` re-render (e.g., every call to `refreshUser()`). This causes the STOMP client to be deactivated and re-created on each auth check. `user.id` as a dep (instead of the full `user` object) would prevent spurious reconnections.

```ts
// Change deps from:
}, [isAuthenticated, user]);
// to:
}, [isAuthenticated, user?.id]);
```

#### A-3 — `EditorPage` makes a network call before `AuthGuard` can protect it
**Severity: High | Category: Architecture**  
**Location:** `src/app/workspace/[id]/editor/page.tsx:23-43`  
*(See RISK-4 above for full description.)*

#### A-4 — `workspace/[id]/page.tsx` `fetchData` is not memoized; eslint-disable masks stale closure
**Severity: High | Category: Architecture**  
**Location:** `src/app/workspace/[id]/page.tsx:79,106`  
*(See RISK-5 above for full description.)*

#### A-5 — CorefEditor scroll-restore uses a bare `setTimeout(500ms)` without cleanup
**Severity: Medium | Category: Architecture / Async Correctness**  
**Location:** `src/app/workspace/[id]/editor/coref-editor.tsx:134-141`

```ts
setTimeout(() => {
  if (containerRef.current) {
    containerRef.current.scrollTop = savedSession.scrollPosition;
    lastScrollRef.current = savedSession.scrollPosition;
    console.log('Restored scroll position');
  }
}, 500);
```

This `setTimeout` is not cleaned up. If the component unmounts before 500ms (e.g., the user navigates away quickly), the callback runs on a now-unmounted component, setting state on a stale ref. The same pattern appears in `NerEditor` (line 178) and `PosEditor` (line 176). The correct pattern is to use a `useEffect` with a cleanup that calls `clearTimeout`, or to use `requestAnimationFrame` after layout.

#### A-6 — Home page is a hybrid RSC/client split with no `loading.tsx` for the server fetch
**Severity: Low | Category: Architecture**  
**Location:** `src/app/home/page.tsx`

`home/page.tsx` is a Server Component that calls `listWorkspaces()`. While `home/loading.tsx` exists, it only activates for Suspense-based navigation, not the initial SSR render. If the backend is slow, the user sees a blank page until the server completes `listWorkspaces`. Consider streaming the initial shell and suspending only the workspace list:

```tsx
// home/page.tsx
export default function HomePage() {
  return (
    <HomeShell>
      <Suspense fallback={<WorkspaceListSkeleton />}>
        <WorkspaceListServer />  {/* async RSC */}
      </Suspense>
    </HomeShell>
  );
}
```

#### A-7 — `recommendations/page.tsx` has dead code navigating to editor without using docId
**Severity: Low | Category: Clean Code**  
**Location:** `src/app/workspace/[id]/recommendations/page.tsx:83-86`

```ts
const handleNavigateToDoc = (docId: string) => {
  router.push(`/workspace/${workspaceId}/editor`);
  void docId;  // docId is ignored entirely
};
```

The `void docId` is a suppression to silence an "unused variable" warning. The intent was presumably to navigate to the specific document within the editor, but the editor does not accept a document ID in the URL. This should either be wired up properly (e.g., via a `?doc=` query param consumed by the editor) or replaced with a direct editor link.

---

### CLEAN CODE

#### CC-11 — `renderTokenizedText` is an inline function defined in render body and returns JSX
**Severity: Medium | Category: Clean Code / Performance**  
**Location:** `coref-editor.tsx:599`, `ner-editor.tsx:380`, `pos-editor.tsx` (~line 380)

In all three editors, `renderTokenizedText()` is a plain function (not a component) that is called during render and returns JSX. This means React cannot memoize it, diff its subtree independently, or apply Suspense to it. The function has complex token-filtering logic with `.find()` and `.filter()` loops running on every render, including on scroll events that update `mousePosition`. Extract it into a proper `React.memo`-wrapped component that receives `tokens`, `sentences`, `mentions`, and `clusters` as props. React can then skip re-rendering the text body when only unrelated state (e.g., mouse position) changes.

#### CC-12 — `CorefEditor.renderTokenizedText` runs O(n×m) mention lookups per render
**Severity: Medium | Category: Performance**  
**Location:** `src/app/workspace/[id]/editor/coref-editor.tsx:612-715`

Inside the nested token render loop:
```ts
const mention = mentions.find(
  m => m.documentId === documentContent.documentId &&
    m.sentenceIndex === token.sentenceIndex &&
    token.tokenIndex >= m.startTokenIndex &&
    token.tokenIndex <= m.endTokenIndex
);
```
This is an O(n×m) scan (tokens × mentions) on every render. For a 2 000-token document with 100 mentions this is 200 000 comparisons per render, and `handleMouseMove` triggers renders on every mouse movement. A `useMemo`-computed `Map<tokenIndex, MentionDto>` keyed on `(sentenceIndex, tokenIndex)` would reduce lookup to O(1).

#### CC-13 — `NerEditor.tokenSpanMap` is computed inline during render without memoization
**Severity: Medium | Category: Performance**  
**Location:** `src/app/workspace/[id]/editor/ner-editor.tsx:296-326`

The `tokenSpanMap` computation (sort → nested loop → depth assignment) runs on every render invocation of `NerEditor`. Since `NerEditor` re-renders on `hoveredSpanId` changes (mouse hover), this O(n²) algorithm runs on every token hover. Wrap in `useMemo([annotations])`.

#### CC-14 — Missing `aria-describedby` linking form inputs to their error messages
**Severity: Medium | Category: A11y**  
**Location:** `src/app/login/page.tsx:97-108`, `src/app/signup/page.tsx` (analogous)

The login form sets `aria-invalid={!!errors.usernameOrEmail}` on the input but does not set `aria-describedby` pointing at the error message element. Screen readers announce "invalid" but cannot read the error message text automatically.

```tsx
// Missing: id on error paragraph + aria-describedby on Input
<Input
  id="usernameOrEmail"
  aria-invalid={!!errors.usernameOrEmail}
  aria-describedby={errors.usernameOrEmail ? 'usernameOrEmail-error' : undefined}
  {...register('usernameOrEmail')}
/>
{errors.usernameOrEmail && (
  <p id="usernameOrEmail-error" className="mt-1 text-xs text-red-600">
    {errors.usernameOrEmail.message}
  </p>
)}
```

#### CC-15 — `NotificationProvider.markAsRead` and `deleteNotification` are fire-and-forget; errors are swallowed
**Severity: Medium | Category: Error Handling**  
**Location:** `src/lib/notifications.tsx:99-124`

`markAsRead`, `markAllAsRead`, and `deleteNotification` `await` the API call but are called from event handlers with no error handling. If the API call fails, the UI optimistically mutates (marks as read, removes from list) but the server state diverges. Add a `try/catch` with a `toast.error()` call and a state rollback on failure.

#### CC-16 — `DocumentGrid.statusBadge` uses raw inline class strings instead of CVA variants
**Severity: Low | Category: Tailwind Hygiene**  
**Location:** `src/app/workspace/[id]/_components/DocumentGrid.tsx:43-51`

```ts
function statusBadge(status: string) {
  switch (status) {
    case 'COMPLETE':
      return { label: 'Completed', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' };
```

The color strings are long, not co-located with the `Badge` component, and will diverge from the design system as tokens evolve. Use `cva()` from `class-variance-authority` or a `badgeVariants` extension from the existing `badge.tsx` component.

#### CC-17 — `WorkspacePage.fetchData` swallows the error for the main data fetch silently
**Severity: High | Category: Error Handling**  
**Location:** `src/app/workspace/[id]/page.tsx:122`

```ts
} catch (error) {
  console.error('Failed to fetch workspace data:', error);
} finally {
  setLoading(false);
}
```

When the initial `fetchData` fails (network down, 403, 404), the catch block only logs to console. `loading` is set to `false`, but `workspace` remains `null`. The render tree then reaches:

```tsx
if (!workspace) {
  return <AuthGuard>...<h1>Workspace not found</h1>...</AuthGuard>;
}
```

A network failure is shown identically to "this workspace does not exist," which is misleading to users and to developers debugging. Add a separate `fetchError` state and surface it with a `toast.error()` or an inline error banner.

#### CC-18 — `handleNavigateToDoc` uses `void docId` to silence a linter warning, indicating dead code
**Severity: Low | Category: Clean Code**  
**Location:** `src/app/workspace/[id]/recommendations/page.tsx:83-86`  
*(See A-7 above.)*

#### CC-19 — Header components use inline `onClick={() => router.push('/home')}` on `<Image>` elements without a semantic wrapper
**Severity: Low | Category: A11y**  
**Location:** `coref-editor.tsx:779`, `ner-editor.tsx:511`, `workspace/[id]/page.tsx:287`

```tsx
<Image
  src="/genesis-logo.svg"
  onClick={() => router.push('/home')}
  className="cursor-pointer"
  ...
/>
```

An `<Image>` element is not an interactive element. Keyboard users cannot tab to or activate it. Wrap it in `<button>` or `<Link href="/home">` to make it focusable and activatable with Enter/Space.

#### CC-20 — Test coverage: zero test files
**Severity: High | Category: Testing**

No test files exist under `src/`. There is no Jest, Vitest, React Testing Library, Playwright, or Cypress configuration in `package.json` or anywhere in the project. The editors in particular — with complex token selection logic, cluster merge flows, and optimistic updates — are exactly the code that benefits most from unit and integration tests. The coreference mention overlap detection (`coref-editor.tsx:270-286`) and the NER span depth-assignment algorithm (`ner-editor.tsx:296-326`) are non-trivial and have no regression coverage.

---

## Prioritized Action List

| Priority | ID | Action | Effort |
|---|---|---|---|
| P0 | RISK-1 | Extract `useWorkspaceEditor` hook (workspace load + session restore) shared by all 4 editors | Large |
| P0 | CC-2 | Implement or remove `verify-email` token verification; remove `alert()` and TODOs | Small |
| P1 | RISK-2 | Migrate `fetchWithAuth` and WebSocket to read token from cookie; remove localStorage mirror | Medium |
| P1 | A-1 | Add refresh-token singleton to prevent parallel 401 → double-refresh race | Small |
| P1 | RISK-4 | Move `AuthGuard` to wrap outermost element in `editor/page.tsx` | Trivial |
| P1 | CC-17 | Add `fetchError` state to `WorkspacePage` and surface fetch failures to the user | Small |
| P1 | CC-20 | Bootstrap Vitest + React Testing Library; add unit tests for CorefEditor mention logic and NerEditor depth algorithm | Large |
| P2 | RISK-5 | Wrap `fetchData` in `useCallback` in `WorkspacePage`; remove eslint-disable | Small |
| P2 | A-2 | Change `NotificationProvider` WebSocket dep from `user` to `user?.id` | Trivial |
| P2 | A-5 | Replace bare `setTimeout` scroll-restore with `useEffect` + cleanup in all 3 editors | Small |
| P2 | CC-11/12/13 | Extract `TokenizedText` as a memoized component; memoize `tokenSpanMap` | Medium |
| P2 | CC-4/5 | Extract `getUserInitials`, `getUserDisplayName`, shared `EditorHeader` component | Small |
| P3 | CC-3 | Replace `window.confirm()` with shadcn `AlertDialog` throughout | Medium |
| P3 | CC-14 | Add `aria-describedby` to form error messages in login/signup | Small |
| P3 | CC-19 | Wrap logo images in `<Link href="/home">` for keyboard accessibility | Small |
| P3 | CC-1 | Remove debug `console.log` lines from CorefEditor | Trivial |
| P3 | CC-7 | Fix `'Unknown logic'` string in `DocumentGrid.formatFileSize` | Trivial |
| P3 | CC-9 | Remove side-effect `tokenStorage.setTokens` from `authApi.login` | Small |
| P4 | A-6 | Add Suspense streaming to the home page workspace list | Medium |
| P4 | A-7 | Wire `handleNavigateToDoc` to use `docId` or remove dead code | Small |
| P4 | CC-16 | Replace `statusBadge` inline class strings with CVA variants | Small |
| P4 | CC-10 | Wrap `loadDocumentAt` in `useCallback` in WsdEditor; remove eslint-disable | Small |
