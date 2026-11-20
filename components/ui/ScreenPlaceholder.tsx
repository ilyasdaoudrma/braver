import { Hammer } from "lucide-react";

interface ScreenPlaceholderProps {
  title: string;
  /** One line saying what this screen will do. */
  description: string;
  issue: number;
  owner: "Ilyas" | "Ayoub";
}

/** Empty screen shell. The owner replaces this component with the real screen. */
export function ScreenPlaceholder({ title, description, issue, owner }: ScreenPlaceholderProps) {
  return (
    <section className="enter space-y-6" aria-labelledby="screen-title">
      <div className="space-y-2">
        <h1 id="screen-title" className="font-display text-4xl font-light tracking-tight">
          {title}
        </h1>
        <p className="text-ink-2">{description}</p>
      </div>
      <div className="flex items-start gap-3 rounded-2xl border border-dashed border-line bg-surface p-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-2">
          <Hammer aria-hidden size={20} />
        </span>
        <div className="space-y-1">
          <p className="font-bold">Écran en construction</p>
          <p className="text-sm text-ink-2">
            Issue #{issue} · {owner}
          </p>
        </div>
      </div>
    </section>
  );
}
