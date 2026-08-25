"use client";

import { useEffect, useRef, useState, forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { SpinnerIcon } from "@/components/ui/icons";

type IconButtonTone = "default" | "edit" | "delete" | "activate" | "deactivate" | "print" | "allocate" | "password";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  tone?: IconButtonTone;
  loading?: boolean;
  children: ReactNode;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    label,
    tone = "default",
    type = "button",
    className,
    children,
    loading = false,
    disabled,
    onBlur,
    onFocus,
    onMouseEnter,
    onMouseLeave,
    ...props
  },
  ref,
) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const tipRef = useRef<HTMLSpanElement | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; placement: "above" | "below" } | null>(
    null,
  );

  function setRefs(node: HTMLButtonElement | null) {
    buttonRef.current = node;
    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  }

  function showTooltip() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const placement = rect.top < 56 ? "below" : "above";
    setCoords({
      top: placement === "below" ? rect.bottom : rect.top,
      left: rect.left + rect.width / 2,
      placement,
    });
  }

  function hideTooltip() {
    setCoords(null);
  }

  useEffect(() => {
    if (!coords) {
      return;
    }
    const tip = tipRef.current;
    if (tip && typeof tip.showPopover === "function" && !tip.matches(":popover-open")) {
      try {
        tip.showPopover();
      } catch {
        // Fallback for browsers or environments without popover support
      }
    }
    const onReposition = () => setCoords(null);
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [coords]);

  const targetContainer =
    typeof document !== "undefined"
      ? (buttonRef.current?.closest("dialog") ?? document.body)
      : null;

  return (
    <>
      <button
        ref={setRefs}
        type={type}
        aria-label={label}
        className={["ui-icon-button", `ui-icon-button-${tone}`, className].filter(Boolean).join(" ")}
        disabled={Boolean(disabled || loading)}
        aria-busy={loading || undefined}
        onMouseEnter={(event) => {
          showTooltip();
          onMouseEnter?.(event);
        }}
        onMouseLeave={(event) => {
          hideTooltip();
          onMouseLeave?.(event);
        }}
        onFocus={(event) => {
          showTooltip();
          onFocus?.(event);
        }}
        onBlur={(event) => {
          hideTooltip();
          onBlur?.(event);
        }}
        {...props}
      >
        {loading ? <SpinnerIcon width={16} height={16} aria-hidden="true" /> : children}
      </button>
      {coords && targetContainer
        ? createPortal(
            <span
              ref={tipRef}
              popover="manual"
              className={["ui-tooltip", "is-open", coords.placement === "below" ? "is-below" : "is-above"].join(" ")}
              role="tooltip"
              style={{ top: coords.top, left: coords.left }}
            >
              {label}
            </span>,
            targetContainer,
          )
        : null}
    </>
  );
});
