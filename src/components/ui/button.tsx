import { forwardRef, type ButtonHTMLAttributes } from "react";

import { SpinnerIcon } from "@/components/ui/icons";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "md" | "sm";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", type = "button", className, loading = false, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={["ui-button", `ui-button-${variant}`, size === "sm" ? "ui-button-sm" : "", className]
        .filter(Boolean)
        .join(" ")}
      disabled={Boolean(disabled || loading)}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <SpinnerIcon width={16} height={16} aria-hidden="true" /> : null}
      {children}
    </button>
  );
});
