import { describe, expect, it } from "vitest";

import {
  decimalOnly,
  digitsOnly,
  integerOnly,
  signedDecimalOnly,
} from "@/lib/ui/input-filters";

describe("digitsOnly filter", () => {
  it("keeps only numeric digits", () => {
    expect(digitsOnly("98765-43210")).toBe("9876543210");
    expect(digitsOnly("+91 98765 43210")).toBe("919876543210");
    expect(digitsOnly("abc 123 def")).toBe("123");
  });

  it("truncates at maxLength if specified", () => {
    expect(digitsOnly("98765432109999", 10)).toBe("9876543210");
  });
});

describe("decimalOnly filter", () => {
  it("keeps digits and a single decimal point up to maxDecimals", () => {
    expect(decimalOnly("123.456", 2)).toBe("123.45");
    expect(decimalOnly("123.456", 3)).toBe("123.456");
    expect(decimalOnly("12.3.4.5", 2)).toBe("12.34");
    expect(decimalOnly("$1,234.50", 2)).toBe("1234.50");
  });

  it("handles non-numeric characters gracefully", () => {
    expect(decimalOnly("abc")).toBe("");
    expect(decimalOnly("abc.def")).toBe(".");
  });
});

describe("signedDecimalOnly filter", () => {
  it("preserves leading negative sign and formats decimals", () => {
    expect(signedDecimalOnly("-123.456", 2)).toBe("-123.45");
    expect(signedDecimalOnly("123.456", 2)).toBe("123.45");
    expect(signedDecimalOnly("-12.3.4", 2)).toBe("-12.34");
  });
});

describe("integerOnly filter", () => {
  it("removes non-digits and decimals", () => {
    expect(integerOnly("12.34")).toBe("1234");
    expect(integerOnly("100abc")).toBe("100");
    expect(integerOnly("999999", 3)).toBe("999");
  });
});
