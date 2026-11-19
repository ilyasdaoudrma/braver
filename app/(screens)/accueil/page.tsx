import type { Metadata } from "next";
import { ScreenPlaceholder } from "@/components/ui/ScreenPlaceholder";

export const metadata: Metadata = { title: "Accueil" };

export default function AccueilPage() {
  return (
    <ScreenPlaceholder
      title="Accueil"
      description="Ton humeur du jour, puis vide ta tête quand tu veux."
      issue={22}
      owner="Ayoub"
    />
  );
}
