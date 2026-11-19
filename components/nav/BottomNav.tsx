"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActiveTab, NAV_TABS } from "./routes";

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto grid h-(--nav-h) max-w-md grid-cols-5 px-2">
        {NAV_TABS.map((tab) => {
          const active = isActiveTab(tab, pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`group flex flex-1 flex-col items-center justify-center gap-1 rounded-xl text-xs transition-colors duration-200 ${
                  active ? "font-bold text-ink" : "text-ink-2 hover:text-ink"
                }`}
              >
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full transition-[background-color,transform] duration-200 ease-out group-active:scale-95 ${
                    active ? "bg-surface-2" : ""
                  }`}
                >
                  <Icon aria-hidden size={20} strokeWidth={active ? 2.25 : 1.75} />
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
