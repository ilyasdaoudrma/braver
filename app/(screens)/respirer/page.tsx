import type { Metadata } from "next";
import { BreathingView } from "@/components/respirer/BreathingView";

export const metadata: Metadata = { title: "Respirer" };

export default function Page() {
  return <BreathingView />;
}
