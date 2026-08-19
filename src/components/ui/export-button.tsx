import type { ReactNode } from "react";

import { DownloadIcon } from "@/components/ui/icons";

type ExportButtonProps = {
  href: string;
  children?: ReactNode;
};

export function ExportButton({ href, children = "Export" }: ExportButtonProps) {
  return (
    <a className="ui-button ui-button-primary ui-export-button" href={href}>
      <DownloadIcon width={16} height={16} aria-hidden="true" />
      {children}
    </a>
  );
}
