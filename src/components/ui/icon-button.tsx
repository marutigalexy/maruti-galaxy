import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type IconButtonTone = "default" | "edit" | "delete" | "activate" | "deactivate" | "print" | "allocate" | "password";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  tone?: IconButtonTone;
  children: ReactNode;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, tone = "default", type = "button", className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={["ui-icon-button", `ui-icon-button-${tone}`, className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </button>
  );
});
