import type { Metadata } from "next";
import { Gad7View } from "@/components/gad7/Gad7View";

export const metadata: Metadata = { title: "Questionnaire de la semaine" };

export default function Page() {
  return <Gad7View />;
}
