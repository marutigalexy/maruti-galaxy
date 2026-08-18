"use client";

import { useEffect, useId, useRef } from "react";

import { CloseIcon } from "@/components/layout/nav-icons";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  pending?: boolean;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  pending = false,
  danger = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
      cancelRef.current?.focus();
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
        if (!pending) {
          onCancel();
        }
      }}
    >
      <div className="ui-dialog-header">
        <h2 id={titleId}>{title}</h2>
        <Button
          variant="ghost"
          className="ui-dialog-close"
          aria-label="Close"
          title="Close"
          disabled={pending}
          onClick={onCancel}
        >
          <CloseIcon />
        </Button>
      </div>
      <p className="ui-dialog-body">{description}</p>
      <div className="ui-dialog-actions">
        <Button ref={cancelRef} variant="secondary" disabled={pending} onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button
          variant={danger ? "danger" : "primary"}
          disabled={pending}
          onClick={onConfirm}
        >
          {pending ? "Working…" : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
