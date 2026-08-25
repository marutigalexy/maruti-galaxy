"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useTransition } from "react";

export function useQueryPush() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const latestSeqRef = useRef(0);

  const push = useCallback(
    (href: string) => {
      const seq = ++latestSeqRef.current;
      startTransition(() => {
        if (seq === latestSeqRef.current) {
          router.push(href);
        }
      });
    },
    [router],
  );

  return { pending, push };
}
