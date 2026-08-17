import { forwardRef, type ButtonHTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { PlusIcon } from "@/components/ui/icons";

type AddButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
  size?: "md" | "sm";
};

export const AddButton = forwardRef<HTMLButtonElement, AddButtonProps>(function AddButton(
  { children, className, variant = "primary", size = "md", ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={["ui-add-button", className].filter(Boolean).join(" ")}
      {...props}
    >
      <PlusIcon width={16} height={16} aria-hidden="true" />
      {children}
    </Button>
  );
});
