import type { Metadata } from "next";
import { ScreenPlaceholder } from "@/components/ui/ScreenPlaceholder";

export const metadata: Metadata = { title: "Tri" };

export default function TriPage() {
  return (
    <ScreenPlaceholder
      title="Tri"
      description="Chaque inquiétude rangée dans sa zone : scénario, action ou acceptation."
      issue={17}
      owner="Ilyas"
    />
  );
}
