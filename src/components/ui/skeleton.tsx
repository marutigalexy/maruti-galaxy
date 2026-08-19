type SkeletonProps = {
  lines?: number;
};

export function Skeleton({ lines = 3 }: SkeletonProps) {
  return (
    <div className="ui-skeleton" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      {Array.from({ length: lines }, (_, index) => (
        <div key={index} className="ui-skeleton-line" />
      ))}
    </div>
  );
}

export function SkeletonLine({ className }: { className?: string }) {
  return <div className={["ui-skeleton-line", className].filter(Boolean).join(" ")} />;
}

type TableSkeletonColumn = {
  key: string;
  header?: string;
  numeric?: boolean;
  align?: "center";
};

type TableSkeletonProps = {
  caption?: string;
  columns?: TableSkeletonColumn[];
  columnCount?: number;
  rows?: number;
  framed?: boolean;
};

function tableColumnClass(column: TableSkeletonColumn) {
  if (column.numeric) {
    return "is-numeric";
  }
  if (column.align === "center" || column.key === "status") {
    return "is-center";
  }
  return undefined;
}

export function TableSkeleton({
  caption = "Loading records",
  columns,
  columnCount = 6,
  rows = 8,
  framed = true,
}: TableSkeletonProps) {
  const cols: TableSkeletonColumn[] =
    columns && columns.length > 0
      ? columns
      : Array.from({ length: columnCount }, (_, index) => ({ key: `col-${index}` }));

  const table = (
      <table className="ui-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {cols.map((column) => (
              <th key={column.key} scope="col" className={tableColumnClass(column)}>
                {column.header ?? <SkeletonLine />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, rowIndex) => (
            <tr key={rowIndex}>
              {cols.map((column) => (
                <td key={column.key} className={tableColumnClass(column)}>
                  <SkeletonLine />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
  );

  if (!framed) {
    return table;
  }

  return (
    <div className="ui-table-wrap" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      {table}
    </div>
  );
}

export function KpiGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="ui-kpi-grid" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      {Array.from({ length: count }, (_, index) => (
        <article key={index} className="ui-kpi-card is-skeleton">
          <SkeletonLine className="ui-skeleton-kpi-label" />
          <SkeletonLine className="ui-skeleton-kpi-value" />
          <SkeletonLine className="ui-skeleton-kpi-help" />
        </article>
      ))}
    </div>
  );
}

export function SummaryGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <dl className="ui-summary-grid" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="ui-detail-item">
          <dt>
            <SkeletonLine className="ui-skeleton-label" />
          </dt>
          <dd>
            <SkeletonLine className="ui-skeleton-kpi-value" />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function FilterBarSkeleton({ controls = 4 }: { controls?: number }) {
  return (
    <div className="ui-list-toolbar" aria-hidden="true">
      <div className="ui-filter-bar">
        {Array.from({ length: controls }, (_, index) => (
          <div key={index} className="ui-field">
            <SkeletonLine className="ui-skeleton-label" />
            <SkeletonLine className="ui-skeleton-control" />
          </div>
        ))}
      </div>
      <div className="ui-list-toolbar-action">
        <SkeletonLine className="ui-skeleton-control ui-skeleton-button" />
      </div>
    </div>
  );
}

export function ListPageSkeleton({
  columns = 7,
  rows = 8,
  filters = 4,
}: {
  columns?: number;
  rows?: number;
  filters?: number;
}) {
  return (
    <div className="ui-page-loading" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading page</span>
      <FilterBarSkeleton controls={filters} />
      <TableSkeleton columnCount={columns} rows={rows} />
    </div>
  );
}

export function ReportPageSkeleton({ kpis = false }: { kpis?: boolean }) {
  return (
    <div className="ui-page-loading" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading report</span>
      <FilterBarSkeleton controls={5} />
      {kpis ? (
        <section className="ui-section" aria-hidden="true">
          <KpiGridSkeleton count={4} />
        </section>
      ) : null}
      <TableSkeleton columnCount={8} rows={8} />
    </div>
  );
}

export function DashboardPageSkeleton() {
  return (
    <div className="ui-page-loading" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading dashboard</span>
      <section className="ui-section" aria-hidden="true">
        <KpiGridSkeleton count={4} />
      </section>
      <section className="ui-section" aria-hidden="true">
        <SkeletonLine className="ui-skeleton-title" />
        <KpiGridSkeleton count={5} />
      </section>
      <section className="ui-section" aria-hidden="true">
        <SkeletonLine className="ui-skeleton-title" />
        <TableSkeleton columnCount={2} rows={4} />
      </section>
      <div className="ui-panel-grid" aria-hidden="true">
        <section className="ui-section">
          <SkeletonLine className="ui-skeleton-title" />
          <TableSkeleton columnCount={4} rows={5} />
        </section>
        <section className="ui-section">
          <SkeletonLine className="ui-skeleton-title" />
          <TableSkeleton columnCount={4} rows={5} />
        </section>
      </div>
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="ui-page-loading ui-detail-stack" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading details</span>
      <section className="ui-section" aria-hidden="true">
        <KpiGridSkeleton count={4} />
      </section>
      <section className="ui-card" aria-hidden="true">
        <div className="ui-card-header">
          <SkeletonLine className="ui-skeleton-title" />
        </div>
        <div className="ui-card-body">
          <div className="ui-detail-grid">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="ui-detail-item">
                <SkeletonLine className="ui-skeleton-label" />
                <SkeletonLine />
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="ui-card" aria-hidden="true">
        <div className="ui-card-header">
          <SkeletonLine className="ui-skeleton-title" />
        </div>
        <div className="ui-card-body">
          <TableSkeleton columnCount={5} rows={5} />
        </div>
      </section>
    </div>
  );
}

export function FormPageSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="ui-page-loading ui-card" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading form</span>
      <div className="ui-card-body">
        <div className="ui-dialog-form" aria-hidden="true">
          {Array.from({ length: fields }, (_, index) => (
            <div key={index} className="ui-field">
              <SkeletonLine className="ui-skeleton-label" />
              <SkeletonLine className="ui-skeleton-control" />
            </div>
          ))}
          <div className="ui-dialog-actions">
            <SkeletonLine className="ui-skeleton-control ui-skeleton-button" />
            <SkeletonLine className="ui-skeleton-control ui-skeleton-button" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthPageSkeleton() {
  return (
    <div className="ui-page-loading ui-auth-loading" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading sign in</span>
      <div className="ui-field" aria-hidden="true">
        <SkeletonLine className="ui-skeleton-label" />
        <SkeletonLine className="ui-skeleton-control" />
      </div>
      <div className="ui-field" aria-hidden="true">
        <SkeletonLine className="ui-skeleton-label" />
        <SkeletonLine className="ui-skeleton-control" />
      </div>
      <SkeletonLine className="ui-skeleton-control ui-skeleton-button" />
    </div>
  );
}
