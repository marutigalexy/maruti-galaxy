import { exportErrorResponse, searchParamRecord } from "@/lib/api/csv-response";
import { xlsxAttachment } from "@/lib/api/xlsx";
import { AppError } from "@/lib/api/result";
import { requireActiveAdmin } from "@/lib/permissions/require-active-admin";
import { parseOrThrow } from "@/lib/validation";
import { listEntriesSchema } from "@/lib/validation/entries";
import { listInvoicesSchema } from "@/lib/validation/invoices";
import { listAccountsSchema } from "@/lib/validation/accounts";
import { listCategoriesSchema } from "@/lib/validation/categories";
import {
  jobWorkReportSchema,
  outstandingPartiesSchema,
  profitLossSchema,
  salaryReportSchema,
} from "@/lib/validation/reports";
import { exportAccountsXlsx } from "@/services/accounts/accounts-service";
import { exportCategoriesXlsx } from "@/services/categories/categories-service";
import { exportEntriesXlsx } from "@/services/entries/entries-service";
import {
  exportJobWorkReportXlsx,
  exportOutstandingReportXlsx,
  exportPartyOutstandingReportXlsx,
  exportProfitLossReportXlsx,
  exportSalaryReportXlsx,
} from "@/services/reports/reports-service";

export const dynamic = "force-dynamic";

const REPORT_SLUGS = ["entries", "jobs", "outstanding", "outstanding-parties", "salary", "profit-loss", "accounts", "categories"] as const;
type ReportSlug = (typeof REPORT_SLUGS)[number];

function isReportSlug(value: string): value is ReportSlug {
  return REPORT_SLUGS.includes(value as ReportSlug);
}

type ExportRouteProps = {
  params: Promise<{ report: string }>;
};

export async function GET(request: Request, { params }: ExportRouteProps) {
  try {
    await requireActiveAdmin();
    const { report } = await params;
    if (!isReportSlug(report)) {
      throw new AppError("NOT_FOUND", "That report export is not available.");
    }

    const url = new URL(request.url);
    const query = searchParamRecord(url);

    if (report === "entries") {
      const parsed = parseOrThrow(listEntriesSchema, {
        search: query.search ?? "",
        entry_type: query.entry_type ?? "all",
        account_id: query.account_id,
        category_id: query.category_id,
        party_id: query.party_id,
        employee_id: query.employee_id,
        date_from: query.date_from,
        date_to: query.date_to,
        page: "1",
        pageSize: "20",
      });
      const { buffer } = await exportEntriesXlsx(parsed);
      return xlsxAttachment(buffer, "maruti-galaxy-entries.xlsx");
    }

    if (report === "jobs") {
      const parsed = parseOrThrow(jobWorkReportSchema, {
        search: query.search ?? "",
        status: query.status ?? "all",
        job_type: query.job_type ?? "all",
        party_id: query.party_id,
        date_from: query.date_from,
        date_to: query.date_to,
        page: "1",
        pageSize: "20",
      });
      const { buffer } = await exportJobWorkReportXlsx(parsed);
      return xlsxAttachment(buffer, "maruti-galaxy-job-work-report.xlsx");
    }

    if (report === "outstanding") {
      const parsed = parseOrThrow(listInvoicesSchema, {
        search: query.search ?? "",
        status: query.status ?? "all",
        party_id: query.party_id,
        date_from: query.date_from,
        date_to: query.date_to,
        page: "1",
        pageSize: "20",
      });
      const { buffer } = await exportOutstandingReportXlsx(parsed);
      return xlsxAttachment(buffer, "maruti-galaxy-outstanding-report.xlsx");
    }

    if (report === "outstanding-parties") {
      const parsed = parseOrThrow(outstandingPartiesSchema, {
        search: query.search ?? "",
        status: query.status ?? "all",
        page: "1",
        pageSize: "20",
      });
      const { buffer } = await exportPartyOutstandingReportXlsx(parsed);
      return xlsxAttachment(buffer, "maruti-galaxy-outstanding-parties-report.xlsx");
    }

    if (report === "salary") {
      const parsed = parseOrThrow(salaryReportSchema, {
        employee_id: query.employee_id,
        date_from: query.date_from,
        date_to: query.date_to,
        page: "1",
        pageSize: "20",
      });
      const { buffer } = await exportSalaryReportXlsx(parsed);
      return xlsxAttachment(buffer, "maruti-galaxy-salary-report.xlsx");
    }

    if (report === "accounts") {
      const parsed = parseOrThrow(listAccountsSchema, {
        search: query.search ?? "",
        status: query.status ?? "all",
        page: "1",
        pageSize: "20",
      });
      const { buffer } = await exportAccountsXlsx(parsed);
      return xlsxAttachment(buffer, "maruti-galaxy-accounts.xlsx");
    }

    if (report === "categories") {
      const parsed = parseOrThrow(listCategoriesSchema, {
        search: query.search ?? "",
        status: query.status ?? "all",
        type: query.type ?? "all",
        page: "1",
        pageSize: "20",
      });
      const { buffer } = await exportCategoriesXlsx(parsed);
      return xlsxAttachment(buffer, "maruti-galaxy-categories.xlsx");
    }

    const parsed = parseOrThrow(profitLossSchema, {
      date_from: query.date_from,
      date_to: query.date_to,
    });
    const { buffer } = await exportProfitLossReportXlsx(parsed);
    return xlsxAttachment(buffer, "maruti-galaxy-profit-loss-report.xlsx");
  } catch (error) {
    return exportErrorResponse(error, "Unable to export report.");
  }
}
