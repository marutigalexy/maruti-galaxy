export function formatInr(amount: string | number): string {
  const value = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(value)) {
    return "₹0.00";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatThan(value: string | number): string {
  return `${value} Than`;
}

export function formatWeightCt(value: string | number): string {
  const amount = typeof value === "number" ? value.toFixed(3) : value;
  return `${amount} ct`;
}

export function formatDisplayDate(value: string | Date): string {
  const date =
    value instanceof Date
      ? value
      : value.includes("T")
        ? new Date(value)
        : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
