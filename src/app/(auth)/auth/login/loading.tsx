import { AuthPageSkeleton } from "@/components/ui/skeleton";

export default function LoginLoading() {
  return (
    <main className="login-shell">
      <section className="login-branding" aria-hidden="true" />
      <section className="login-panel">
        <div className="login-form-container">
          <AuthPageSkeleton />
        </div>
      </section>
    </main>
  );
}
