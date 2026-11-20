/** BRAVER wordmark with the three-zone orb (scenario, action, acceptation).
 *  `compact`: the word is hidden on very narrow screens (the orb and the link label stay). */
export function Logo({ size = "md", compact = false }: { size?: "md" | "lg"; compact?: boolean }) {
  const orb = size === "lg" ? "h-8 w-8" : "h-6 w-6";
  const text = size === "lg" ? "text-2xl" : "text-lg";
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className={`${orb} shrink-0 rounded-full shadow-[0_0_14px_rgba(91,63,214,0.35)]`}
        style={{
          background:
            "radial-gradient(circle at 32% 30%, #fdfbf7 0 9%, transparent 10%), conic-gradient(from 200deg, #5b3fd6, #b93d0a, #0b7065, #5b3fd6)",
        }}
      />
      <span className={`font-display ${text} font-semibold tracking-tight text-ink ${compact ? "max-[410px]:sr-only" : ""}`}>BRAVER</span>
    </span>
  );
}
