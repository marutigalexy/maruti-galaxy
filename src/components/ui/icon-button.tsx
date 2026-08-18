"use client";

import { useEffect, useRef, useState, forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";

type IconButtonTone = "default" | "edit" | "delete" | "activate" | "deactivate" | "print" | "allocate" | "password";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  tone?: IconButtonTone;
  children: ReactNode;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    label,
    tone = "default",
    type = "button",
    className,
    children,
    onBlur,
    onFocus,
    onMouseEnter,
    onMouseLeave,
    ...props
  },
  ref,
) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
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
    const onReposition = () => setCoords(null);
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [coords]);

  return (
    <>
      <button
        ref={setRefs}
        type={type}
        aria-label={label}
        className={["ui-icon-button", `ui-icon-button-${tone}`, className].filter(Boolean).join(" ")}
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
        {children}
      </button>
      {coords
        ? createPortal(
            <span
              className={["ui-tooltip", "is-open", coords.placement === "below" ? "is-below" : "is-above"].join(" ")}
              role="tooltip"
              style={{ top: coords.top, left: coords.left }}
            >
              {label}
            </span>,
            document.body,
          )
        : null}
    </>
  );
});
