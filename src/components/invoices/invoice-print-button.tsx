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
  const [fetchedDoc, setFetchedDoc] = useState<InvoiceDetail | null>(null);
  const [shouldPrint, setShouldPrint] = useState(false);
  const printDoc = invoice ?? fetchedDoc;

  useEffect(() => {
    if (!shouldPrint || !printDoc) {
      return;
    }
    let cancelled = false;
    void waitForImages(printRootRef.current).then(() => {
      if (cancelled) {
        return;
      }
      window.print();
      setShouldPrint(false);
    });
    return () => {
      cancelled = true;
    };
  }, [shouldPrint, printDoc]);

  function printNow() {
    startTransition(async () => {
      if (printDoc) {
        setShouldPrint(true);
        return;
      }
      const outcome = await getInvoiceAction({ id: invoiceId });
      if (!outcome.ok) {
        toast.error(outcome.error.message);
        return;
      }
      setFetchedDoc(outcome.data);
      setShouldPrint(true);
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
      {printDoc ? (
        <div ref={printRootRef} className="invoice-print-root" aria-hidden="true">
          <InvoicePrintView invoice={printDoc} />
        </div>
      ) : null}
    </>
  );
}
