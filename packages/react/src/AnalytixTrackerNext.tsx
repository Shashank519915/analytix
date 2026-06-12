"use client";

import { usePathname } from "next/navigation";
import { AnalytixTracker, type AnalytixTrackerProps } from "./AnalytixTracker";

type NextTrackerProps = Omit<AnalytixTrackerProps, "pathname">;

/** Next.js App Router tracker — passes `usePathname()` automatically. */
export function AnalytixTrackerNext(props: NextTrackerProps) {
  const pathname = usePathname();
  return <AnalytixTracker pathname={pathname ?? undefined} {...props} />;
}
