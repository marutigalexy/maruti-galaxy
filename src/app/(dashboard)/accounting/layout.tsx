import type { ReactNode } from "react";

import { ModuleTabs } from "@/components/layout/module-tabs";

export default function AccountingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="ui-module-stack">
      <ModuleTabs moduleHref="/accounting" />
      {children}
    </div>
  );
}
