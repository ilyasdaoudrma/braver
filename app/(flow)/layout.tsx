import type { ReactNode } from "react";
import { TopBar } from "@/components/nav/TopBar";

/** Screens without the bottom bar (onboarding). The help button stays visible. */
export default function FlowLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-md px-4 pt-6 pb-10">{children}</main>
    </>
  );
}
