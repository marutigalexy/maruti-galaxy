"use client";

import Link from "next/link";

import { MenuIcon } from "@/components/layout/nav-icons";
import { useSetActionsSlot, useSetStatusSlot } from "@/components/layout/page-chrome";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "@/components/ui/icons";

type TopbarProps = {
  title: string;
  description?: string;
  titleIsHeading: boolean;
  backHref?: string;
  onOpenMobile: () => void;
};

export function Topbar({ title, description, titleIsHeading, backHref, onOpenMobile }: TopbarProps) {
  const TitleTag = titleIsHeading ? "h1" : "p";
  const setActionsSlot = useSetActionsSlot();
  const setStatusSlot = useSetStatusSlot();

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
        <Link href={backHref} className="ui-back-btn" aria-label="Back" title="Back">
          <ArrowLeftIcon width={20} height={20} />
        </Link>
      ) : null}
      <div className="app-topbar-heading">
        <div className="app-topbar-copy">
          <TitleTag className={["app-topbar-title", titleIsHeading ? "" : "is-muted"].filter(Boolean).join(" ")}>
            {title}
          </TitleTag>
          {description ? <p className="app-topbar-description">{description}</p> : null}
        </div>
        <div className="app-topbar-status" ref={setStatusSlot} />
      </div>
      <div className="app-topbar-actions" ref={setActionsSlot} />
    </header>
  );
}
