import { useEffect, useMemo, useRef, useState } from "react";

import { CATEGORY_ICON } from "@/components/common/indicators";
import { CATEGORY_LABEL, getCamera, type Category, type Occurrence } from "@/lib/demo-data";
import { CATEGORIES } from "@/lib/detection-logic";
import { formatClock, useSimNow } from "@/lib/sim-clock";
import { cn } from "@/lib/utils";

const dotTone: Record<Category, string> = {
  pessoa: "bg-gold",
  veiculo: "bg-info",
  animal: "bg-success",
};

/** Faixa de linha do tempo clicável com miniaturas e filtros por categoria. */
export function EventTimeline({
  occurrences,
  selectedId,
  onSelect,
  className,
}: {
  occurrences: Occurrence[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const now = useSimNow();
  const [active, setActive] = useState<Record<Category, boolean>>({ pessoa: true, veiculo: true, animal: true });
  const scroller = useRef<HTMLDivElement>(null);

  const items = useMemo(
    () => occurrences.filter((o) => active[o.category]).sort((a, b) => a.captureAt - b.captureAt),
    [occurrences, active],
  );

  const start = Math.floor((Math.min(...occurrences.map((o) => o.captureAt), now - 3600) - 600) / 1800) * 1800;
  const end = now + 120;
  const span = end - start;
  const ticks: number[] = [];
  for (let t = start; t <= end; t += 1800) ticks.push(t);

  useEffect(() => {
    scroller.current?.scrollTo({ left: scroller.current.scrollWidth });
  }, [items.length]);

  const toggle = (c: Category) => setActive((s) => ({ ...s, [c]: !s[c] }));

  return (
    <section aria-label="Linha do tempo de eventos" className={cn("rounded-lg border bg-card shadow-panel", className)}>
      <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
        <h2 className="text-[13px] font-semibold">Linha do tempo</h2>
        <span className="text-xs text-muted-foreground">{items.length} eventos · hoje</span>
        <div className="ml-auto flex gap-1">
          {CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICON[c];
            return (
              <button
                key={c}
                type="button"
                aria-pressed={active[c]}
                onClick={() => toggle(c)}
                className={cn(
                  "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition-colors",
                  active[c] ? "border-gold/60 bg-gold-soft text-foreground" : "bg-card text-muted-foreground line-through",
                )}
              >
                <span className={cn("size-1.5 rounded-full", dotTone[c])} />
                <Icon className="size-3.5" />
                <span className="hidden sm:inline">{CATEGORY_LABEL[c]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Régua */}
      <div className="relative mx-4 mt-3 h-6">
        <div className="absolute inset-x-0 top-3 h-px bg-border" />
        {ticks.map((t) => (
          <span
            key={t}
            className="absolute top-0 -translate-x-1/2 text-[10px] text-muted-foreground tabular-nums"
            style={{ left: `${((t - start) / span) * 100}%` }}
          >
            {formatClock(t, false)}
          </span>
        ))}
        {items.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-label={`${CATEGORY_LABEL[o.category]} às ${formatClock(o.captureAt)}`}
            onClick={() => onSelect(o.id)}
            className={cn(
              "absolute top-[7px] size-2.5 -translate-x-1/2 cursor-pointer rounded-full ring-2 ring-card",
              dotTone[o.category],
              selectedId === o.id && "size-3.5 top-[5px] ring-foreground",
            )}
            style={{ left: `${((o.captureAt - start) / span) * 100}%` }}
          />
        ))}
        <span className="absolute top-1 h-5 w-px bg-foreground" style={{ left: `${((now - start) / span) * 100}%` }} />
      </div>

      {/* Miniaturas */}
      <div ref={scroller} className="scrollbar-thin flex gap-2 overflow-x-auto px-4 pt-2 pb-3">
        {items.map((o) => {
          const cam = getCamera(o.cameraId);
          const Icon = CATEGORY_ICON[o.category];
          const sel = selectedId === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onSelect(o.id)}
              className={cn(
                "group w-[132px] shrink-0 cursor-pointer overflow-hidden rounded-md border bg-card text-left transition-colors hover:border-gold/60",
                sel && "border-gold ring-1 ring-gold",
              )}
            >
              <div className="relative aspect-video bg-video">
                <img src={cam.image} alt="" loading="lazy" width={264} height={148} className="size-full object-cover" />
                <span className="absolute top-1 left-1 grid size-5 place-items-center rounded bg-video-overlay text-video-foreground">
                  <Icon className="size-3" />
                </span>
                {o.status !== "finalizada" && (
                  <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-gold ring-2 ring-video-overlay" />
                )}
              </div>
              <div className="px-2 py-1.5">
                <div className="text-[11px] font-semibold tabular-nums">{formatClock(o.captureAt)}</div>
                <div className="truncate text-[10.5px] text-muted-foreground">{cam.location}</div>
              </div>
            </button>
          );
        })}
        {items.length === 0 && (
          <p className="py-4 text-xs text-muted-foreground">Nenhum evento com os filtros selecionados.</p>
        )}
      </div>
    </section>
  );
}
