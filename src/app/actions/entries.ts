"use server";

import { revalidatePath } from "next/cache";

import { runAction } from "@/lib/api/action";
import { MutationPaths, revalidatePaths } from "@/lib/api/revalidate";
import type { ActionResult } from "@/lib/api/result";
import { parseOrThrow } from "@/lib/validation";
import {
  allocateEntrySchema,
  allocateInvoiceSchema,
  createEmployeePaymentSchema,
  createEntrySchema,
  createInvoicePaymentSchema,
  createPartyPaymentSchema,
  entryIdSchema,
  listEntriesSchema,
  updateEntrySchema,
} from "@/lib/validation/entries";
import {
  allocateEntryToInvoices,
  allocateInvoicesFromEntries,
  createInvoicePayment,
  createPartyPayment,
  listAllocatableIncomeEntries,
  listOutstandingInvoices,
  type AllocatableIncomeEntry,
  type OutstandingInvoiceOption,
} from "@/services/allocations/allocations-service";
import {
  createEntry,
  createEmployeePayment,
  deleteEntry,
  getEntry,
  listEntries,
  updateEntry,
  type EntryDetail,
  type ListedEntries,
} from "@/services/entries/entries-service";
import type { InvoiceDetail } from "@/services/invoices/invoices-service";

function revalidateEntries() {
  revalidatePaths(MutationPaths.accounting);
  revalidatePath("/accounting/entries");
  revalidatePath("/accounting/accounts", "layout");
  revalidatePath("/jobs", "layout");
  revalidatePath("/parties", "layout");
  revalidatePath("/employees", "layout");
}

export async function listEntriesAction(input: unknown): Promise<ActionResult<ListedEntries>> {
  return runAction(async () => {
    const parsed = parseOrThrow(listEntriesSchema, input);
    return listEntries(parsed);
  });
}

export async function getEntryAction(input: unknown): Promise<ActionResult<EntryDetail>> {
  return runAction(async () => {
    const parsed = parseOrThrow(entryIdSchema, input);
    return getEntry(parsed.id);
  });
}

export async function createEntryAction(input: unknown): Promise<ActionResult<EntryDetail>> {
  return runAction(async () => {
    const parsed = parseOrThrow(createEntrySchema, input);
    const entry = await createEntry(parsed);
    revalidateEntries();
    return entry;
  });
}

export async function updateEntryAction(input: unknown): Promise<ActionResult<EntryDetail>> {
  return runAction(async () => {
    const parsed = parseOrThrow(updateEntrySchema, input);
    const entry = await updateEntry(parsed);
    revalidateEntries();
    return entry;
  });
}

export async function deleteEntryAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  return runAction(async () => {
    const parsed = parseOrThrow(entryIdSchema, input);
    const result = await deleteEntry(parsed.id);
    revalidateEntries();
    return result;
  });
}

export async function allocateEntryAction(input: unknown): Promise<ActionResult<EntryDetail>> {
  return runAction(async () => {
    const parsed = parseOrThrow(allocateEntrySchema, input);
    const entry = await allocateEntryToInvoices(parsed);
    revalidateEntries();
    return entry;
  });
}

export async function allocateInvoiceAction(input: unknown): Promise<ActionResult<InvoiceDetail>> {
  return runAction(async () => {
    const parsed = parseOrThrow(allocateInvoiceSchema, input);
    const invoice = await allocateInvoicesFromEntries(parsed);
    revalidateEntries();
    return invoice;
  });
}

export async function listOutstandingInvoicesAction(): Promise<
  ActionResult<OutstandingInvoiceOption[]>
> {
  return runAction(async () => listOutstandingInvoices());
}

export async function listAllocatableIncomeEntriesAction(): Promise<
  ActionResult<AllocatableIncomeEntry[]>
> {
  return runAction(async () => listAllocatableIncomeEntries());
}

export async function createInvoicePaymentAction(input: unknown): Promise<ActionResult<EntryDetail>> {
  return runAction(async () => {
    const parsed = parseOrThrow(createInvoicePaymentSchema, input);
    const entry = await createInvoicePayment(parsed);
    revalidateEntries();
    return entry;
  });
}

export async function createPartyPaymentAction(input: unknown): Promise<ActionResult<EntryDetail>> {
  return runAction(async () => {
    const parsed = parseOrThrow(createPartyPaymentSchema, input);
    const entry = await createPartyPayment(parsed);
    revalidateEntries();
    return entry;
  });
}

export async function createEmployeePaymentAction(input: unknown): Promise<ActionResult<EntryDetail>> {
  return runAction(async () => {
    const parsed = parseOrThrow(createEmployeePaymentSchema, input);
    const entry = await createEmployeePayment(parsed);
    revalidateEntries();
    return entry;
  });
}
