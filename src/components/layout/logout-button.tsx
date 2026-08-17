"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { logoutAction } from "@/app/actions/auth";

export function LogoutButton() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        Log out
      </Button>
      <ConfirmDialog
        open={open}
        title="Confirm Logout"
        description="Sign out of Maruti Galaxy?"
        confirmLabel="Log out"
        pending={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setPending(true);
          void logoutAction();
        }}
      />
    </>
  );
}
