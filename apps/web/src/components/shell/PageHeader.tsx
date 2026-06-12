import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="pageHeader">
      <div>
        <h1 className="pageTitle">{title}</h1>
        {subtitle ? <p className="pageSubtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="pageActions">{actions}</div> : null}
    </header>
  );
}
