"use client";
import { useEffect, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type Pose = [x: string, y: string, scale: number];
type Poses = Record<"scenario" | "action" | "acceptation", Pose>;

/** One pose per section for the three zone orbs (x/y from the screen centre). */
const DESKTOP: Poses[] = [
  { scenario: ["26vw", "-14vh", 1], action: ["35vw", "4vh", 0.85], acceptation: ["22vw", "14vh", 0.7] }, // hero: cluster on the right
  { scenario: ["-42vw", "-30vh", 0.45], action: ["44vw", "-34vh", 0.4], acceptation: ["-40vw", "34vh", 0.4] }, // zones: to the edges
  { scenario: ["30vw", "-8vh", 0.9], action: ["36vw", "8vh", 0.7], acceptation: ["27vw", "20vh", 0.6] }, // safety: regroup right
  { scenario: ["44vw", "-24vh", 0.32], action: ["-45vw", "36vh", 0.3], acceptation: ["45vw", "40vh", 0.3] }, // proof: corners, clear of the numbers
  { scenario: ["-30vw", "-26vh", 0.7], action: ["31vw", "-22vh", 0.6], acceptation: ["0vw", "-38vh", 0.45] }, // end: around the CTA
];
const PHONE: Poses[] = [
  { scenario: ["26vw", "17vh", 0.75], action: ["38vw", "26vh", 0.55], acceptation: ["10vw", "28vh", 0.45] },
  { scenario: ["-40vw", "-40vh", 0.4], action: ["42vw", "-38vh", 0.35], acceptation: ["44vw", "40vh", 0.35] },
  { scenario: ["36vw", "-40vh", 0.5], action: ["44vw", "-32vh", 0.4], acceptation: ["30vw", "-30vh", 0.35] },
  { scenario: ["-42vw", "-40vh", 0.35], action: ["44vw", "-42vh", 0.3], acceptation: ["-44vw", "42vh", 0.3] },
  { scenario: ["-30vw", "-38vh", 0.55], action: ["32vw", "-36vh", 0.5], acceptation: ["0vw", "-44vh", 0.4] },
];
const SECTIONS = ["#top", "#zones", "#safety", "#proof", "#end"];

function fmt(v: number, lang: string): string {
  const s = (Math.floor(v * 10000 + 1e-9) / 100).toFixed(2);
  return `${lang === "fr" ? s.replace(".", ",") : s} %`;
}

/** GSAP ScrollTrigger choreography of the landing page. Reduced motion: nothing moves, everything is visible. */
export function useLandingMotion(root: RefObject<HTMLElement | null>, lang: string): void {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    gsap.registerPlugin(ScrollTrigger);
    const q = gsap.utils.selector(el);
    const mm = gsap.matchMedia();

    mm.add(
      { motion: "(prefers-reduced-motion: no-preference)", desktop: "(min-width: 900px)" },
      (ctx) => {
        const { motion, desktop } = ctx.conditions as { motion: boolean; desktop: boolean };
        const scrub = motion ? 0.8 : true;

        // 0. The desktop pin is created first: every trigger below the zones section must count its extra scroll.
        if (motion && desktop) {
          const pinCards = q("[data-zone-card]");
          gsap.set(pinCards, { opacity: 0, y: 70, rotate: 1.5 });
          gsap
            .timeline({ scrollTrigger: { trigger: q('[data-pin="zones"]')[0], start: "top top", end: "+=120%", pin: true, scrub: 0.6 } })
            .to(pinCards, { opacity: 1, y: 0, rotate: 0, stagger: 0.5, duration: 1, ease: "power2.out" });
        }

        // 1. Sky: dawn → paper veil → dusk → night.
        gsap.to(q('[data-scene="dawn"]'), { scale: motion ? 1.08 : 1, yPercent: motion ? -4 : 0, ease: "none", scrollTrigger: { trigger: "#top", start: "top top", end: "bottom top", scrub } });
        gsap.to(q('[data-scene="veil"]'), { opacity: 1, ease: "none", scrollTrigger: { trigger: "#zones", start: "top 95%", end: "top 35%", scrub } });
        gsap.to(q('[data-scene="dusk"]'), { opacity: 1, ease: "none", scrollTrigger: { trigger: "#proof", start: "top bottom", end: "top 30%", scrub } });
        gsap.to(q('[data-scene="night"]'), { opacity: 1, ease: "none", scrollTrigger: { trigger: "#end", start: "top bottom", end: "top 25%", scrub } });
        gsap.fromTo(
          q('[data-scene="veil"]'),
          { opacity: 1 },
          { opacity: 0, ease: "none", immediateRender: false, scrollTrigger: { trigger: "#end", start: "top 90%", end: "top 30%", scrub } },
        );

        // 2. Orbs travel between section poses.
        const poses = desktop ? DESKTOP : PHONE;
        (["scenario", "action", "acceptation"] as const).forEach((key) => {
          const orb = q(`[data-orb="${key}"]`);
          const [x0, y0, s0] = poses[0][key];
          gsap.set(orb, { x: x0, y: y0, scale: s0 });
          for (let i = 1; i < SECTIONS.length; i++) {
            const [x, y, s] = poses[i][key];
            gsap.to(orb, {
              x, y, scale: s, ease: "power2.inOut", immediateRender: false,
              scrollTrigger: { trigger: SECTIONS[i], start: "top bottom", end: "top 20%", scrub: motion ? 1.2 : true },
            });
          }
        });

        if (!motion) return;

        // 3. Reveal on scroll, batched with a 60 ms stagger.
        const reveals = q("[data-reveal]");
        gsap.set(reveals, { opacity: 0, y: 28 });
        ScrollTrigger.batch(reveals, {
          start: "top 88%",
          once: true,
          onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.06 }),
        });

        // 4. Zone cards (phone): one by one as they enter. The desktop pin is created first, above.
        const cards = q("[data-zone-card]");
        if (!desktop) {
          gsap.set(cards, { opacity: 0, y: 40 });
          ScrollTrigger.batch(cards, { start: "top 90%", once: true, onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.08 }) });
        }

        // 5. Proof numbers count up once (truncated, like the final value).
        q("[data-count]").forEach((node) => {
          const target = Number(node.getAttribute("data-count"));
          const obj = { v: 0 };
          ScrollTrigger.create({
            trigger: node, start: "top 85%", once: true,
            onEnter: () => gsap.to(obj, { v: target, duration: 1.6, ease: "power2.out", onUpdate: () => { node.textContent = fmt(Math.min(obj.v, target), lang); } }),
          });
        });
      },
    );

    // Images and fonts change the page height after the first layout: measure again once everything is in.
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);
    document.fonts?.ready.then(onLoad).catch(() => undefined);

    return () => {
      window.removeEventListener("load", onLoad);
      mm.revert();
    };
  }, [root, lang]);
}
