import { formatWeightCt } from "@/lib/formatters";

export function WeightCt({ value }: { value: string | number }) {
  const [amount, unit] = formatWeightCt(value).split(" ");
  return (
    <>
      {amount} <strong>{unit}</strong>
    </>
  );
}
