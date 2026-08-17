"use server";

import { revalidatePath } from "next/cache";

import { runAction } from "@/lib/api/action";
import { MutationPaths, revalidatePaths } from "@/lib/api/revalidate";
import type { ActionResult } from "@/lib/api/result";
import type { Paginated } from "@/lib/api/pagination";
import { parseOrThrow } from "@/lib/validation";
import {
  createPartySchema,
  listPartiesSchema,
  partyIdSchema,
  setPartyActiveSchema,
  updatePartySchema,
} from "@/lib/validation/parties";
import {
  createParty,
  deleteParty,
  listParties,
  setPartyActive,
  updateParty,
  type PartyRecord,
} from "@/services/parties/parties-service";

function revalidateParties() {
  revalidatePaths(MutationPaths.parties);
  revalidatePath("/parties", "layout");
}

export async function listPartiesAction(
  input: unknown,
): Promise<ActionResult<Paginated<PartyRecord>>> {
  return runAction(async () => {
    const parsed = parseOrThrow(listPartiesSchema, input);
    return listParties(parsed);
  });
}

export async function createPartyAction(input: unknown): Promise<ActionResult<PartyRecord>> {
  return runAction(async () => {
    const parsed = parseOrThrow(createPartySchema, input);
    const party = await createParty(parsed);
    revalidateParties();
    return party;
  });
}

export async function updatePartyAction(input: unknown): Promise<ActionResult<PartyRecord>> {
  return runAction(async () => {
    const parsed = parseOrThrow(updatePartySchema, input);
    const party = await updateParty(parsed);
    revalidateParties();
    return party;
  });
}

export async function setPartyActiveAction(input: unknown): Promise<ActionResult<PartyRecord>> {
  return runAction(async () => {
    const parsed = parseOrThrow(setPartyActiveSchema, input);
    const party = await setPartyActive(parsed);
    revalidateParties();
    return party;
  });
}

export async function deletePartyAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  return runAction(async () => {
    const parsed = parseOrThrow(partyIdSchema, input);
    const result = await deleteParty(parsed.id);
    revalidateParties();
    return result;
  });
}
