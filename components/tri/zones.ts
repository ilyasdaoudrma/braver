import type { Zone } from "@/lib/types";

export const ZONE_LABEL: Record<Zone, string> = {
  scenario: "Scénario",
  action: "Action",
  acceptation: "Acceptation",
};

export const ZONE_STYLE: Record<Zone, { bar: string; chip: string }> = {
  scenario: { bar: "bg-scenario", chip: "bg-scenario-soft text-scenario" },
  action: { bar: "bg-action", chip: "bg-action-soft text-action" },
  acceptation: {
    bar: "bg-acceptation",
    chip: "bg-acceptation-soft text-acceptation",
  },
};
