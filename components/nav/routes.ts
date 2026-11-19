import { History, House, LineChart, Menu, PenLine, type LucideIcon } from "lucide-react";

export interface NavTab {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Other routes that light up this tab. */
  also: readonly string[];
}

/** Bottom navigation: Accueil · Vider · Replay · Suivi · Plus. Shared file. */
export const NAV_TABS: readonly NavTab[] = [
  { href: "/accueil", label: "Accueil", icon: House, also: [] },
  { href: "/vider", label: "Vider", icon: PenLine, also: ["/tri"] },
  { href: "/replay", label: "Replay", icon: History, also: [] },
  { href: "/suivi", label: "Suivi", icon: LineChart, also: [] },
  { href: "/plus", label: "Plus", icon: Menu, also: ["/respirer", "/gad7", "/cartes", "/labo"] },
];

export function isActiveTab(tab: NavTab, pathname: string): boolean {
  return [tab.href, ...tab.also].some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
