export function toCsvRow(values: Array<string | number | null | undefined>): string {
  return values
    .map((value) => {
      const text = value === null || value === undefined ? "" : String(value);
      if (/[",\n\r]/.test(text)) {
        return `"${text.replaceAll('"', '""')}"`;
      }
      return text;
    })
    .join(",");
}

export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  return [toCsvRow(headers), ...rows.map(toCsvRow)].join("\r\n") + "\r\n";
}
