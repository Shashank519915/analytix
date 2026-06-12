import { redirect } from "next/navigation";
import { LandingPage } from "@/components/LandingPage";
import { getSessionFromCookies } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSessionFromCookies();
  if (session) {
    redirect("/dashboard");
  }

  return <LandingPage />;
}
