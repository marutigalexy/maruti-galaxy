"use client";

import { Button } from "@/components/ui/button";
import { MenuIcon } from "@/components/layout/nav-icons";
import Link from "next/link";

type TopbarProps = {
  title: string;
  titleIsHeading: boolean;
  backHref?: string;
  onOpenMobile: () => void;
};

export function Topbar({ title, titleIsHeading, backHref, onOpenMobile }: TopbarProps) {
  const TitleTag = titleIsHeading ? "h1" : "p";

  return (
    <header className="app-topbar">
      <Button
        variant="ghost"
        className="app-menu-toggle"
        aria-label="Open navigation"
        onClick={onOpenMobile}
      >
        <MenuIcon />
      </Button>
      {backHref ? (
        <Link href={backHref} className="ui-back-btn">
          Back
        </Link>
      ) : null}
      <TitleTag className={["app-topbar-title", titleIsHeading ? "" : "is-muted"].filter(Boolean).join(" ")}>
        {title}
      </TitleTag>
    </header>
  );
}
