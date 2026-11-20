"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSortSession } from "@/lib/sort/session";

/**
 * Mounted on every screen with the bottom bar: if a sort turns into an alert
 * (even late, after the LLM answers), the safety screen opens wherever the person is.
 */
export function SortAlertWatcher() {
  const session = useSortSession();
  const router = useRouter();
  const pathname = usePathname();
  const pending = Boolean(session?.outcome.alert) && !session?.alertSeen;

  useEffect(() => {
    if (pending && pathname !== "/securite") router.push("/securite");
  }, [pending, pathname, router]);

  return null;
}
