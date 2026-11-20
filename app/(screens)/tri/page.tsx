import type { Metadata } from "next";
import { TriView } from "@/components/tri/TriView";

export const metadata: Metadata = { title: "Tri" };

export default function TriPage() {
  return <TriView />;
}
