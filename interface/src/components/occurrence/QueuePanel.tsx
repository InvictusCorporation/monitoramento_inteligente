import { ArrowLeft, Inbox, PlayCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CategoryIcon, SectionLabel } from "@/components/common/indicators";
import { Segmented } from "@/components/common/Segmented";
import { OccurrenceCard } from "@/components/occurrence/OccurrenceCard";
import { OccurrenceDetail } from "@/components/occurrence/OccurrenceDetail";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABEL, cameraLabel, getCamera } from "@/lib/demo-data";
import { listActivePauses } from "@/lib/detection-logic";
import { useDemo, useFilteredOccurrences } from "@/lib/demo-store";
import { formatClock } from "@/lib/sim-clock";
import { cn } from "@/lib/utils";

type QueueFilter = "pendente" | "em_atendimento";

/** Coluna de atendimento: lista filtrável + detalhe da ocorrência selecionada + pausas ativas. */
export function QueuePanel({ className }: { className?: string }) {
  const { selectedOccurrenceId, selectOccurrence, occurrences, config, setCategory } = useDemo();
  const filtered = useFilteredOccurrences();
  const [filter, setFilter] = useState<QueueFilter>("pendente");

  const selected = occurrences.find((o) => o.id === selectedOccurrenceId);
  const pending = filtered.filter((o) => o.status === "pendente");
  const inService = filtered.filter((o) => o.status === "em_atendimento");
  const list = filter === "pendente" ? pending : inService;
  const pauses = listActivePauses(config);

  if (selected) {
    return (
      <div className={cn("flex min-h-0 flex-col", className)}>
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Button variant="ghost" size="sm" className="-ml-2" onClick={() => selectOccurrence(null)}>
            <ArrowLeft /> Voltar à fila
          </Button>
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
          <OccurrenceDetail occurrence={selected} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="space-y-3 border-b px-4 pt-4 pb-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[15px] font-semibold">Fila de atendimento</h2>
          <span className="text-xs text-muted-foreground">{pending.length + inService.length} abertas</span>
        </div>
        <Segmented<QueueFilter>
          ariaLabel="Filtrar fila"
          fullWidth
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "pendente", label: `Pendentes (${pending.length})` },
            { value: "em_atendimento", label: `Em atendimento (${inService.length})` },
          ]}
        />
      </div>

      <div className="scrollbar-thin flex-1 space-y-2 overflow-y-auto p-3">
        {list.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
            <Inbox className="size-6" />
            {filter === "pendente" ? "Nenhuma ocorrência pendente." : "Nenhum atendimento em andamento."}
          </div>
        )}
        {list.map((o) => (
          <OccurrenceCard key={o.id} occurrence={o} onSelect={selectOccurrence} />
        ))}
      </div>

      {pauses.length > 0 && (
        <div className="space-y-2 border-t bg-warning-soft/50 p-3">
          <SectionLabel>Pausas ativas ({pauses.length})</SectionLabel>
          {pauses.map((p) => (
            <div key={`${p.cameraId}-${p.category}`} className="flex items-center gap-2 text-xs">
              <CategoryIcon category={p.category} className="size-3.5 text-warning" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">
                  {CATEGORY_LABEL[p.category]} · {cameraLabel(getCamera(p.cameraId))}
                </div>
                <div className="text-muted-foreground">desde {formatClock(p.since)} · novos alvos bloqueados</div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 bg-card px-2 text-xs"
                onClick={() => {
                  setCategory(p.cameraId, p.category, "detectar");
                  toast.success(`${CATEGORY_LABEL[p.category]} reativado`);
                }}
              >
                <PlayCircle /> Reativar
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
