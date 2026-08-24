import ExcelJS from "exceljs";

export type XlsxCellValue = string | number | boolean | Date | null | undefined;

export interface XlsxColumn {
  header: string;
  key: string;
  width?: number;
  style?: Partial<ExcelJS.Style>;
}

export interface XlsxSheetOptions {
  name: string;
  columns: XlsxColumn[];
  rows: XlsxCellValue[][];
}

export async function generateXlsx(sheets: XlsxSheetOptions[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Maruti Galaxy";
  workbook.created = new Date();

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name);

    worksheet.columns = sheet.columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width ?? 15,
      style: col.style ? { ...col.style } : undefined,
    }));

    for (const rowData of sheet.rows) {
      const row = worksheet.addRow(rowData);
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const colDef = sheet.columns[colNumber - 1];
        if (colDef?.style) {
          cell.style = { ...cell.style, ...colDef.style };
        }
        if (typeof cell.value === "number" && !colDef?.style?.numFmt) {
          cell.numFmt = "#,##0.00";
        }
      });
    }

    if (sheet.rows.length > 0) {
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF1E3A5F" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });
      worksheet.views = [{ state: "frozen", ySplit: 1 }];
    }
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export function xlsxAttachment(buffer: Buffer, filename: string): Response {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function numberStyle(): Partial<ExcelJS.Style> {
  return { numFmt: "#,##0.00", alignment: { horizontal: "right" } };
}

export function currencyStyle(): Partial<ExcelJS.Style> {
  return { numFmt: '"₹"#,##0.00', alignment: { horizontal: "right" } };
}

export function dateStyle(): Partial<ExcelJS.Style> {
  return { numFmt: "DD/MM/YYYY", alignment: { horizontal: "center" } };
}