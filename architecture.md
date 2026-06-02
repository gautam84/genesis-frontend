# Architecture

This is the structure for `genesis-frontend` — a feature-sliced architecture adapted to
Genesis's actual problem: four divergent annotation editors over one Spring backend, with a
cookie-based auth layer Next.js owns by hand.

The inline `←` notes record where each piece lived before the migration (the `lib/`-centric
layout), so this doubles as a historical migration map.

## Migration status (completed 2026-06)

The migration landed as a stack of always-green PRs (server layer → config/fonts/constants →
leaf data-tiers → auth/workspace → editor slices → route groups → editor-core relocation →
shim teardown). Deliberate deviations from the original blueprint below:

- **`EditorShell.tsx` / `span-math.ts` were NOT extracted.** Investigation confirmed the
  editors diverge fundamentally (NER nested-span depth-packing vs coref overlap-prevention);
  the only shared primitive was a trivial `[min,max]`. The genuinely shared pieces
  (`DocumentSwitcher`, `EditorHelpPanel`, `EditorLoadMore`, the two hooks) live in
  `editor/core/`; divergent chrome + span rendering stay per-editor (as the
  "Deliberately omitted" section already prescribed).
- **Editor hooks kept their names** (`useEditorSession`, `usePaginatedDocument`) rather than
  being split/renamed into `useAutosave` + `useEditorDocuments` — that split is a behavioural
  refactor with no functional gain, deliberately skipped.
- **`CursorPage<T>` kept its name** (not renamed to `Page<T>`) — see the note in
  `server/contracts/common.ts`.
- **ESLint `import/no-restricted-paths` boundary rules** were deferred (would add a plugin
  dependency); a worthwhile follow-up.

## Guiding principles

- **Vertical feature slices.** Each domain owns its UI, hooks, and data layer together
  under `features/<domain>/`. `app/` becomes thin routing that delegates into features.
- **One clear server boundary.** `server/` holds the cross-cutting Spring client, cookie
  config, and error types. Everything talking to Spring goes through it.
- **Three-tier data flow per feature**, with unambiguous names (no "api" overloading):
  `*.contracts.ts` (types mirrored from Spring DTOs) → `*.gateway.ts` (`'server-only'`
  HTTP) → `*.actions.ts` (`'use server'`, returns `ActionResult`).
- **Hooks, not stores.** Editor state stays in React hooks; no global store layer.
- **Editor `core/` holds only what genuinely generalizes.** Chrome, doc lifecycle,
  autosave, shortcuts, span math. Token rendering and selection stay per-editor because
  the models diverge (NER underline-stacking vs coref mentions + linking arrows).

## Tree

