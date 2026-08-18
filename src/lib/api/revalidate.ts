import { revalidatePath } from "next/cache";

export const MutationPaths = {
  auth: ["/", "/dashboard", "/users"],
  users: ["/users"],
  parties: ["/parties", "/jobs", "/dashboard", "/reports"],
  employees: ["/employees", "/jobs", "/dashboard", "/reports"],
  jobs: ["/jobs", "/dashboard", "/employees", "/parties", "/reports"],
  invoices: ["/jobs", "/accounting", "/accounting/entries", "/dashboard", "/reports"],
  accounting: [
    "/accounting",
    "/accounting/entries",
    "/accounting/accounts",
    "/accounting/categories",
    "/jobs",
    "/parties",
    "/employees",
    "/dashboard",
    "/reports",
  ],
  reports: ["/reports", "/dashboard"],
} as const;

export function revalidatePaths(paths: readonly string[]): void {
  for (const path of paths) {
    revalidatePath(path);
  }
}

export function revalidateAuthSession(): void {
  revalidatePath("/", "layout");
  revalidatePaths(MutationPaths.auth);
}
