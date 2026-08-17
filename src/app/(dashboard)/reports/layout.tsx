import type { ReactNode } from "react";

import { ModuleTabs } from "@/components/layout/module-tabs";

export default function ReportsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="ui-module-stack">
      <ModuleTabs moduleHref="/reports" />
      {children}
    </div>
  );
}
