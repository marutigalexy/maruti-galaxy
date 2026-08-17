export function postgresCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  if ("code" in error && typeof error.code === "string") {
    return error.code;
  }

  return undefined;
}

export function postgresText(error: unknown): string {
  if (typeof error !== "object" || error === null) {
    return error instanceof Error ? error.message : "";
  }

  const record = error as Record<string, unknown>;
  const parts: string[] = [];
  for (const key of ["message", "details", "hint"]) {
    const value = record[key];
    if (typeof value === "string") {
      parts.push(value);
    }
  }

  return parts.join(" ");
}

export function isUniqueViolation(error: unknown): boolean {
  return postgresCode(error) === "23505";
}

export function isRestrictViolation(error: unknown): boolean {
  return postgresCode(error) === "23503";
}

export function mentionsConstraint(error: unknown, ...needles: string[]): boolean {
  const text = postgresText(error).toLowerCase();
  return needles.some((needle) => text.includes(needle.toLowerCase()));
}
