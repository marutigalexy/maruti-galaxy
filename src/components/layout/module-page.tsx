import type { ReactNode } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

type ModulePageProps = {
  title: string;
  description: string;
  emptyTitle: string;
  action?: ReactNode;
};

export function ModulePage({ title, description, emptyTitle, action }: ModulePageProps) {
  return (
    <>
      <PageHeader title={title} description={description} action={action} />
      <EmptyState
        title={emptyTitle}
        description="Records will appear after this module is connected to live data. No placeholder figures are shown."
      />
    </>
  );
}
