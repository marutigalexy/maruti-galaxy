import { DASHBOARD_PATH, postLoginPath } from "@/lib/auth/paths";
import { BrandLogo } from "@/components/brand/logo";

import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = postLoginPath(params.next) === DASHBOARD_PATH ? "" : postLoginPath(params.next);

  return (
    <main className="login-shell">
      <section className="login-branding" aria-label="Maruti Galaxy Brand">
        <div className="login-branding-content">
          <BrandLogo width={320} height={128} priority />
        </div>
      </section>
      
      <section className="login-panel" aria-labelledby="login-heading">
        <div className="login-form-container">
          <header className="login-header">
            <h1 id="login-heading">Welcome Back</h1>
          </header>
          <LoginForm nextPath={nextPath} />
        </div>
      </section>
    </main>
  );
}
