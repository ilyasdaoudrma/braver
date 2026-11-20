"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { store } from "@/lib/store";

const VARIANTS = {
  fill: "bg-ink text-paper shadow-[0_14px_30px_-14px_rgba(27,35,51,0.7)] hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-14px_rgba(27,35,51,0.75)]",
  ghost: "glass text-ink hover:-translate-y-0.5 hover:bg-surface",
  light: "bg-surface text-ink shadow-[0_14px_30px_-16px_rgba(10,12,30,0.6)] hover:-translate-y-0.5",
} as const;

export const BTN = "inline-flex min-h-12 items-center justify-center gap-2.5 whitespace-nowrap rounded-2xl px-6 text-[15px] font-bold";

/** Start button: first visit → onboarding, otherwise → home. Data is on the device, so the choice is made on click. */
export function StartLink({ children, variant = "fill", className = "" }: { children: ReactNode; variant?: keyof typeof VARIANTS; className?: string }) {
  const router = useRouter();
  return (
    <Link
      href="/onboarding"
      onClick={(e) => {
        e.preventDefault();
        router.push(store.get("onboarded") ? "/accueil" : "/onboarding");
      }}
      className={`group ${BTN} ${VARIANTS[variant]} ${className}`}
    >
      {children}
      <ArrowRight aria-hidden size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
    </Link>
  );
}

export function GhostLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} className={`${BTN} ${VARIANTS.ghost} ${className}`}>
      {children}
    </a>
  );
}
