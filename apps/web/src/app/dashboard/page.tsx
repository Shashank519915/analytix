import Link from "next/link";
import { Suspense } from "react";
import { listSitesForAccount } from "@analytix/db";
import { PageHeader } from "@/components/shell/PageHeader";
import { SitesBentoGrid, SitesBentoSkeleton } from "@/components/SitesBentoGrid";
import { requireAccountSession } from "@/lib/auth";

export default async function DashboardPage() {
  const account = await requireAccountSession();
  const sites = await listSitesForAccount(account.id);

  return (
    <>
      <PageHeader
        title="Sites"
        subtitle={`${sites.length} propert${sites.length === 1 ? "y" : "ies"} · ${account.email}`}
        actions={
          <Link className="btn" href="/dashboard/sites/new">
            Add site
          </Link>
        }
      />

      <Suspense fallback={<SitesBentoSkeleton />}>
        <SitesBentoGrid sites={sites} />
      </Suspense>
    </>
  );
}
