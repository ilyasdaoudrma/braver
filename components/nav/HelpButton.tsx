import Link from "next/link";
import { LifeBuoy } from "lucide-react";

/** "Besoin d'aide" — on every screen, opens the safety screen with the Moroccan numbers. */
export function HelpButton() {
  return (
    <Link
      href="/securite"
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/20 bg-surface px-4 text-sm font-bold text-ink transition-[background-color,transform] duration-200 ease-out hover:bg-surface-2 active:scale-[0.97]"
    >
      <LifeBuoy aria-hidden size={18} />
      Besoin d&apos;aide
    </Link>
  );
}
