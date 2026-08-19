"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function useQueryPush() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function push(href: string) {
    startTransition(() => {
      router.push(href);
    });
  }

  return { pending, push };
}
