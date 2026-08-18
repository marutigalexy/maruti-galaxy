import type { ReactNode } from "react";

type CardProps = {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Card({ title, action, children, className }: CardProps) {
  return (
    <section className={["ui-card", className].filter(Boolean).join(" ")}>
      {title || action ? (
        <div className="ui-card-header">
          {title ? <h2 className="ui-card-title">{title}</h2> : null}
          {action}
        </div>
      ) : null}
      <div className="ui-card-body">{children}</div>
    </section>
  );
}
