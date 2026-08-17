import { forwardRef, type ButtonHTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { EditIcon } from "@/components/ui/icons";

type EditButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "md" | "sm";
};

export const EditButton = forwardRef<HTMLButtonElement, EditButtonProps>(function EditButton(
  { children, className, variant = "ghost", size = "md", ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={["ui-edit-button", className].filter(Boolean).join(" ")}
      {...props}
    >
      <EditIcon width={16} height={16} aria-hidden="true" />
      {children}
    </Button>
  );
});
