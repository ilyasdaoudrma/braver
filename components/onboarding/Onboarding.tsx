"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  HardDrive,
  ListChecks,
  ShieldCheck,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { store } from "@/lib/store";
import type { Consent } from "@/lib/types";

interface Slide {
  icon: LucideIcon;
  title: string;
  text: string;
}

const SLIDES: Slide[] = [
  {
    icon: ListChecks,
    title: "Vide ta tête",
    text: "Écris ce qui t'inquiète, en français ou en darija. BRAVER trie chaque inquiétude : scénario, action ou acceptation.",
  },
  {
    icon: Timer,
    title: "Une chose à la fois",
    text: "Un scénario se vérifie plus tard dans le Replay. Une action devient une petite étape de moins de 15 minutes.",
  },
  {
    icon: ShieldCheck,
    title: "Si ça va trop mal",
    text: "Si un message parle de danger, BRAVER s'arrête et te montre qui appeler au Maroc. BRAVER ne remplace pas un professionnel.",
  },
];

const CHOICES: {
  value: Exclude<Consent, null>;
  title: string;
  text: string;
}[] = [
  {
    value: "device",
    title: "Garder sur ce téléphone",
    text: "Tes inquiétudes, ton humeur et ton Replay restent sur ce téléphone, même après fermeture.",
  },
  {
    value: "session",
    title: "Seulement cette fois",
    text: "Tout s'efface quand tu fermes l'onglet. Le Replay ne pourra pas te reposer tes prédictions.",
  },
];

export function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  // No pre-selected answer: storing on the phone must be an explicit choice.
  const [consent, setConsent] = useState<Consent>(
    () => store.get("settings").consent,
  );
  const onConsent = step >= SLIDES.length;

  function finish() {
    if (!consent) return;
    store.setConsent(consent);
    store.set("onboarded", true);
    router.replace("/accueil");
  }

  if (onConsent) {
    return (
      <section className="enter space-y-6" aria-labelledby="consent-title">
        <div className="space-y-2">
          <HardDrive aria-hidden size={28} className="text-ink-2" />
          <h1
            id="consent-title"
            className="font-display text-4xl font-light tracking-tight"
          >
            Tes données restent à toi
          </h1>
          <p className="text-ink-2">
            Pas de compte. Seul le texte à trier est envoyé à l&apos;IA, sans
            ton nom ni identifiant.
          </p>
        </div>
        <fieldset className="space-y-3">
          <legend className="mb-2 font-bold">Où garder tes données ?</legend>
          {CHOICES.map((c) => (
            <label
              key={c.value}
              className={`block cursor-pointer rounded-2xl border-2 bg-surface p-4 transition-colors duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus ${
                consent === c.value ? "border-ink" : "border-line"
              }`}
            >
              <input
                type="radio"
                name="consent"
                value={c.value}
                checked={consent === c.value}
                onChange={() => setConsent(c.value)}
                className="sr-only"
              />
              <span className="block font-bold">{c.title}</span>
              <span className="block text-sm text-ink-2">{c.text}</span>
            </label>
          ))}
        </fieldset>
        <p className="text-sm text-ink-2">
          Tu peux tout effacer à tout moment dans Plus.
        </p>
        <button
          type="button"
          onClick={finish}
          disabled={!consent}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 font-bold text-paper transition-transform duration-200 ease-out active:scale-[0.98] disabled:opacity-40"
        >
          Commencer
          <ArrowRight aria-hidden size={18} />
        </button>
      </section>
    );
  }

  const slide = SLIDES[step];
  const Icon = slide.icon;
  return (
    <section
      key={step}
      className="enter flex min-h-[70dvh] flex-col justify-between gap-8"
      aria-labelledby="slide-title"
    >
      <div className="space-y-4 pt-8">
        <Icon aria-hidden size={36} className="text-scenario" />
        <h1
          id="slide-title"
          className="font-display text-5xl font-light tracking-tight"
        >
          {slide.title}
        </h1>
        <p className="text-lg text-ink-2">{slide.text}</p>
      </div>
      <div className="space-y-4">
        <div
          className="flex justify-center gap-2"
          aria-label={`Écran ${step + 1} sur ${SLIDES.length}`}
          role="img"
        >
          {SLIDES.map((s, i) => (
            <span
              key={s.title}
              className={`h-2 rounded-full transition-[width] duration-200 ${i === step ? "w-6 bg-ink" : "w-2 bg-line"}`}
            />
          ))}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep(SLIDES.length)}
            className="min-h-12 flex-1 rounded-full border border-ink/20 px-5 font-bold"
          >
            Passer
          </button>
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-5 font-bold text-paper transition-transform duration-200 ease-out active:scale-[0.98]"
          >
            Suivant
            <ArrowRight aria-hidden size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
