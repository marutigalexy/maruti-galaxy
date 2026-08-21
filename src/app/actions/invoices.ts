"use server";

import { runAction } from "@/lib/api/action";
import type { Paginated } from "@/lib/api/pagination";
import type { ActionResult } from "@/lib/api/result";
import { parseOrThrow } from "@/lib/validation";
import { createInvoiceSchema, invoiceIdSchema, listInvoicesSchema } from "@/lib/validation/invoices";
import { MutationPaths, revalidatePaths } from "@/lib/api/revalidate";
import {
  getInvoice,
  getInvoiceOutstanding,
  listInvoices,
  createInvoice,
  type InvoiceDetail,
  type InvoiceListRecord,
  type InvoiceOutstanding,
} from "@/services/invoices/invoices-service";

export async function createInvoiceAction(input: unknown): Promise<ActionResult<InvoiceDetail>> {
  return runAction(async () => {
    const parsed = parseOrThrow(createInvoiceSchema, input);
    const invoice = await createInvoice(parsed);
    revalidatePaths(MutationPaths.invoices);
    return invoice;
  });
}

export async function listInvoicesAction(
  input: unknown,
): Promise<ActionResult<Paginated<InvoiceListRecord>>> {
  return runAction(async () => {
    const parsed = parseOrThrow(listInvoicesSchema, input);
    return listInvoices(parsed);
  });
}

export async function getInvoiceAction(input: unknown): Promise<ActionResult<InvoiceDetail>> {
  return runAction(async () => {
    const parsed = parseOrThrow(invoiceIdSchema, input);
    return getInvoice(parsed.id);
  });
}

export async function getInvoiceOutstandingAction(
  input: unknown,
): Promise<ActionResult<InvoiceOutstanding>> {
  return runAction(async () => {
    const parsed = parseOrThrow(invoiceIdSchema, input);
    return getInvoiceOutstanding(parsed.id);
  });
}
