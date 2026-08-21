"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";

import { getInvoiceAction } from "@/app/actions/invoices";
import { InvoicePrintView } from "@/components/invoices/invoice-print-view";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { PrintIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import type { InvoiceDetail } from "@/services/invoices/invoices-service";

type InvoicePrintButtonProps = {
  invoiceId: string;
  invoice?: InvoiceDetail;
  variant?: "button" | "icon";
  children?: ReactNode;
};

function waitForImages(root: HTMLElement | null) {
  if (!root) {
    return Promise.resolve();
  }
  const images = Array.from(root.querySelectorAll("img"));
  return Promise.all(
    images.map((image) =>
      image.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
          }),
    ),
  );
}

export function InvoicePrintButton({
  invoiceId,
  invoice,
  variant = "button",
  children = "Print",
}: InvoicePrintButtonProps) {
  const toast = useToast();
  const printRootRef = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();
  // activeDoc is set only while this specific button is printing.
  // It is cleared immediately after window.print() returns so the div
  // is removed from the DOM and cannot bleed into the next print job.
  const [activeDoc, setActiveDoc] = useState<InvoiceDetail | null>(null);

  useEffect(() => {
    if (!activeDoc) {
      return;
    }
    let cancelled = false;
    void waitForImages(printRootRef.current).then(() => {
      if (cancelled) {
        return;
      }
      window.print();
      // Remove the print div immediately after printing so it is not
      // present in the DOM when another invoice's print button is clicked.
      setActiveDoc(null);
    });
    return () => {
      cancelled = true;
    };
  }, [activeDoc]);

  function printNow() {
    startTransition(async () => {
      // If an invoice was pre-passed as a prop, use it directly.
      // Otherwise fetch it fresh. Either way we set it as activeDoc
      // which mounts the print div only for this single print action.
      if (invoice) {
        setActiveDoc(invoice);
        return;
      }
      const outcome = await getInvoiceAction({ id: invoiceId });
      if (!outcome.ok) {
        toast.error(outcome.error.message);
        return;
      }
      setActiveDoc(outcome.data);
    });
  }

  return (
    <>
      {variant === "icon" ? (
        <IconButton tone="print" label="Print invoice" loading={pending} onClick={printNow}>
          <PrintIcon width={16} height={16} />
        </IconButton>
      ) : (
        <Button variant="secondary" loading={pending} onClick={printNow}>
          {children}
        </Button>
      )}
      {/* Only mount the print div while actively printing this invoice.
          This prevents multiple InvoicePrintButton instances on the same
          page from all appearing in the print output simultaneously. */}
      {activeDoc ? (
        <div ref={printRootRef} className="invoice-print-root" aria-hidden="true">
          <InvoicePrintView invoice={activeDoc} />
        </div>
      ) : null}
    </>
  );
}
