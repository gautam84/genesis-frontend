/**
 * Minimal layout for unauthenticated auth pages (login/signup/verify-email).
 * No AuthGuard and no NotificationProvider — those are scoped to `(app)`.
 * AuthProvider is provided by the root layout, so useAuth still works here.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
