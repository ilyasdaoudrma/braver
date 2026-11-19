import type { Metadata } from "next";
import { SafetyScreen } from "@/components/securite/SafetyScreen";

export const metadata: Metadata = { title: "Besoin d'aide" };

// First version of the safety screen (numbers + ready message). S1 (#17) refines it.
export default function SecuritePage() {
  return <SafetyScreen />;
}
