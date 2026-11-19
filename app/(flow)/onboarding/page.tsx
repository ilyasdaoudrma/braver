import type { Metadata } from "next";
import { ScreenPlaceholder } from "@/components/ui/ScreenPlaceholder";

export const metadata: Metadata = { title: "Bienvenue" };

export default function BienvenuePage() {
  return (
    <ScreenPlaceholder
      title="Bienvenue"
      description="Trois écrans pour découvrir BRAVER, puis ton choix pour tes données."
      issue={22}
      owner="Ayoub"
    />
  );
}
