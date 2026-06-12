import { redirect } from "next/navigation";
import AppShell from "@/components/shell/AppShell";
import { AuthError, requireAccountSession } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  try {
    const account = await requireAccountSession();
    return <AppShell email={account.email}>{children}</AppShell>;
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login");
    }
    throw error;
  }
}
