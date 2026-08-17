export type StatusTone =
  | "pending"
  | "progress"
  | "completed"
  | "unpaid"
  | "partial"
  | "paid"
  | "active"
  | "inactive"
  | "income"
  | "expense";

const LABELS: Record<StatusTone, string> = {
  pending: "Pending",
  progress: "Progress",
  completed: "Completed",
  unpaid: "Unpaid",
  partial: "Partially Paid",
  paid: "Paid",
  active: "Active",
  inactive: "Inactive",
  income: "Income",
  expense: "Expense",
};

type StatusBadgeProps = {
  tone: StatusTone;
  label?: string;
};

export function StatusBadge({ tone, label }: StatusBadgeProps) {
  const text = label ?? LABELS[tone];

  return (
    <span className={`ui-badge ui-badge-${tone}`}>
      <span className="ui-badge-dot" aria-hidden="true" />
      {text}
    </span>
  );
}
