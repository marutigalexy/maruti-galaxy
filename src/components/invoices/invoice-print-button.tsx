"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";

import { getInvoiceAction } from "@/app/actions/invoices";
import { InvoicePrintView } from "@/components/invoices/invoice-print-view";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { PrintIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { downloadInvoicePdf } from "@/lib/invoices/pdf-download";
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
  children = "Download PDF",
}: InvoicePrintButtonProps) {
  const toast = useToast();
  const printRootRef = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();
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
      setActiveDoc(null);
    });
    return () => {
      cancelled = true;
    };
  }, [activeDoc]);

  function handleAction() {
    startTransition(async () => {
      let doc = invoice;
      if (!doc) {
        const outcome = await getInvoiceAction({ id: invoiceId });
        if (!outcome.ok) {
          toast.error(outcome.error.message);
          return;
        }
        doc = outcome.data;
      }

      try {
        await downloadInvoicePdf(doc);
        toast.success(`Invoice PDF downloaded.`);
      } catch (err) {
        console.error("PDF download failed, falling back to print dialog:", err);
        setActiveDoc(doc);
      }
    });
  }

  return (
    <>
      {variant === "icon" ? (
        <IconButton tone="print" label="Download invoice PDF" loading={pending} onClick={handleAction}>
          <PrintIcon width={16} height={16} />
        </IconButton>
      ) : (
        <Button variant="secondary" loading={pending} onClick={handleAction}>
          {children}
        </Button>
      )}
      {activeDoc ? (
        <div ref={printRootRef} className="invoice-print-root" aria-hidden="true">
          <InvoicePrintView invoice={activeDoc} />
        </div>
      ) : null}
    </>
  );
}

