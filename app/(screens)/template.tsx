import type { ReactNode } from "react";
import { PageTransition } from "@/components/ui/PageTransition";

/** Re-mounted on every navigation, so each screen gets its entrance. */
export default function ScreensTemplate({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
