"use client";
import { useRef } from "react";
import { MotionConfig } from "motion/react";
import { useLang } from "@/lib/i18n";
import { landingCopy } from "./copy";
import { LandingNav } from "./LandingNav";
import { Scene } from "./Scene";
import { End, Hero, Proof, Safety, Zones, type ProofNumbers } from "./Sections";
import { useLandingMotion } from "./useLandingMotion";

/** Scroll-driven landing page: the Oujda sky goes from dawn to night while the three zone orbs travel. */
export function Landing({ proof }: { proof: ProofNumbers }) {
  const lang = useLang();
  const t = landingCopy(lang);
  const root = useRef<HTMLDivElement>(null);
  useLandingMotion(root, lang);
  return (
    <MotionConfig reducedMotion="user">
      <div ref={root} className="relative overflow-x-clip">
        <Scene />
        <LandingNav t={t} />
        <main className="relative z-10">
          <Hero t={t} />
          <Zones t={t} />
          <Safety t={t} />
          <Proof t={t} lang={lang} m={proof} />
          <End t={t} />
        </main>
      </div>
    </MotionConfig>
  );
}
