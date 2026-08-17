import type { ReactNode } from "react";

type CanProps = {
  children: ReactNode;
};

/** v1 pass-through. Structure is ready for future non-admin roles. */
export function Can({ children }: CanProps) {
  return children;
}
