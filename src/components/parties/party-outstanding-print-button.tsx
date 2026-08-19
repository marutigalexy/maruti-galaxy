"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { PartyOutstandingPrintView } from "@/components/parties/party-outstanding-print-view";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { PrintIcon } from "@/components/ui/icons";
import type { PartyInvoiceRow, PartyRecord } from "@/services/parties/parties-service";

type PartyOutstandingPrintButtonProps = {
  party: PartyRecord;
  invoices: PartyInvoiceRow[];
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

export function PartyOutstandingPrintButton({
  party,
  invoices,
  variant = "icon",
  children = "Print",
}: PartyOutstandingPrintButtonProps) {
  const printRootRef = useRef<HTMLDivElement>(null);
  const [shouldPrint, setShouldPrint] = useState(false);

  useEffect(() => {
    if (!shouldPrint) {
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
  }, [shouldPrint]);

  return (
    <>
      {variant === "icon" ? (
        <IconButton
          tone="print"
          label="Print party invoice"
          loading={shouldPrint}
          onClick={() => setShouldPrint(true)}
        >
          <PrintIcon width={16} height={16} />
        </IconButton>
      ) : (
        <Button variant="secondary" loading={shouldPrint} onClick={() => setShouldPrint(true)}>
          {children}
        </Button>
      )}
      <div ref={printRootRef} className="invoice-print-root" aria-hidden="true">
        <PartyOutstandingPrintView party={party} invoices={invoices} />
      </div>
    </>
  );
}
