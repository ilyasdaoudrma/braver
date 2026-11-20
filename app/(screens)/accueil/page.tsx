import type { Metadata } from "next";
import { HomeView } from "@/components/accueil/HomeView";

export const metadata: Metadata = { title: "Accueil" };

export default function AccueilPage() {
  return <HomeView />;
}
