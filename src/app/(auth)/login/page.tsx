import { redirect } from "next/navigation";

import { LOGIN_PATH } from "@/lib/auth/paths";

export default function LoginAliasPage() {
  redirect(LOGIN_PATH);
}
