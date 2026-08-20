import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseOrThrow } from "@/lib/validation";
import {
  createAccountSchema,
  updateAccountSchema,
} from "@/lib/validation/accounts";
import {
  createCategorySchema,
  listCategoriesSchema,
  updateCategorySchema,
} from "@/lib/validation/categories";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
} from "@/lib/validation/employees";
import {
  createPartySchema,
  listPartiesSchema,
} from "@/lib/validation/parties";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("party schemas", () => {
  it("requires company name, mobile, and non-negative price", () => {
    expect(() =>
      parseOrThrow(createPartySchema, {
        company_name: "",
        mobile_number: "9876543210",
        price: "10",
      }),
    ).toThrow(/Company Name is required/);

    expect(() =>
      parseOrThrow(createPartySchema, {
        company_name: "Acme",
        mobile_number: "",
        price: "10",
      }),
    ).toThrow(/Mobile Number is required/);

    expect(() =>
      parseOrThrow(createPartySchema, {
        company_name: "Acme",
        mobile_number: "9876543210",
        price: "-1",
      }),
    ).toThrow(/out of range|decimal/i);
  });

  it("strips extra fields and treats empty contact as null", () => {
    const parsed = parseOrThrow(createPartySchema, {
      company_name: " Acme Stones ",
      contact_person_name: "  ",
      mobile_number: "9876543210",
      price: "12.50",
      default_job_id: "should-not-land",
      role: "super-admin",
    });

    expect(parsed.company_name).toBe("Acme Stones");
    expect(parsed.contact_person_name).toBeNull();
    expect(parsed).not.toHaveProperty("default_job_id");
    expect(parsed).not.toHaveProperty("role");
  });

  it("parses list filters and rejects a huge page size", () => {
    expect(parseOrThrow(listPartiesSchema, {})).toMatchObject({
      page: 1,
      pageSize: 30,
      search: "",
      status: "all",
    });
    expect(() => parseOrThrow(listPartiesSchema, { pageSize: 1000 })).toThrow();
  });
});

describe("employee schemas", () => {
  it("requires name, mobile, and non-negative commission", () => {
    expect(() =>
      parseOrThrow(createEmployeeSchema, {
        name: "",
        mobile_number: "9000000000",
        commission: "1.50",
      }),
    ).toThrow(/Name is required/);

    expect(() =>
      parseOrThrow(createEmployeeSchema, {
        name: "Ramesh",
        mobile_number: "9000000000",
        commission: "-0.01",
      }),
    ).toThrow(/out of range|decimal/i);
  });

  it("strips extra fields", () => {
    const parsed = parseOrThrow(updateEmployeeSchema, {
      id: UUID,
      name: "Ramesh",
      mobile_number: "9000000000",
      commission: "2.00",
      earning: "999",
      password_hash: "nope",
    });
    expect(parsed).not.toHaveProperty("earning");
    expect(parsed).not.toHaveProperty("password_hash");
  });
});

describe("account schemas", () => {
  it("requires a unique-name-ready account name and signed opening balance", () => {
    expect(() =>
      parseOrThrow(createAccountSchema, { name: "", opening_balance: "0" }),
    ).toThrow(/Account Name is required/);

    expect(parseOrThrow(createAccountSchema, { name: "Cash", opening_balance: "-10.25" })).toMatchObject({
      name: "Cash",
      opening_balance: "-10.25",
    });

    expect(() =>
      parseOrThrow(createAccountSchema, { name: "Cash", opening_balance: "1.234" }),
    ).toThrow(/decimal/i);
  });

  it("strips extra stored-balance fields", () => {
    const parsed = parseOrThrow(updateAccountSchema, {
      id: UUID,
      name: "Bank",
      opening_balance: "0.00",
      current_balance: "500",
      total_in: "1",
    });
    expect(parsed).not.toHaveProperty("current_balance");
    expect(parsed).not.toHaveProperty("total_in");
  });
});

