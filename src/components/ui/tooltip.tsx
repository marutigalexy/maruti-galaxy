"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type TooltipProps = {
  label: string;
  children: ReactNode;
  enabled?: boolean;
  className?: string;
};

export function Tooltip({ label, children, enabled = true, className }: TooltipProps) {
  const itemRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  function show() {
    if (!enabled) {
      return;
    }
    const target = (itemRef.current?.firstElementChild as HTMLElement | null) ?? itemRef.current;
    const rect = target?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    setCoords({ top: rect.top + rect.height / 2, left: rect.right + 10 });
  }

  function hide() {
    setCoords(null);
  }

  useLayoutEffect(() => {
    if (!coords) {
      return;
    }
    const tip = tipRef.current;
    if (tip && typeof tip.showPopover === "function" && !tip.matches(":popover-open")) {
      tip.showPopover();
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
    <div
      ref={itemRef}
      className={["app-nav-item", className].filter(Boolean).join(" ")}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocusCapture={show}
      onBlurCapture={(event) => {
        if (!itemRef.current?.contains(event.relatedTarget as Node | null)) {
          hide();
        }
      }}
    >
      {children}
      {enabled && coords
        ? createPortal(
            <span
              ref={tipRef}
              popover="manual"
              className="ui-tooltip is-open"
              role="tooltip"
              style={{ top: coords.top, left: coords.left }}
            >
              {label}
            </span>,
            document.body,
          )
        : null}
    </div>
  );
}
