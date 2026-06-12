import type { ReactNode } from "react";
import Link from "next/link";

export function AuthLayout({
  title,
  lead,
  children,
  footer,
}: {
  title: string;
  lead: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="authLayout">
      <div className="authBrandPanel">
        <div>
          <p className="eyebrow eyebrowInline">Analytix platform</p>
          <div className="appBrand" style={{ border: 0, padding: 0, marginBottom: 24 }}>
            <div className="appBrandMark">A</div>
            <span className="appBrandName">Analytix</span>
          </div>
          <h1>Operators choose what to measure.</h1>
          <p>
            Configure collection, review traffic, and ship the SDK — without wiring a full data
            stack first.
          </p>
        </div>
        <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--ax-muted)" }}>
          <Link href="/">Back to home</Link>
        </p>
      </div>

      <div className="authFormPanel">
        <div className="authCard">
          <h2>{title}</h2>
          <p className="authCardLead">{lead}</p>
          {children}
          <div className="authFooter">{footer}</div>
        </div>
      </div>
    </div>
  );
}
