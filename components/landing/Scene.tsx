import Image from "next/image";

const ORBS = [
  { key: "scenario", c1: "#ece8fc", c2: "#8f78f0", c3: "#5b3fd6", size: "clamp(5rem, 13vw, 11rem)" },
  { key: "action", c1: "#fbe9df", c2: "#e2804f", c3: "#b93d0a", size: "clamp(4.2rem, 10.5vw, 9rem)" },
  { key: "acceptation", c1: "#dff2ee", c2: "#3fa597", c3: "#0b7065", size: "clamp(3.6rem, 9vw, 7.5rem)" },
] as const;

/** Fixed background: the same Oujda horizon at dawn, dusk and night (crossfaded by scroll),
 *  a paper veil for reading, and three glossy zone orbs that travel between sections. */
export function Scene() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div data-scene="dawn" className="absolute inset-0 will-change-transform">
        <Image src="/landing/sky-dawn.webp" alt="" fill priority sizes="100vw" quality={72} className="object-cover object-[62%_center]" />
      </div>
      <div data-scene="dusk" className="absolute inset-0 opacity-0">
        <Image src="/landing/sky-dusk.webp" alt="" fill sizes="100vw" quality={72} className="object-cover object-[62%_center]" />
      </div>
      <div data-scene="night" className="absolute inset-0 opacity-0">
        <Image src="/landing/sky-night.webp" alt="" fill sizes="100vw" quality={72} className="object-cover object-[62%_center]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,22,48,0.1)_0%,transparent_35%,rgba(18,22,48,0.55)_70%,rgba(14,17,38,0.92)_100%)]" />
      </div>
      {/* Readability veil: transparent on the hero, paper in the middle sections. */}
      <div data-scene="veil" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(250,246,240,0.82),rgba(250,246,240,0.94))] opacity-0" />
      {/* Hero top fade so the nav and headline sit on calm sky. */}
      <div data-scene="haze" className="absolute inset-x-0 top-0 h-[55vh] bg-[linear-gradient(180deg,rgba(250,246,240,0.55),transparent)]" />

      {ORBS.map((o) => (
        <div key={o.key} data-orb={o.key} className="absolute top-1/2 left-1/2 will-change-transform" style={{ width: o.size, height: o.size, marginLeft: `calc(${o.size} / -2)`, marginTop: `calc(${o.size} / -2)` }}>
          <div
            className="h-full w-full rounded-full motion-safe:animate-[float-orb_6s_ease-in-out_infinite]"
            style={{
              background: `radial-gradient(circle at 30% 26%, ${o.c1} 0 7%, ${o.c2} 34%, ${o.c3} 78%)`,
              boxShadow: `inset -10px -14px 26px rgba(20,16,60,0.28), inset 6px 8px 14px rgba(253,251,247,0.45), 0 24px 50px -18px ${o.c3}`,
              animationDelay: o.key === "action" ? "-2s" : o.key === "acceptation" ? "-4s" : "0s",
            }}
          />
        </div>
      ))}
    </div>
  );
}
