"use client";
import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { pick, useLang } from "@/lib/i18n";

/** "Besoin d'aide" — on every screen, opens the safety screen with the Moroccan numbers. */
export function HelpButton() {
  const lang = useLang();
  return (
    <Link
      href="/securite"
      className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border border-danger/25 bg-surface px-4 text-sm font-bold text-danger hover:bg-danger-soft"
    >
      <LifeBuoy aria-hidden size={18} />
      {pick(lang, "Besoin d'aide", "Need help")}
    </Link>
  );
}
