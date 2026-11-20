import type { Metadata } from "next";
import { SuiviView } from "@/components/suivi/SuiviView";

export const metadata: Metadata = { title: "Suivi" };

export default function SuiviPage() {
  return <SuiviView />;
}
