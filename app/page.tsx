"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { store } from "@/lib/store";

/** Entry: first visit → onboarding, otherwise → home. Data is on the device, so this runs in the browser. */
export default function EntryPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace(store.get("onboarded") ? "/accueil" : "/onboarding");
  }, [router]);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center px-4" aria-busy="true">
      <span className="font-display text-2xl font-bold tracking-tight text-ink-2">BRAVER</span>
    </main>
  );
}
