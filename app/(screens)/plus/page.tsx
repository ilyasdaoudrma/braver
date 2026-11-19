import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ChevronRight, ClipboardList, FlaskConical, Wind, type LucideIcon } from "lucide-react";

export const metadata: Metadata = { title: "Plus" };

interface Entry {
  href: string;
  label: string;
  hint: string;
  icon: LucideIcon;
}

const ENTRIES: readonly Entry[] = [
  { href: "/respirer", label: "Respirer", hint: "Soupir cyclique, 2 ou 5 minutes", icon: Wind },
  { href: "/gad7", label: "Questionnaire de la semaine", hint: "Sept questions, ton score dans le temps", icon: ClipboardList },
  { href: "/cartes", label: "À lire", hint: "Des cartes courtes sur chaque zone", icon: BookOpen },
  { href: "/labo", label: "Labo", hint: "La performance mesurée de nos modèles", icon: FlaskConical },
];

export default function PlusPage() {
  return (
    <section className="enter space-y-6" aria-labelledby="plus-title">
      <h1 id="plus-title" className="font-display text-3xl font-bold tracking-tight">
        Plus
      </h1>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {ENTRIES.map(({ href, label, hint, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors duration-200 hover:bg-surface-2">
              <Icon aria-hidden size={20} className="shrink-0 text-ink-2" />
              <span className="flex-1">
                <span className="block font-bold">{label}</span>
                <span className="block text-sm text-ink-2">{hint}</span>
              </span>
              <ChevronRight aria-hidden size={18} className="text-ink-2" />
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-sm text-ink-2">Réglages et « Effacer mes données » arrivent ici (issue #22).</p>
    </section>
  );
}
