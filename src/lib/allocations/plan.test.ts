import { describe, expect, it } from "vitest";

import { planFifoAllocations, planInvoiceAllocation } from "@/lib/allocations/plan";

const INV_A = {
  id: "a",
  invoice_number: "INV-0001",
  invoice_date: "2026-01-01",
  lot_number: "J01",
  outstanding: 100,
};

const INV_B = {
  id: "b",
  invoice_number: "INV-0002",
  invoice_date: "2026-02-01",
  lot_number: "J02",
  outstanding: 50,
};

const INV_C = {
  id: "c",
  invoice_number: "INV-0003",
  invoice_date: "2026-01-01",
  lot_number: "J03",
  outstanding: 25,
};

describe("planInvoiceAllocation", () => {
  it("allocates only up to the current invoice outstanding", () => {
    expect(planInvoiceAllocation(80, 50)).toEqual({ allocated: 50, unallocated: 0 });
    expect(planInvoiceAllocation(80, 100)).toEqual({ allocated: 80, unallocated: 20 });
    expect(planInvoiceAllocation(0, 40)).toEqual({ allocated: 0, unallocated: 40 });
  });
});

describe("planFifoAllocations", () => {
  it("pays the oldest unpaid invoice first and leaves leftover unallocated", () => {
    const preview = planFifoAllocations([INV_B, INV_A, INV_C], 160);

    expect(preview.items.map((item) => item.id)).toEqual(["a", "c", "b"]);
    expect(preview.items.map((item) => item.amount)).toEqual([100, 25, 35]);
    expect(preview.allocated).toBe(160);
    expect(preview.unallocated).toBe(0);
  });

  it("stops when the payment is exhausted and never exceeds an invoice outstanding", () => {
    const preview = planFifoAllocations([INV_A, INV_B], 40);

    expect(preview.items).toEqual([{ ...INV_A, amount: 40 }]);
    expect(preview.allocated).toBe(40);
    expect(preview.unallocated).toBe(0);
  });

  it("keeps leftover unallocated after every invoice is paid", () => {
    const preview = planFifoAllocations([INV_B], 80);

    expect(preview.items).toEqual([{ ...INV_B, amount: 50 }]);
    expect(preview.allocated).toBe(50);
    expect(preview.unallocated).toBe(30);
  });
});
