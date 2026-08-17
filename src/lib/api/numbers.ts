export function asMoneyNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const amount = Number(value);
    if (Number.isFinite(amount)) {
      return amount;
    }
  }

  return 0;
}

export function moneyEquals(left: number, right: number): boolean {
  return Math.round(left * 100) === Math.round(right * 100);
}