```
genesis-frontend/
├── src/
│   ├── app/                                  # Thin routing — delegates into features/
│   │   ├── layout.tsx                        # Root: fonts + <AuthProvider> (auth pages need it)
│   │   ├── globals.css
│   │   ├── error.tsx
│   │   ├── not-found.tsx
│   │   │
│   │   ├── (auth)/                           # Route group — unauthenticated
│   │   │   ├── layout.tsx                     # Minimal shell (no notifications/guard)
│   │   │   ├── login/page.tsx                 # ← app/login
│   │   │   ├── signup/page.tsx                # ← app/signup
│   │   │   └── verify-email/page.tsx          # ← app/verify-email
│   │   │
│   │   ├── (app)/                            # Route group — authenticated
│   │   │   ├── layout.tsx                     # AuthGuard + NotificationProvider scoped here
│   │   │   ├── home/page.tsx                  # ← app/home
│   │   │   └── workspace/[id]/
│   │   │       ├── page.tsx                   # Workspace shell (sections stay in-page)
│   │   │       ├── editor/page.tsx            # Dispatches by annotationType
│   │   │       ├── recommendations/page.tsx
│   │   │       └── wsd-senses/page.tsx
│   │   │
│   │   └── api/                              # Route handlers (only where actions don't fit)
│   │       ├── auth/end-session/route.ts      # Clears cookies → /login
│   │       └── export/[type]/[id]/route.ts    # Proxies blob download from Spring
│   │
│   ├── middleware.ts                         # Edge: proactive token refresh + route guard
│   │
│   ├── features/
│   │   ├── editor/
│   │   │   ├── core/                          # Task-agnostic primitives (the real dedup)
│   │   │   │   ├── components/
│   │   │   │   │   └── EditorShell.tsx         # Header + 3-pane + loading/error/nav chrome
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useEditorDocuments.ts   # Mount-load + doc switch + scroll restore
│   │   │   │   │   ├── useAutosave.ts          # ← hooks/useEditorSession.ts
│   │   │   │   │   └── useShortcuts.ts         # keydown registry (Esc, label keys)
│   │   │   │   ├── span-math.ts                # overlap / [min,max] / depth-packing (pure)
│   │   │   │   ├── editor.contracts.ts         # TokenDto, DocumentContentResponse, …  ← lib/api/editor.ts
│   │   │   │   ├── editor.gateway.ts           # 'server-only'  ← lib/server/editor.ts
│   │   │   │   └── editor.actions.ts           # 'use server'   ← lib/actions/editor.ts
│   │   │   │
│   │   │   ├── coref/                          # Mentions, clusters, linking arrows, merge
│   │   │   │   ├── components/                 # CorefEditor + own span/arrow rendering
│   │   │   │   ├── hooks/
│   │   │   │   └── coref.{contracts,gateway,actions}.ts
│   │   │   ├── ner/                            # Nested-span underlines + tag palette
│   │   │   │   ├── components/                 # NerEditor + own span rendering
│   │   │   │   └── ner.{contracts,gateway,actions}.ts
│   │   │   ├── pos/
│   │   │   │   └── pos.{contracts,gateway,actions}.ts
│   │   │   ├── wsd/
│   │   │   │   └── wsd.{contracts,gateway,actions}.ts
│   │   │   └── dispatch.tsx                    # annotationType → editor  ← app/workspace/[id]/editor/page.tsx
│   │   │
│   │   ├── workspace/
│   │   │   ├── components/                     # WorkspaceShell, Sidebar, DocumentGrid,
│   │   │   │                                   #   MemberManagement, ExportDialog
│   │   │   └── workspace.{contracts,gateway,actions}.ts
│   │   ├── document/
│   │   │   └── document.{contracts,gateway,actions}.ts
│   │   ├── auth/
│   │   │   ├── components/                     # AuthGuard  ← components/auth-guard.tsx
│   │   │   ├── auth.provider.tsx               # ← lib/auth.tsx (AuthProvider/useAuth)
│   │   │   ├── auth.schemas.ts                 # zod  ← lib/validation/auth.ts
│   │   │   └── auth.{contracts,gateway,actions}.ts
│   │   ├── recommendations/
│   │   │   ├── components/
│   │   │   └── recommendations.{contracts,gateway,actions}.ts
│   │   └── notifications/
│   │       ├── components/                     # NotificationDropdown
│   │       ├── notifications.provider.tsx      # ← lib/notifications.tsx (STOMP/SockJS)
│   │       └── notifications.{contracts,gateway,actions}.ts
│   │
│   ├── server/                               # Cross-cutting server infra
│   │   ├── http.ts                            # serverFetch + cookie set/clear ('server-only')  ← lib/server/api.ts
│   │   ├── cookies.ts                         # Cookie names/options/TTL — Edge-safe (NOT server-only;
│   │   │                                      #   shared by middleware AND http.ts)
│   │   ├── errors.ts                          # SessionExpired / Network  ← lib/errors.ts
│   │   └── contracts/
│   │       └── common.ts                      # ApiResponse<T>, ActionResult<T>, Page<T>
│   │
│   ├── components/ui/                         # shadcn primitives (unchanged)
│   │   └── …
│   │
│   ├── lib/
│   │   ├── utils.ts                           # cn(), isOneOf()
│   │   ├── fonts.ts                           # Geist setup (extracted from app/layout.tsx)
│   │   └── constants.ts                       # palettes, PAGE_SIZE (currently inline in editors)
│   │
│   └── config/
│       └── env.ts                             # Validates NEXT_PUBLIC_API_URL etc. at boot
│
├── public/                                   # genesis-logo.svg, favicon, …
│
├── next.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── postcss.config.mjs                        # Tailwind v4 (CSS-first; no tailwind.config.ts)
├── components.json
├── package.json
├── pnpm-lock.yaml
├── Dockerfile
├── README.md
└── CLAUDE.md
```

## Deliberately omitted (and why)

- **`server/auth/rbac.ts`** — no role-gating exists today and roles aren't surfaced for
  the frontend to enforce. Don't scaffold until there's a real requirement.
- **Per-feature `store/` (zustand)** — editor state is hook-managed; a global store layer
  isn't warranted.
- **`SpanLayer` / `TextCanvas` / `useSelection` as shared primitives** — the editors'
  selection and rendering models diverge too much (click-anchor + nested underlines vs
  drag-select + mention arrows + paginated content). Kept per-editor.
- **`document/[docId]` route** — document switching stays in-component (by index, with
  session persistence). URL-addressable documents would remount the editor and drop the
  in-memory mention/cluster cache; that's a separate, deliberate decision.
- **`tailwind.config.ts`** — Tailwind v4 is configured CSS-first via `globals.css`.

## Data-layer flow

```
UI (feature components)
  → <feature>.actions.ts      'use server'   — returns ActionResult, maps errors
    → <feature>.gateway.ts    'server-only'  — serverFetch(Bearer from cookie) to Spring
      → server/http.ts                        — shared client; 401 → SessionExpiredError
```
Auth tokens live in HttpOnly cookies; `middleware.ts` refreshes them at the edge before
render, using the shared config in `server/cookies.ts`.
