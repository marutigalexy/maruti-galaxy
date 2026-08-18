export type AllocatableInvoice = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  lot_number: string;
  outstanding: number;
};

export type AllocationPreviewItem = AllocatableInvoice & {
  amount: number;
};

export type AllocationPreview = {
  items: AllocationPreviewItem[];
  allocated: number;
  unallocated: number;
};

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function planInvoiceAllocation(
  outstanding: number,
  paymentAmount: number,
): { allocated: number; unallocated: number } {
  const outstandingSafe = Math.max(0, roundMoney(outstanding));
  const payment = Math.max(0, roundMoney(paymentAmount));
  const allocated = Math.min(outstandingSafe, payment);
  return {
    allocated,
    unallocated: roundMoney(payment - allocated),
  };
}

export function planFifoAllocations(
  invoices: AllocatableInvoice[],
  paymentAmount: number,
): AllocationPreview {
  const sorted = [...invoices]
    .filter((invoice) => roundMoney(invoice.outstanding) > 0)
    .sort((left, right) => {
      if (left.invoice_date !== right.invoice_date) {
        return left.invoice_date < right.invoice_date ? -1 : 1;
      }
      return left.invoice_number.localeCompare(right.invoice_number);
    });

  let remaining = Math.max(0, roundMoney(paymentAmount));
  const items: AllocationPreviewItem[] = [];

  for (const invoice of sorted) {
    if (remaining <= 0) {
      break;
    }
    const amount = Math.min(roundMoney(invoice.outstanding), remaining);
    if (amount > 0) {
      items.push({ ...invoice, amount });
      remaining = roundMoney(remaining - amount);
    }
  }

  const allocated = roundMoney(items.reduce((sum, item) => sum + item.amount, 0));
  return { items, allocated, unallocated: remaining };
}
