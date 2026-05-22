# Genesis Frontend — Security Audit Report

**Date:** 2026-05-22
**Scope:** /Users/pocketfm/Desktop/Genesis/genesis-frontend
**Stack:** Next.js 15.5.9, React 19, TypeScript, Tailwind v4, shadcn/ui, pnpm
**Auditor:** Claude Security Reviewer (claude-sonnet-4-6)

---

## Executive Summary

The Genesis frontend has made significant architectural progress toward a secure design — notably the migration from pure localStorage JWT storage toward HttpOnly cookies via Server Actions and middleware. However, the migration is **incomplete**: both storage mechanisms currently coexist, leaving tokens dually exposed. Combined with a critical Next.js version carrying six active middleware-bypass CVEs, absent HTTP security headers (CSP, X-Frame-Options, HSTS), and 52 total dependency vulnerabilities (29 HIGH), the application requires targeted remediation before production hardening is considered complete.

No hardcoded secrets were found. No dangerouslySetInnerHTML usage was found. React auto-escaping is intact throughout. The dual-token architecture, Next.js version, and missing security headers are the highest-priority items.

**Summary of findings:**

| Severity | Count |
|----------|-------|
| High     | 6     |
| Medium   | 7     |
| Low      | 5     |
| Info     | 4     |

---

## 1. Dependency Audit — pnpm audit Results

**Run date:** 2026-05-22
**Total vulnerabilities:** 52 (0 critical, 29 high, 19 moderate, 4 low)

### 1.1 Next.js — Multiple HIGH CVEs (Middleware Bypass, DoS)

**Severity: HIGH**
**Installed version:** 15.5.9
**Patched version:** 15.5.10+

The installed version of Next.js carries seven disclosed HIGH-severity CVEs:

| Advisory | Title |
|---|---|
| GHSA-h25m-26qc-wcjf | HTTP request deserialization DoS with insecure RSC |
| GHSA (middleware bypass) | Middleware/Proxy bypass via segment-prefetch routes |
| GHSA (middleware bypass follow-up) | Incomplete fix follow-up for segment-prefetch bypass |
| GHSA (dynamic route injection) | Middleware bypass via dynamic route parameter injection |
| GHSA (i18n) | Middleware bypass in Pages Router using i18n |
| GHSA (cache DoS) | DoS via connection exhaustion using Cache Components |
| GHSA (WebSocket SSRF) | SSRF in applications using WebSocket upgrades |

