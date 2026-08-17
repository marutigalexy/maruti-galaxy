"use server";

import { revalidatePath } from "next/cache";

import { runAction } from "@/lib/api/action";
import { MutationPaths, revalidatePaths } from "@/lib/api/revalidate";
import type { ActionResult } from "@/lib/api/result";
import type { Paginated } from "@/lib/api/pagination";
import { parseOrThrow } from "@/lib/validation";
import {
  accountIdSchema,
  createAccountSchema,
  listAccountsSchema,
  setAccountActiveSchema,
  updateAccountSchema,
} from "@/lib/validation/accounts";
import {
  createAccount,
  deleteAccount,
  listAccounts,
  setAccountActive,
  updateAccount,
  type AccountRecord,
} from "@/services/accounts/accounts-service";

function revalidateAccounts() {
  revalidatePaths(MutationPaths.accounting);
  revalidatePath("/accounting", "layout");
}

export async function listAccountsAction(
  input: unknown,
): Promise<ActionResult<Paginated<AccountRecord>>> {
  return runAction(async () => {
    const parsed = parseOrThrow(listAccountsSchema, input);
    return listAccounts(parsed);
  });
}

export async function createAccountAction(input: unknown): Promise<ActionResult<AccountRecord>> {
  return runAction(async () => {
    const parsed = parseOrThrow(createAccountSchema, input);
    const account = await createAccount(parsed);
    revalidateAccounts();
    return account;
  });
}

export async function updateAccountAction(input: unknown): Promise<ActionResult<AccountRecord>> {
  return runAction(async () => {
    const parsed = parseOrThrow(updateAccountSchema, input);
    const account = await updateAccount(parsed);
    revalidateAccounts();
    return account;
  });
}

export async function setAccountActiveAction(
  input: unknown,
): Promise<ActionResult<AccountRecord>> {
  return runAction(async () => {
    const parsed = parseOrThrow(setAccountActiveSchema, input);
    const account = await setAccountActive(parsed);
    revalidateAccounts();
    return account;
  });
}

export async function deleteAccountAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  return runAction(async () => {
    const parsed = parseOrThrow(accountIdSchema, input);
    const result = await deleteAccount(parsed.id);
    revalidateAccounts();
    return result;
  });
}
