import type { ReactNode } from "react";
import { BottomNav } from "@/components/nav/BottomNav";
import { TopBar } from "@/components/nav/TopBar";

export default function ScreensLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-md px-4 pt-6 pb-[calc(var(--nav-h)+env(safe-area-inset-bottom)+1.5rem)]">{children}</main>
      <BottomNav />
    </>
  );
}
