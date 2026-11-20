import Link from "next/link";
import { LangToggle } from "@/components/i18n/LangToggle";
import { HelpButton } from "./HelpButton";
import { Logo } from "./Logo";
import { TopNav } from "./TopNav";

/** Phone: logo + language + help. PC (≥ 1024 px): full-width bar with the five tabs in the middle. */
export function TopBar() {
  return (
    <header className="sticky top-0 z-20 pt-[env(safe-area-inset-top)] lg:px-6 lg:pt-4">
      <div className="glass mx-auto mt-2 flex h-14 max-w-[calc(28rem-1rem)] items-center justify-between gap-2 rounded-2xl px-2.5 shadow-[0_12px_30px_-22px_rgba(27,35,51,0.4)] max-[460px]:mx-2 lg:mt-0 lg:h-16 lg:max-w-6xl lg:px-4">
        <Link href="/accueil" aria-label="BRAVER — accueil" className="rounded-xl px-1.5 py-1">
          <Logo compact />
        </Link>
        <TopNav />
        <div className="flex items-center gap-1.5">
          <LangToggle />
          <HelpButton />
        </div>
      </div>
    </header>
  );
}
