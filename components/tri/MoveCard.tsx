"use client";
import { useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import type { Zone } from "@/lib/types";
import { ZONES } from "@/lib/types";
import { moveCard } from "@/lib/sort/session";
import { ZONE_LABEL } from "./zones";

/** "Pas la bonne zone ?" — the person can move the card; their choice is saved. */
export function MoveCard({ index, zone, disabled }: { index: number; zone: Zone; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-expanded={open}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-ink-2 underline-offset-4 hover:underline disabled:opacity-40"
      >
        <ArrowRightLeft aria-hidden size={14} />
        Pas la bonne zone ?
      </button>
      {open && (
        <div className="enter flex flex-wrap gap-2" role="group" aria-label="Déplacer la carte vers">
          {ZONES.filter((z) => z !== zone).map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => {
                moveCard(index, z);
                setOpen(false);
              }}
              className="min-h-11 rounded-full border border-ink/20 px-4 text-sm font-bold"
            >
              Mettre en {ZONE_LABEL[z]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
