"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import { CloseIcon } from "@/components/layout/nav-icons";
import { Button } from "@/components/ui/button";

type DialogProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  disableClose?: boolean;
  footer?: ReactNode;
};

export function Dialog({
  open,
  title,
  children,
  onClose,
  disableClose = false,
  footer,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
      const focusTarget = dialog.querySelector<HTMLElement>(
        "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]):not(.ui-dialog-close)",
      );
      focusTarget?.focus();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="ui-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!disableClose) {
          onClose();
        }
      }}
    >
      <div className="ui-dialog-header">
        <h2 id={titleId}>{title}</h2>
        <Button
          variant="ghost"
          className="ui-dialog-close"
          aria-label="Close"
          disabled={disableClose}
          onClick={onClose}
        >
          <CloseIcon />
        </Button>
      </div>
      {children}
      {footer !== undefined ? (
        footer
      ) : (
        <div className="ui-dialog-actions">
          <Button variant="secondary" onClick={onClose} disabled={disableClose}>
            Close
          </Button>
        </div>
      )}
    </dialog>
  );
}
