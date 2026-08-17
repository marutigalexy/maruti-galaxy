import { mapToActionError } from "@/lib/api/map-error";
import { fail, ok, type ActionResult } from "@/lib/api/result";

export async function runAction<T>(operation: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return ok(await operation());
  } catch (error) {
    const mapped = mapToActionError(error);
    return fail(mapped.code, mapped.message);
  }
}
