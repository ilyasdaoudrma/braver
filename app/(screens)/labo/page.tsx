import type { Metadata } from "next";
import { ScreenPlaceholder } from "@/components/ui/ScreenPlaceholder";

export const metadata: Metadata = { title: "Labo" };

export default function LaboPage() {
  return (
    <ScreenPlaceholder
      title="Labo"
      description="Comment nos modèles sont mesurés, avec les vrais chiffres."
      issue={21}
      owner="Ayoub"
    />
  );
}
