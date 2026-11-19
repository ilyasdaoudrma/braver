import type { Metadata } from "next";
import { ScreenPlaceholder } from "@/components/ui/ScreenPlaceholder";

export const metadata: Metadata = { title: "Vider" };

export default function ViderPage() {
  return (
    <ScreenPlaceholder
      title="Vider"
      description="Écris ce qui t’inquiète, une inquiétude par ligne."
      issue={17}
      owner="Ilyas"
    />
  );
}
