import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
  icon?: LucideIcon;
  /** Estilo do item quando selecionado */
  tone?: "gold" | "warning" | "neutral";
  hideLabelOnMobile?: boolean;
}

interface SegmentedProps<T extends string | number> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: "sm" | "md";
  className?: string;
  fullWidth?: boolean;
}

/** Controle de seleção única reutilizável (grade, filtros, estados de categoria, intervalos). */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  size = "md",
  className,
  fullWidth,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border bg-secondary p-0.5",
        fullWidth && "flex w-full",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        const Icon = opt.icon;
        const tone = opt.tone ?? "gold";
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.label}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[5px] font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-[13px]",
              fullWidth && "flex-1",
              !active && "text-muted-foreground hover:text-foreground",
              active && "bg-card text-foreground shadow-panel",
              active && tone === "gold" && "ring-1 ring-gold/70",
              active && tone === "warning" && "bg-warning-soft text-warning ring-1 ring-warning/40",
            )}
          >
            {Icon && (
              <Icon className={cn("size-3.5 shrink-0", active && tone === "gold" && "text-gold-strong")} />
            )}
            <span className={cn(opt.hideLabelOnMobile && "hidden sm:inline")}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
