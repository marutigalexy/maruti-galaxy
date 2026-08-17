"use server";

import { runAction } from "@/lib/api/action";
import { MutationPaths, revalidatePaths } from "@/lib/api/revalidate";
import type { ActionResult } from "@/lib/api/result";
import type { Paginated } from "@/lib/api/pagination";
import { parseOrThrow } from "@/lib/validation";
import {
  createUserSchema,
  listUsersSchema,
  setUserActiveSchema,
  updateUserPasswordSchema,
  updateUserProfileSchema,
} from "@/lib/validation/users";
import {
  createUser,
  listUsers,
  setUserActive,
  updateUserPassword,
  updateUserProfile,
  type UserRecord,
} from "@/services/users/users-service";

function revalidateUsers() {
  revalidatePaths(MutationPaths.users);
}

export async function listUsersAction(input: unknown): Promise<ActionResult<Paginated<UserRecord>>> {
  return runAction(async () => {
    const parsed = parseOrThrow(listUsersSchema, input);
    return listUsers(parsed);
  });
}

export async function createUserAction(input: unknown): Promise<ActionResult<UserRecord>> {
  return runAction(async () => {
    const parsed = parseOrThrow(createUserSchema, input);
    const user = await createUser(parsed);
    revalidateUsers();
    return user;
  });
}

export async function updateUserProfileAction(input: unknown): Promise<ActionResult<UserRecord>> {
  return runAction(async () => {
    const parsed = parseOrThrow(updateUserProfileSchema, input);
    const user = await updateUserProfile(parsed);
    revalidateUsers();
    return user;
  });
}

export async function updateUserPasswordAction(
  input: unknown,
): Promise<ActionResult<{ ok: true }>> {
  return runAction(async () => {
    const parsed = parseOrThrow(updateUserPasswordSchema, input);
    const result = await updateUserPassword(parsed);
    revalidateUsers();
    return result;
  });
}

export async function setUserActiveAction(input: unknown): Promise<ActionResult<UserRecord>> {
  return runAction(async () => {
    const parsed = parseOrThrow(setUserActiveSchema, input);
    const user = await setUserActive(parsed);
    revalidateUsers();
    return user;
  });
}
