import type { Metadata } from "next";
import { ScreenPlaceholder } from "@/components/ui/ScreenPlaceholder";

export const metadata: Metadata = { title: "Suivi" };

export default function SuiviPage() {
  return (
    <ScreenPlaceholder
      title="Suivi"
      description="Ton humeur, tes zones et tes étapes sur 24 h, 7 jours ou 30 jours."
      issue={22}
      owner="Ayoub"
    />
  );
}
