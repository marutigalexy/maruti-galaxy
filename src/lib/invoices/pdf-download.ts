import { createElement } from "react";
import { createRoot } from "react-dom/client";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import { InvoicePrintView } from "@/components/invoices/invoice-print-view";
import type { InvoiceDetail } from "@/services/invoices/invoices-service";

/**
 * Generates the standardized invoice filename:
 * "Company Name - Invoice Number.pdf"
 * Example: "ABC Jewellers - INV-1025.pdf"
 */
export function getInvoicePdfFileName(partyName?: string, invoiceNumber?: string): string {
  const cleanParty = (partyName?.trim() || "Party").replace(/[/\\:*?"<>|]/g, "-").trim();
  const cleanInvoiceNo = (invoiceNumber?.trim() || "Invoice").replace(/[/\\:*?"<>|]/g, "-").trim();
  return `${cleanParty} - ${cleanInvoiceNo}.pdf`;
}

function waitForImages(root: HTMLElement | null): Promise<void> {
  if (!root) {
    return Promise.resolve();
  }
  const images = Array.from(root.querySelectorAll("img"));
  return Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
          } else {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
          }
        }),
    ),
  ).then(() => undefined);
}

/**
 * Renders the invoice into an off-screen A4 container, captures it at high resolution,
 * generates an A4 PDF, and triggers Chrome's native browser download manager
 * using the standard format: "Company Name - Invoice Number.pdf".
 */
export async function downloadInvoicePdf(invoice: InvoiceDetail): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  // Create an off-screen staging wrapper sized exactly to standard A4 (210mm x 297mm)
  const container = document.createElement("div");
  container.className = "invoice-pdf-render-staging";
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = "210mm";
  container.style.minHeight = "297mm";
  container.style.backgroundColor = "#ffffff";
  container.style.zIndex = "-9999";
  container.style.pointerEvents = "none";
  container.style.opacity = "1";
  container.style.visibility = "visible";
  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    // Mount the component
    await new Promise<void>((resolve) => {
      root.render(
        createElement(
          "div",
          { style: { width: "210mm", minHeight: "297mm", backgroundColor: "#ffffff", color: "#000000" } },
          createElement(InvoicePrintView, { invoice }),
        ),
      );
      // Allow React to commit the DOM
      setTimeout(resolve, 150);
    });

    await waitForImages(container);
    // Allow browser layout and typography to settle
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const renderTarget = (container.firstElementChild as HTMLElement) || container;

    const canvas = await html2canvas(renderTarget, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 1024,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    // Standard A4 dimensions: 210mm width x 297mm height
    pdf.addImage(imgData, "PNG", 0, 0, 210, 297, undefined, "FAST");

    const fileName = getInvoicePdfFileName(invoice.party_name, invoice.invoice_number);
    pdf.save(fileName);
  } finally {
    setTimeout(() => {
      try {
        root.unmount();
        container.remove();
      } catch {
        // ignore unmount errors on cleanup
      }
    }, 1000);
  }
}
