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

export function formatSignedInr(type: "Income" | "Expense", amount: string | number): string {
  const value = typeof amount === "number" ? amount : Number(amount);
  const formatted = formatInr(Number.isFinite(value) ? Math.abs(value) : 0);
  return type === "Expense" ? `−${formatted}` : `+${formatted}`;
}

export function signedAmountType(amount: string | number): "Income" | "Expense" {
  const value = typeof amount === "number" ? amount : Number(amount);
  return Number.isFinite(value) && value < 0 ? "Expense" : "Income";
}

export function formatThan(value: string | number): string {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) {
    return "0";
  }

  return String(amount);
}

export function formatWeightCt(value: string | number): string {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) {
    return "0.00 ct";
  }
  return `${amount.toFixed(2)} ct`;
}

export function formatMonthYear(yearMonth: string): string {
  const date = new Date(`${yearMonth}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return yearMonth;
  }

  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(date);
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
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatBillDate(value: string | Date): string {
  const date =
    value instanceof Date
      ? value
      : value.includes("T")
        ? new Date(value)
        : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

export function formatBillNumber(value: string | number, fractionDigits = 2): string {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) {
    return "0";
  }

  const scaled = Math.round(Math.abs(amount) * 10 ** fractionDigits);
  const hasFraction = scaled % 10 ** fractionDigits !== 0;

  return new Intl.NumberFormat("en-IN", {
    useGrouping: false,
    minimumFractionDigits: hasFraction ? fractionDigits : 0,
    maximumFractionDigits: hasFraction ? fractionDigits : 0,
  }).format(amount);
}

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigitWords(value: number): string {
  if (value < 20) {
    return ONES[value] ?? "";
  }
  const ten = TENS[Math.floor(value / 10)] ?? "";
  const one = ONES[value % 10] ?? "";
  return one ? `${ten} ${one}` : ten;
}

function threeDigitWords(value: number): string {
  const hundred = Math.floor(value / 100);
  const rest = value % 100;
  if (hundred === 0) {
    return twoDigitWords(rest);
  }
  const head = `${ONES[hundred]} Hundred`;
  return rest ? `${head} ${twoDigitWords(rest)}` : head;
}

function toIndianWords(value: number): string {
  if (value === 0) {
    return "Zero";
  }

  const crore = Math.floor(value / 10_000_000);
  const lakh = Math.floor((value % 10_000_000) / 100_000);
  const thousand = Math.floor((value % 100_000) / 1000);
  const rest = value % 1000;
  const parts: string[] = [];

  if (crore) {
    parts.push(`${toIndianWords(crore)} Crore`);
  }
  if (lakh) {
    parts.push(`${twoDigitWords(lakh)} Lakh`);
  }
  if (thousand) {
    parts.push(`${twoDigitWords(thousand)} Thousand`);
  }
  if (rest) {
    parts.push(threeDigitWords(rest));
  }

  return parts.join(" ");
}

export function formatInrWords(amount: string | number): string {
  const value = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(value)) {
    return "Rupees Zero Only";
  }

  const rounded = Math.round(Math.abs(value) * 100) / 100;
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);
  const rupeeWords = toIndianWords(rupees);

  if (paise === 0) {
    return `Rupees ${rupeeWords} Only`;
  }

  return `Rupees ${rupeeWords} and ${toIndianWords(paise)} Paise Only`;
}
