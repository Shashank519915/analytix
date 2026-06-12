import AppShell from "@/components/shell/AppShell";
import { requireAccountSession } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const account = await requireAccountSession();

  return <AppShell email={account.email}>{children}</AppShell>;
}
