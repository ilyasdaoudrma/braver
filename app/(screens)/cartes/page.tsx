import type { Metadata } from "next";
import { ScreenPlaceholder } from "@/components/ui/ScreenPlaceholder";

export const metadata: Metadata = { title: "À lire" };

export default function lirePage() {
  return (
    <ScreenPlaceholder
      title="À lire"
      description="Des cartes courtes pour aller plus loin sur chaque zone."
      issue={23}
      owner="Ayoub"
    />
  );
}
