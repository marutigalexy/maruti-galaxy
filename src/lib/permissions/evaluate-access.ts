export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
};

export type AccessDecision =
  | { status: "ok"; user: AppUser }
  | { status: "missing" }
  | { status: "inactive"; user: AppUser }
  | { status: "forbidden"; user: AppUser };

export function evaluateAccess(
  row: {
    id: string;
    name: string;
    email: string;
    role: string;
    is_active: boolean;
  } | null,
): AccessDecision {
  if (!row) {
    return { status: "missing" };
  }

  const user: AppUser = {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    is_active: row.is_active,
  };

  if (!row.is_active) {
    return { status: "inactive", user };
  }

  if (row.role !== "admin") {
    return { status: "forbidden", user };
  }

  return { status: "ok", user };
}
