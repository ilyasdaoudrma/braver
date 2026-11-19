import type { Metadata } from "next";
import { ScreenPlaceholder } from "@/components/ui/ScreenPlaceholder";

export const metadata: Metadata = { title: "Respirer" };

export default function RespirerPage() {
  return (
    <ScreenPlaceholder
      title="Respirer"
      description="Le soupir cyclique, 2 ou 5 minutes, à ton rythme."
      issue={23}
      owner="Ayoub"
    />
  );
}
