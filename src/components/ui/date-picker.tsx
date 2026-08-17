import type { InputHTMLAttributes } from "react";

type DatePickerProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function DatePicker({ className, ...props }: DatePickerProps) {
  return (
    <input
      type="date"
      className={["ui-input", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
