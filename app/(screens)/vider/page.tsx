import type { Metadata } from "next";
import { ViderForm } from "@/components/vider/ViderForm";

export const metadata: Metadata = { title: "Vider" };

export default function ViderPage() {
  return <ViderForm />;
}