The middleware bypass CVEs are the most dangerous for this application because the entire authentication boundary at /home and /workspace/* is enforced exclusively in src/middleware.ts. If middleware can be bypassed, unauthenticated users can access all protected routes directly.

**Fix:**
```
pnpm update next@latest
```
Target: next@15.5.10 or later

### 1.2 @modelcontextprotocol/sdk — ReDoS + Cross-Client Data Leak

**Severity: HIGH** (devDependency — does not ship to production browser bundle)
**Path:** .>shadcn>@modelcontextprotocol/sdk

Two CVEs: GHSA-8r9q-7v3j-jr4g (ReDoS) and GHSA-345p-7cg4-v4c7 (cross-client data leak). Because shadcn is a devDependency (the CLI tool), these are not in the production browser bundle but should be updated:

```
pnpm update shadcn@latest
```

### 1.3 minimatch — Multiple ReDoS Variants (transitive, dev toolchain only)

**Severity: HIGH** (dev toolchain — eslint-config-next, ts-morph paths — not in browser bundle)

Multiple GHSA advisories for catastrophic backtracking in minimatch glob patterns.

### 1.4 flatted — Prototype Pollution + DoS (transitive, dev toolchain only)

**Severity: HIGH** (build toolchain, not in browser bundle)

### 1.5 fast-uri — Path Traversal + Host Confusion (transitive, dev toolchain only)

**Severity: HIGH** (build toolchain, not in browser bundle)

Path traversal via percent-encoded dot segments; host confusion via percent-encoded authority delimiters.

### 1.6 picomatch — ReDoS via Extglob Quantifiers (dev toolchain only)

**Severity: HIGH** (build toolchain, not in browser bundle)

**Note:** Of all HIGH packages, only next@15.5.9 ships to production users. All other HIGH vulnerabilities are in devDependencies/build toolchain and pose no direct risk to application users.

---

## 2. Token Storage — Dual localStorage + HttpOnly Cookie Coexistence

**Severity: HIGH**
**Location:** src/lib/api/client.ts:35-61, src/lib/auth.tsx:66, src/lib/notifications.tsx:55

The codebase is in the middle of a migration from localStorage-based token storage to HttpOnly cookies. The migration is incomplete: tokens are stored in both places simultaneously.

```
// src/lib/auth.tsx:66
tokenStorage.setTokens(result.data.accessToken, result.data.refreshToken);

// src/lib/notifications.tsx:55
const accessToken = tokenStorage.getAccessToken(); // reads from localStorage
```

**Risk:** localStorage is accessible to any JavaScript running on the page, including injected scripts from XSS attacks and browser extensions. The HttpOnly cookies are not readable by JavaScript and are safe from this class of attack, but the localStorage mirror negates that protection entirely.

**Attack chain:**
1. Attacker finds any stored XSS
2. document.cookie is inaccessible (HttpOnly protected), but localStorage.getItem('genesis_access_token') returns the JWT
3. Attacker exfiltrates the token and impersonates the user

**Fix — complete the migration:**

Step 1: Remove all tokenStorage.setTokens() calls from client code after login. The HttpOnly cookie is already being set by setSessionCookies() in the Server Action.

Step 2: Remove the tokenStorage.getAccessToken() call in notifications.tsx. The WebSocket should authenticate via a ticket endpoint or cookie-based handshake.

Step 3: Migrate all fetchWithAuth calls to use the cookie-based serverFetch from Server Actions, so client-side JS never needs to read the token.

Step 4: Deprecate and remove the tokenStorage module.

---

## 3. Next.js Security Headers — Absent CSP, X-Frame-Options, HSTS

**Severity: HIGH**
**Location:** next.config.ts (lines 1-8)

next.config.ts contains only output: 'standalone'. No security headers are configured.

Missing headers and their risks:

| Header | Risk Without It |
|---|---|
| Content-Security-Policy | XSS — no restriction on which scripts/frames can execute |
| X-Frame-Options / frame-ancestors | Clickjacking — app can be embedded in a hostile iframe |
| Strict-Transport-Security (HSTS) | SSL stripping attacks in production |
| X-Content-Type-Options: nosniff | MIME-type sniffing attacks |
| Referrer-Policy | Leaks URL paths (which include workspace IDs) to third-party origins |

**Fix — add to next.config.ts:**

```typescript
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' ws: wss:",
      "img-src 'self' data: blob:",
      "frame-ancestors 'none'",
    ].join('; '),
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};
```

---

## 4. Open Redirect via Server-Controlled notification.link

**Severity: MEDIUM**
**Location:** src/components/NotificationDropdown.tsx:24

```typescript
const handleNotificationClick = async (id: string, link?: string) => {
    await markAsRead(id);
    if (link) {
        router.push(link);  // link comes directly from the backend API response
    }
};
```

The link field comes from the API response and is passed directly to router.push() without validation. If the backend is ever compromised, or if a crafted notification is injected with a javascript: URI or external URL, the frontend will redirect unconditionally.

**Fix:**

```typescript
const handleNotificationClick = async (id: string, link?: string) => {
    await markAsRead(id);
    if (link && link.startsWith('/') && !link.startsWith('//')) {
        router.push(link);
    }
};
```

---

## 5. Client-Side-Only Role Enforcement (Admin UI Gating)

**Severity: MEDIUM**
**Location:** src/app/workspace/[id]/page.tsx:56, src/app/workspace/[id]/_components/MemberManagement.tsx:70

isAdmin is derived exclusively from the client-side members state:

```typescript
// page.tsx:56
const isAdmin = currentUserRole === 'ADMIN';
```

The UI correctly hides admin actions from non-admins. However, the API calls themselves (workspaceApi.addMember, workspaceApi.removeMember, workspaceApi.updateMemberRole) are called directly from client-side event handlers with no additional authorization gate within the Next.js tier. Any user who calls the API directly bypasses the UI guard.

The backend Spring layer should enforce roles on every mutation endpoint. The concern is that the frontend gives a false sense of security. A Server Action layer within Next.js should re-validate the session before passing requests to Spring.

---

## 6. Tokens Logged to Browser Console

**Severity: MEDIUM**
**Location:** src/app/verify-email/page.tsx:38, 53

```typescript
console.log('Verifying token:', token);
console.log('Resending verification email to:', email);
```

Verification tokens and email addresses are printed to the browser console. In production, browser extensions and developer tools can read these logs.

**Fix:** Remove console.log calls from production code or wrap in:
```typescript
if (process.env.NODE_ENV === 'development') { console.log(...); }
```

---

## 7. WebSocket Authentication via localStorage Token

**Severity: MEDIUM**
**Location:** src/lib/notifications.tsx:55-62

```typescript
const accessToken = tokenStorage.getAccessToken(); // reads from localStorage
const client = new Client({
    webSocketFactory: () => new SockJS(socketUrl),
    connectHeaders: { Authorization: `Bearer ${accessToken}` },
    ...
});
```

The STOMP/SockJS WebSocket handshake sends the JWT from localStorage. This is a direct dependency on the insecure storage discussed in Finding 2, and the token is visible in the browser network inspector's WebSocket frames (visible to browser extensions with webRequest permission).

**Fix:** After removing localStorage tokens (Finding 2 fix), use a short-lived WebSocket ticket issued by a Server Action, or configure SockJS to use cookie-based authentication on the backend.

---

## 8. document.querySelector with Server-Supplied Mention ID

**Severity: MEDIUM**
**Location:** src/app/workspace/[id]/editor/coref-editor.tsx:516

```typescript
const element = document.querySelector(`[data-mention-id="${mentionId}"]`) as HTMLElement;
```

mentionId comes from the backend API response. Interpolating API-supplied values directly into CSS selector strings without escaping is an unsafe pattern. If a malicious backend returns a mentionId containing CSS selector metacharacters, the selector could be corrupted. While document.querySelector throws a DOMException on invalid selectors (no code execution), the pattern is unsafe.

**Fix:**
```typescript
const element = document.querySelector(
    `[data-mention-id="${CSS.escape(mentionId)}"]`
) as HTMLElement;
```

---

## 9. File Upload — No Client-Side MIME or Size Validation

**Severity: MEDIUM**
**Location:** src/app/workspace/[id]/page.tsx:205-221, src/lib/api/document.ts:22-43

```html
<!-- No 'accept' attribute on the file input -->
<input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
```

```typescript
const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !workspace) return;
    // No type or size check before upload
    await documentApi.upload(workspace.id, file);
```

No client-side validation of file MIME type or size. Users can accidentally upload wrong file types (binaries, large files) that the tokenization pipeline cannot handle.

**Fix:**
```typescript
const ALLOWED_EXTENSIONS = ['.txt', '.conll'];
const MAX_SIZE_MB = 50;

if (!ALLOWED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))) {
    toast.error('Only .txt and .conll files are supported');
    return;
}
if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    toast.error(`File must be smaller than ${MAX_SIZE_MB} MB`);
    return;
}
```

Also add `accept=".txt,.conll,text/plain"` to the input element.

---

## 10. verify-email Token Verification Not Implemented

**Severity: MEDIUM**
**Location:** src/app/verify-email/page.tsx:37-57

```typescript
// TODO: Implement actual token verification with backend
console.log('Verifying token:', token);
setTimeout(() => {
  setVerificationStatus('success');  // always succeeds — never calls backend
}, 2000);

// resend:
setTimeout(() => {
  alert('Verification email sent!');  // uses alert() not toast
}, 1000);
```

The email verification flow is entirely simulated. The token is never sent to the backend — verification always succeeds after 2 seconds regardless of token validity. Any user who navigates to /verify-email?token=anything will be shown a success screen.

**Fix:** Implement the actual API call to the backend verify endpoint. Replace alert() with toast.success() from sonner (already a dependency).

---

## 11. Insecure Cookie Flags in Non-Production Environments

**Severity: LOW**
**Location:** src/lib/server/api.ts:31, src/middleware.ts:23

```typescript
secure: process.env.NODE_ENV === 'production',
```

The Secure flag is only set in production. In staging/review environments running on HTTP, the 30-day refresh token is transmitted in plaintext. Cookie names also lack the __Host- prefix which would enforce Secure + no Domain + path=/ constraints at the browser level.

**Fix:** Consider using __Host-genesis_access_token and __Host-genesis_refresh_token as cookie names.

---

## 12. SameSite: lax Allows Logout CSRF

**Severity: LOW**
**Location:** src/app/api/auth/end-session/route.ts (GET endpoint)

SameSite=Lax allows cookies to be sent on top-level GET navigations from external sites. The /api/auth/end-session route handles GET requests and clears session cookies. An attacker can embed an image tag pointing to this endpoint on any external page, which will trigger a cross-origin GET that logs out the current user.

**Fix:** Change /api/auth/end-session to accept POST requests only. Or add a CSRF token check.

---

## 13. AuthGuard Client-Side Only — No SSR Enforcement

**Severity: LOW**
**Location:** src/components/auth-guard.tsx:16-28

AuthGuard is a client component. The middleware at src/middleware.ts is the real enforcement gate. If the middleware is bypassed (see Next.js CVEs in Finding 1.1), AuthGuard provides no protection. Additionally, the editor page makes an API call to determine annotation type before AuthGuard has completed its check, resulting in a 401-triggering unauthenticated API call on unauthenticated access.

**Fix:** After patching Next.js, move the annotation type data fetch into a Server Component that reads from cookies to eliminate the race condition.

---

## 14. Password Minimum Length — Only 6 Characters

**Severity: LOW**
**Location:** src/lib/validation/auth.ts:29

```typescript
password: z.string().min(6, 'Password must be at least 6 characters'),
```

NIST SP 800-63B recommends a minimum of 8 characters for user-chosen passwords. 6 characters allows very weak passwords.

**Fix:** Raise to min(8) or min(12).

---

## 15. console.log of Session Data in Coref Editor

**Severity: LOW**
**Location:** src/app/workspace/[id]/editor/coref-editor.tsx:98-138

```typescript
console.log('Loaded session:', savedSession);
console.log('Restoring to document index:', initialDocIndex);
console.log('Will restore scroll to:', savedSession.scrollPosition);
```

Session metadata logged to the browser console in production.

**Fix:** Wrap in process.env.NODE_ENV === 'development' guard or remove.

---

## 16. NEXT_PUBLIC_API_URL — Expected Client Exposure (Positive)

**Severity: Info**
**Location:** src/lib/api/client.ts:15

Only NEXT_PUBLIC_API_URL is exposed to the client bundle. No secrets, API keys, database credentials, or signing keys use the NEXT_PUBLIC_ prefix. The production guard at client.ts:11-13 prevents the fallback localhost URL from being used in production builds. No action required beyond ensuring no future secrets use this prefix.

---

## 17. No CSP — XSS Amplification Risk

**Severity: Info** (mitigated by React auto-escaping; see Finding 3 for fix)

No Content-Security-Policy header is set. No dangerouslySetInnerHTML usage was found in the entire codebase — React auto-escaping is intact. Without a CSP, any future accidental XSS from a dependency update or new feature has no second-layer defence.

---

## 18. No Rate Limiting on Frontend Login Submissions

**Severity: Info**

The login form (src/app/login/page.tsx) has no client-side rate limiting or lockout delay. The loginAction Server Action calls the backend without any retry delays. Rate limiting must be implemented at the Spring backend. No frontend change required if the backend implements it, but a progressive client-side delay on repeated failures would add defence-in-depth.

---

## 19. Third-Party Scripts — None Found (Positive Finding)

**Severity: Info (positive)**

No third-party analytics scripts, CDN-hosted libraries, or external script tags were found. All dependencies are bundled locally via pnpm. This eliminates SRI (Subresource Integrity) concerns and third-party script XSS vectors.

---

## 20. CORS via Fetch Without credentials: include

**Severity: Info**
**Location:** src/lib/api/client.ts:80

The fetchWithAuth wrapper does not pass credentials: 'include'. This is correct for the current Bearer token model. When the migration to cookie-based auth (Finding 2) is complete, credentials: 'include' will be required for cross-origin fetch calls. The Spring backend's CORS_ALLOWED_ORIGINS must not be set to '*' in production.

---

## Prioritized Action List

### Immediate (before next production deployment)

1. [HIGH] Update next to 15.5.10+ — patches six middleware-bypass and DoS CVEs that directly affect the application's authentication boundary.

2. [HIGH] Add HTTP security headers to next.config.ts — at minimum X-Frame-Options: DENY, X-Content-Type-Options: nosniff, and a baseline CSP with frame-ancestors 'none'. Without these, clickjacking is trivially possible.

3. [HIGH] Complete the localStorage to HttpOnly cookie token migration — stop writing tokens to localStorage in src/lib/auth.tsx:66. This is the most architecturally impactful security improvement.

### Short-Term (within 2 weeks)

4. [MEDIUM] Fix the notification.link open redirect — validate that the link starts with '/' before calling router.push(link).

5. [MEDIUM] Implement the email verification flow in verify-email/page.tsx — remove the simulated success path and the console log of the verification token.

6. [MEDIUM] Fix WebSocket authentication — after removing localStorage tokens, use a server-issued ticket or cookie-based SockJS authentication.

7. [MEDIUM] Add accept attribute and MIME/size validation to the file upload input.

8. [MEDIUM] Remove all console.log calls from production code.

### Medium-Term

9. [LOW] Use CSS.escape(mentionId) in the document.querySelector call in coref-editor.tsx:516.

10. [LOW] Change /api/auth/end-session to a POST endpoint to prevent logout CSRF.

11. [LOW] Raise minimum password length to 8 characters in src/lib/validation/auth.ts.

12. [LOW] Add Server Action wrappers for admin mutations as a defence-in-depth layer within the Next.js tier.

13. [INFO] Add pnpm audit --audit-level=high to CI pipeline to block future vulnerable dependencies.

---

## Appendix: pnpm audit Summary

Total: 52 vulnerabilities (0 critical, 29 high, 19 moderate, 4 low)

HIGH severity — production runtime impact:

| Package | In Browser Bundle | Advisory Type |
|---|---|---|
| next@15.5.9 | YES — critical | Middleware bypass x4, DoS x2, SSRF x1 |

HIGH severity — build/dev toolchain only (no production browser impact):

| Package | Advisory Type |
|---|---|
| @modelcontextprotocol/sdk | ReDoS, cross-client data leak |
| minimatch (x6 advisories) | ReDoS variants |
| flatted | Prototype pollution, DoS |
| picomatch (x2) | ReDoS |
| fast-uri (x2) | Path traversal, host confusion |
| @isaacs/brace-expansion | ReDoS |

---

*This report covers the frontend codebase only. Backend security (Spring Boot, JWT signing, database access controls, rate limiting on login/refresh endpoints) requires a separate audit.*
