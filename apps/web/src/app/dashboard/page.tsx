import Link from "next/link";
import { listSitesForAccount } from "@analytix/db";
import LogoutButton from "@/components/LogoutButton";
import { requireAccountSession } from "@/lib/auth";

export default async function DashboardPage() {
  const account = await requireAccountSession();
  const sites = await listSitesForAccount(account.id);

  return (
    <main>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Sites</h1>
          <p className="pageSubtitle">Signed in as {account.email}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link className="btn" href="/dashboard/sites/new">
            Add site
          </Link>
          <LogoutButton />
        </div>
      </div>

      {sites.length === 0 ? (
        <div className="card">
          <p>No sites yet. Create your first site to start collecting analytics.</p>
          <p style={{ marginTop: 16 }}>
            <Link className="btn" href="/dashboard/sites/new">
              Create site
            </Link>
          </p>
        </div>
      ) : (
        <ul className="siteList">
          {sites.map((site) => (
            <li key={site.id}>
              <div className="siteMeta">
                <strong>{site.name}</strong>
                <span>{site.domain}</span>
              </div>
              <Link className="btnSecondary" href={`/dashboard/sites/${site.id}`}>
                View analytics
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
