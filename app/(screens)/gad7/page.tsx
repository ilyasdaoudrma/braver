import type { Metadata } from "next";
import { ScreenPlaceholder } from "@/components/ui/ScreenPlaceholder";

export const metadata: Metadata = { title: "Questionnaire de la semaine" };

export default function QuestionnairedelasemainePage() {
  return (
    <ScreenPlaceholder
      title="Questionnaire de la semaine"
      description="Sept questions, une par écran, pour suivre ton anxiété dans le temps."
      issue={23}
      owner="Ayoub"
    />
  );
}
