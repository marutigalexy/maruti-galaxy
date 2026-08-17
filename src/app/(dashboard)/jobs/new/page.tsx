import { redirect } from "next/navigation";

import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";

export default async function NewJobPage() {
  await requireActiveAdmin();
  redirect("/jobs");
}
