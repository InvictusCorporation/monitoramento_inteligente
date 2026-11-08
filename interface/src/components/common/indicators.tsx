import { Car, Info, PawPrint, User, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import {
  CATEGORY_LABEL,
  PRIORITY_LABEL,
  STATUS_LABEL,
  type Category,
  type OccurrenceStatus,
  type Priority,
} from "@/lib/demo-data";

export const CATEGORY_ICON: Record<Category, LucideIcon> = {
  pessoa: User,
  veiculo: Car,
  animal: PawPrint,
};

export function CategoryIcon({ category, className }: { category: Category; className?: string }) {
  const Icon = CATEGORY_ICON[category];
  return <Icon className={cn("size-4", className)} aria-label={CATEGORY_LABEL[category]} />;
}

const priorityStyles: Record<Priority, string> = {
  alta: "bg-danger-soft text-danger",
  media: "bg-warning-soft text-warning",
  baixa: "bg-secondary text-muted-foreground",
};

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium",
        priorityStyles[priority],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

const statusStyles: Record<OccurrenceStatus, string> = {
  pendente: "border-warning/30 bg-warning-soft text-warning",
  em_atendimento: "border-info/30 bg-info-soft text-info",
  finalizada: "border-success/30 bg-success-soft text-success",
};

export function StatusBadge({ status, className }: { status: OccurrenceStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium",
        statusStyles[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function DemoNotice({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground",
        className,
      )}
    >
      <Info className="size-3.5" />
      Demonstração · imagens ilustrativas
    </span>
  );
}

export function StatChip({
  icon: Icon,
  children,
  tone = "default",
}: {
  icon: LucideIcon;
  children: ReactNode;
  tone?: "default" | "warning" | "info";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1 text-xs font-medium shadow-panel",
        tone === "default" && "text-foreground",
        tone === "warning" && "text-foreground [&_svg]:text-warning",
        tone === "info" && "text-foreground [&_svg]:text-info",
      )}
    >
      <Icon className="size-3.5 text-muted-foreground" />
      {children}
    </span>
  );
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={cn("text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground", className)}>
      {children}
    </h3>
  );
}
