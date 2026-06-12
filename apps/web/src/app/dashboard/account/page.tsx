import Link from "next/link";
import { PageHeader } from "@/components/shell/PageHeader";
import { requireAccountSession } from "@/lib/auth";

export default async function AccountPage() {
  const account = await requireAccountSession();

  return (
    <>
      <PageHeader title="Account" subtitle="Session and workspace identity" />

      <div className="card stack">
        <div>
          <span className="fieldLabel">Email</span>
          <p style={{ margin: "6px 0 0", fontSize: "1rem", color: "var(--ax-ink)" }}>
            {account.email}
          </p>
        </div>
        {account.name ? (
          <div>
            <span className="fieldLabel">Name</span>
            <p style={{ margin: "6px 0 0", fontSize: "1rem", color: "var(--ax-ink)" }}>
              {account.name}
            </p>
          </div>
        ) : null}
        <div>
          <span className="fieldLabel">Member since</span>
          <p style={{ margin: "6px 0 0", fontSize: "0.9375rem", color: "var(--ax-muted)" }}>
            {new Date(account.created_at).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--ax-muted)" }}>
          Teams and RBAC arrive in a later phase. For now, each account owns its sites directly.
        </p>
        <Link className="btnSecondary" href="/dashboard">
          Back to sites
        </Link>
      </div>
    </>
  );
}
