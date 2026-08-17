"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { loginAction, type LoginState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { EyeIcon, EyeOffIcon, MailIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";

const initialState: LoginState = { error: null };

type LoginFormProps = {
  nextPath: string;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="login-form" noValidate>
      <input type="hidden" name="next" value={nextPath} />

      <FormField label="Email Address" htmlFor="email" required>
        <div style={{ position: "relative" }}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            required
            disabled={pending}
            aria-required="true"
            style={{ paddingLeft: "40px" }}
          />
          <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--color-placeholder)", pointerEvents: "none" }}>
            <MailIcon width={18} height={18} />
          </div>
        </div>
      </FormField>

      <FormField label="Password" htmlFor="password" required>
        <div className="password-input-wrap">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            disabled={pending}
            aria-required="true"
            style={{ paddingRight: "40px" }}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOffIcon width={18} height={18} /> : <EyeIcon width={18} height={18} />}
          </button>
        </div>
      </FormField>

      {state.error ? (
        <p className="ui-field-error" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} variant="primary">
        {pending ? "Signing in…" : "Sign In"}
      </Button>
    </form>
  );
}
