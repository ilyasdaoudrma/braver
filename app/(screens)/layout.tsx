import type { ReactNode } from "react";
import { BottomNav } from "@/components/nav/BottomNav";
import { TopBar } from "@/components/nav/TopBar";
import { SortAlertWatcher } from "@/components/securite/SortAlertWatcher";

export default function ScreensLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-md px-4 pt-6 pb-[calc(var(--nav-h)+env(safe-area-inset-bottom)+1.5rem)] lg:max-w-5xl lg:px-8 lg:pt-12 lg:pb-16">{children}</main>
      <BottomNav />
      <SortAlertWatcher />
    </>
  );
}
