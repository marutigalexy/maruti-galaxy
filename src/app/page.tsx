import { redirect } from "next/navigation";

import { DASHBOARD_PATH } from "@/lib/auth/paths";

export default function HomePage() {
  redirect(DASHBOARD_PATH);
}
