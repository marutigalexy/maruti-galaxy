const COLUMN_NAME = /^[a-z_][a-z0-9_]*$/i;

type Join<T extends readonly string[]> = T extends readonly [
  infer Head extends string,
  ...infer Tail extends string[],
]
  ? Tail extends readonly []
    ? Head
    : Tail extends readonly string[]
      ? `${Head}, ${Join<Tail>}`
      : Head
  : never;

export function selectColumns<const T extends readonly string[]>(columns: T): Join<T> {
  if (columns.length === 0) {
    throw new Error("At least one column is required.");
  }

  for (const column of columns) {
    if (column.includes("*") || !COLUMN_NAME.test(column)) {
      throw new Error("SELECT * is not allowed.");
    }
  }

  return columns.join(", ") as Join<T>;
}
