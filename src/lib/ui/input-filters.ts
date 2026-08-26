/**
 * Input sanitization helpers for form controls to prevent invalid characters
 * and enforce formats on both manual keystrokes and paste events.
 */

/**
 * Keeps only numeric digits (0-9) and limits length to maxLength if specified.
 */
export function digitsOnly(value: string, maxLength?: number): string {
  const digits = value.replace(/\D/g, "");
  return typeof maxLength === "number" ? digits.slice(0, maxLength) : digits;
}

/**
 * Allows only a positive decimal number with up to maxDecimals decimal places.
 */
export function decimalOnly(value: string, maxDecimals: number = 2): string {
  // Strip any characters that are not digits or a decimal point
  let cleaned = value.replace(/[^0-9.]/g, "");
  
  // Allow only the first decimal point
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    cleaned = `${parts[0]}.${parts.slice(1).join("")}`;
  }
  
  // Enforce maximum decimal places if a decimal point exists
  if (cleaned.includes(".")) {
    const [integerPart = "", decimalPart = ""] = cleaned.split(".");
    cleaned = `${integerPart}.${decimalPart.slice(0, maxDecimals)}`;
  }
  
  return cleaned;
}

/**
 * Allows an optional leading minus sign, digits, and up to maxDecimals decimal places.
 */
export function signedDecimalOnly(value: string, maxDecimals: number = 2): string {
  const isNegative = value.startsWith("-");
  let withoutSign = value.replace(/^-/, "").replace(/[^0-9.]/g, "");
  
  const parts = withoutSign.split(".");
  if (parts.length > 2) {
    withoutSign = `${parts[0]}.${parts.slice(1).join("")}`;
  }
  
  if (withoutSign.includes(".")) {
    const [integerPart = "", decimalPart = ""] = withoutSign.split(".");
    withoutSign = `${integerPart}.${decimalPart.slice(0, maxDecimals)}`;
  }
  
  return isNegative ? `-${withoutSign}` : withoutSign;
}

/**
 * Allows only positive integers (1, 2, 3...) - prevents 0 if disallowed, no decimals.
 */
export function integerOnly(value: string, maxLength?: number): string {
  const digits = value.replace(/\D/g, "");
  return typeof maxLength === "number" ? digits.slice(0, maxLength) : digits;
}
