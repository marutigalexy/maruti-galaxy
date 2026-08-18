import { DatePicker } from "@/components/ui/date-picker";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AccountOption } from "@/services/accounts/accounts-service";
import type { CategoryOption } from "@/services/categories/categories-service";

type PaymentEntryFieldsProps = {
  idPrefix: string;
  pending: boolean;
  accounts: AccountOption[];
  categories: CategoryOption[];
  amount: string;
  onAmountChange: (value: string) => void;
};

export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function PaymentEntryFields({
  idPrefix,
  pending,
  accounts,
  categories,
  amount,
  onAmountChange,
}: PaymentEntryFieldsProps) {
  const activeAccounts = accounts.filter((account) => account.is_active);
  const incomeCategories = categories.filter((category) => category.type === "Income" && category.is_active);

  return (
    <>
      <FormField label="Account" htmlFor={`${idPrefix}-account`} required>
        <Select id={`${idPrefix}-account`} name="account_id" required disabled={pending}>
          <option value="">Select account</option>
          {activeAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Category" htmlFor={`${idPrefix}-category`} required>
        <Select id={`${idPrefix}-category`} name="category_id" required disabled={pending}>
          <option value="">Select category</option>
          {incomeCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Entry Date" htmlFor={`${idPrefix}-date`} required>
        <DatePicker
          id={`${idPrefix}-date`}
          name="entry_date"
          required
          defaultValue={todayIso()}
          disabled={pending}
        />
      </FormField>
      <FormField label="Amount" htmlFor={`${idPrefix}-amount`} required>
        <Input
          id={`${idPrefix}-amount`}
          name="amount"
          inputMode="decimal"
          required
          disabled={pending}
          placeholder="e.g. 1000.00"
          value={amount}
          onChange={(event) => onAmountChange(event.target.value)}
        />
      </FormField>
      <FormField label="Remarks" htmlFor={`${idPrefix}-remarks`}>
        <Textarea id={`${idPrefix}-remarks`} name="remarks" disabled={pending} placeholder="Optional note" />
      </FormField>
    </>
  );
}