describe("category schemas", () => {
  it("requires name and Income/Expense type", () => {
    expect(() =>
      parseOrThrow(createCategorySchema, { name: "", type: "Income" }),
    ).toThrow(/Category Name is required/);

    expect(() =>
      parseOrThrow(createCategorySchema, { name: "Sale", type: "Transfer" }),
    ).toThrow();

    expect(parseOrThrow(createCategorySchema, { name: "Sale", type: "Income" }).type).toBe("Income");
  });

  it("filters categories by Income or Expense type", () => {
    expect(parseOrThrow(listCategoriesSchema, { type: "Expense" }).type).toBe("Expense");
    expect(parseOrThrow(listCategoriesSchema, {}).type).toBe("all");
  });

  it("strips extra fields", () => {
    const parsed = parseOrThrow(updateCategorySchema, {
      id: UUID,
      name: "Sale",
      type: "Expense",
      entry_count: 9,
    });
    expect(parsed).not.toHaveProperty("entry_count");
  });
});

describe("master data services", () => {
  const parties = readFileSync(
    path.join(process.cwd(), "src/services/parties/parties-service.ts"),
    "utf8",
  );
  const employees = readFileSync(
    path.join(process.cwd(), "src/services/employees/employees-service.ts"),
    "utf8",
  );
  const accounts = readFileSync(
    path.join(process.cwd(), "src/services/accounts/accounts-service.ts"),
    "utf8",
  );
  const categories = readFileSync(
    path.join(process.cwd(), "src/services/categories/categories-service.ts"),
    "utf8",
  );
  const partyActions = readFileSync(path.join(process.cwd(), "src/app/actions/parties.ts"), "utf8");
  const accountView = readFileSync(
    path.join(process.cwd(), "src/components/accounts/accounts-view.tsx"),
    "utf8",
  );
  const categoryView = readFileSync(
    path.join(process.cwd(), "src/components/categories/categories-view.tsx"),
    "utf8",
  );

  it("re-authorizes inside services and actions", () => {
    expect(parties.match(/await requireActiveAdmin\(\)/g)?.length).toBeGreaterThanOrEqual(6);
    expect(employees.match(/await requireActiveAdmin\(\)/g)?.length).toBeGreaterThanOrEqual(6);
    expect(accounts.match(/await requireActiveAdmin\(\)/g)?.length).toBeGreaterThanOrEqual(6);
    expect(categories.match(/await requireActiveAdmin\(\)/g)?.length).toBeGreaterThanOrEqual(5);
    expect(partyActions).toMatch(/parseOrThrow\(createPartySchema/);
    expect(partyActions).toMatch(/parseOrThrow\(updatePartySchema/);
  });

  it("updates party price on parties only and never writes job_works", () => {
    expect(parties).toMatch(/\.from\("parties"\)/);
    expect(parties).toMatch(/price: asMoneyNumber\(input\.price\)/);
    expect(parties).not.toMatch(/\.from\("job_works"\)\s*\n\s*\.update/);
    expect(parties).not.toMatch(/job_works"\)\.update/);
  });

  it("updates employee commission on employees only and never rewrites work rows", () => {
    expect(employees).toMatch(/commission: asMoneyNumber\(input\.commission\)/);
    expect(employees).not.toMatch(/sub_job_employee_work"\)\.update/);
    expect(employees).toMatch(/v_employee_earnings/);
  });

  it("lists accounts from the derived balance view and enforces R-23", () => {
    expect(accounts).toMatch(/\.from\("v_account_balances"\)/);
    expect(accounts).toMatch(/Opening balance cannot be changed after entries exist/);
    expect(accounts).toMatch(/entry_count > 0/);
    expect(accounts).not.toMatch(/opening_balance: nextOpening,\s*current_balance/);
    expect(accountView).toMatch(/entry_count === 0/);
    expect(accountView).toMatch(/Opening balance cannot be changed after entries exist/);
  });

  it("rejects duplicate category name+type and hides delete when entries exist", () => {
    expect(categories).toMatch(/A category with this name and type already exists/);
    expect(categories).toMatch(/This category type cannot be changed because it has entries/);
    expect(categoryView).toMatch(/entry_count === 0/);
    expect(categoryView).toMatch(/htmlFor="category-type"/);
    expect(categoryView).toMatch(/create-category-status/);
    expect(categories).toMatch(/exportCategoriesCsv/);
    expect(accounts).toMatch(/exportAccountsCsv/);
  });

  it("maps party and employee delete restrict copy", () => {
    expect(parties).toMatch(/This party has jobs and cannot be deleted/);
    expect(employees).toMatch(/This employee has work records and cannot be deleted/);
    expect(accounts).toMatch(/This account has entries and cannot be deleted/);
  });
});
