import Link from "next/link";
import { HelpButton } from "./HelpButton";

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-line/60 bg-paper/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
        <Link href="/accueil" className="font-display text-xl font-bold tracking-tight text-ink">
          BRAVER
        </Link>
        <HelpButton />
      </div>
    </header>
  );
}
