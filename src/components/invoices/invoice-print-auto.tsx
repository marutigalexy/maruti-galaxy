"use client";

import { useEffect } from "react";

export function InvoicePrintAuto() {
  useEffect(() => {
    window.print();
  }, []);

  return null;
}
