import type { Metadata } from "next";
import { ScreenPlaceholder } from "@/components/ui/ScreenPlaceholder";

export const metadata: Metadata = { title: "Replay" };

export default function ReplayPage() {
  return (
    <ScreenPlaceholder
      title="Replay"
      description="Compare tes prédictions avec ce qui s’est vraiment passé."
      issue={17}
      owner="Ilyas"
    />
  );
}
