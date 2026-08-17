"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

type DropdownProps = {
  label: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
};

export function Dropdown({ label, children, align = "right" }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className="ui-dropdown" ref={dropdownRef}>
      <Button 
        variant="secondary" 
        className="ui-dropdown-trigger"
        aria-expanded={open} 
        aria-haspopup="menu" 
        onClick={() => setOpen((value) => !value)}
      >
        {label}
        <svg 
          className={`ui-dropdown-caret ${open ? "is-open" : ""}`}
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </Button>
      {open ? (
        <div 
          className={`ui-dropdown-menu ${align === "left" ? "is-left" : "is-right"}`} 
          role="menu" 
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
