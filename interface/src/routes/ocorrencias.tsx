import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MousePointerClick, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { CategoryIcon, DemoNotice, PriorityBadge, StatusBadge } from "@/components/common/indicators";
import { Segmented } from "@/components/common/Segmented";
import { OccurrenceCard } from "@/components/occurrence/OccurrenceCard";
import { OccurrenceDetail } from "@/components/occurrence/OccurrenceDetail";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/use-media-query";
import { DETECTION_TITLE, getCamera, getClient, type Category, type OccurrenceStatus } from "@/lib/demo-data";
import { useFilteredOccurrences } from "@/lib/demo-store";
import { formatClock } from "@/lib/sim-clock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ocorrencias")({
  validateSearch: (search: Record<string, unknown>): { id?: string | undefined } => ({
    id: typeof search["id"] === "string" ? search["id"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Ocorrências · INVICTUS Monitoramento Inteligente" },
      { name: "description", content: "Lista e detalhe das ocorrências de detecção com atendimento e observações." },
      { property: "og:title", content: "Ocorrências · INVICTUS" },
      {
        property: "og:description",
        content: "Lista e detalhe das ocorrências de detecção com atendimento e observações.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OccurrencesPage,
});

type StatusFilter = OccurrenceStatus | "todas";
type CategoryFilter = Category | "todas";

function OccurrencesPage() {
  const all = useFilteredOccurrences();
  const { id } = Route.useSearch();
  const navigate = useNavigate({ from: "/ocorrencias" });
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [status, setStatus] = useState<StatusFilter>("todas");
  const [category, setCategory] = useState<CategoryFilter>("todas");
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter((o) => status === "todas" || o.status === status)
      .filter((o) => category === "todas" || o.category === category)
      .filter((o) => {
        if (!q) return true;
        const cam = getCamera(o.cameraId);
        return `${o.code} ${DETECTION_TITLE[o.category]} ${getClient(cam.clientId).name} ${cam.location}`
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => b.captureAt - a.captureAt);
  }, [all, status, category, query]);

  const selected = all.find((o) => o.id === id);
  const select = (oid: string | undefined) => navigate({ search: { id: oid } });
  const count = (s: OccurrenceStatus) => all.filter((o) => o.status === s).length;

  return (
    <div className="lg:grid lg:h-[calc(100dvh-3.5rem)] lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_440px]">
      <section className="scrollbar-thin min-w-0 space-y-4 p-3 sm:p-5 lg:overflow-y-auto">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-xl font-semibold tracking-tight">Ocorrências</h1>
          <DemoNotice />
        </div>

        <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
          <div className="scrollbar-thin -mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
            <Segmented<StatusFilter>
              ariaLabel="Filtrar por status"
              size="sm"
              value={status}
              onChange={setStatus}
              options={[
                { value: "todas", label: `Todas (${all.length})` },
                { value: "pendente", label: `Pendentes (${count("pendente")})` },
                { value: "em_atendimento", label: `Em atendimento (${count("em_atendimento")})` },
                { value: "finalizada", label: `Finalizadas (${count("finalizada")})` },
              ]}
            />
          </div>
          <div className="flex gap-2 xl:ml-auto">
            <Segmented<CategoryFilter>
              ariaLabel="Filtrar por categoria"
              size="sm"
              value={category}
              onChange={setCategory}
              options={[
                { value: "todas", label: "Todas" },
                { value: "pessoa", label: "Pessoa" },
                { value: "veiculo", label: "Veículo" },
                { value: "animal", label: "Animal" },
              ]}
            />
            <div className="relative min-w-0 flex-1 xl:w-56 xl:flex-none">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar"
                aria-label="Buscar ocorrências"
                className="h-8 bg-card pl-8 text-[13px]"
              />
            </div>
          </div>
        </div>

        {/* Lista desktop */}
        <div className="hidden overflow-hidden rounded-lg border bg-card shadow-panel md:block">
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_90px_80px_120px] gap-3 border-b bg-secondary/60 px-4 py-2.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            <span>Ocorrência</span>
            <span>Câmera</span>
            <span>Captura</span>
            <span>Prioridade</span>
            <span>Status</span>
          </div>
          {list.map((o) => {
            const cam = getCamera(o.cameraId);
            const sel = o.id === id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => select(o.id)}
                className={cn(
                  "relative grid w-full cursor-pointer grid-cols-[minmax(0,2fr)_minmax(0,2fr)_90px_80px_120px] items-center gap-3 border-b px-4 py-2.5 text-left text-[13px] last:border-0 hover:bg-secondary/50",
                  sel && "bg-gold-soft hover:bg-gold-soft",
                )}
              >
                {sel && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r bg-gold" />}
                <span className="flex min-w-0 items-center gap-3">
                  <img src={cam.image} alt="" loading="lazy" width={96} height={54} className="h-9 w-16 shrink-0 rounded object-cover" />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 truncate font-medium">
                      <CategoryIcon category={o.category} className="size-3.5 text-muted-foreground" />
                      {DETECTION_TITLE[o.category]}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{o.code}</span>
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate">{getClient(cam.clientId).name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {cam.location} · {cam.code}
                  </span>
                </span>
                <span className="tabular-nums">{formatClock(o.captureAt)}</span>
                <span>
                  <PriorityBadge priority={o.priority} />
                </span>
                <span>
                  <StatusBadge status={o.status} />
                </span>
              </button>
            );
          })}
          {list.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma ocorrência encontrada.</p>}
        </div>

        {/* Lista celular */}
        <div className="space-y-2 md:hidden">
          {list.map((o) => (
            <OccurrenceCard key={o.id} occurrence={o} selected={o.id === id} onSelect={select} showStatus />
          ))}
          {list.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma ocorrência encontrada.</p>}
        </div>
      </section>

      {/* Detalhe desktop */}
      <aside className="scrollbar-thin hidden border-l bg-card lg:block lg:overflow-y-auto">
        {selected ? (
          <div className="p-5">
            <OccurrenceDetail occurrence={selected} />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
            <MousePointerClick className="size-6" />
            Selecione uma ocorrência para ver imagem, horários, motivo e atendimento.
          </div>
        )}
      </aside>

      {/* Detalhe celular/tablet */}
      <Drawer open={!!selected && isDesktop === false} onOpenChange={(o) => !o && select(undefined)}>
        <DrawerContent className="h-[90dvh]">
          <DrawerTitle className="sr-only">Detalhe da ocorrência</DrawerTitle>
          <DrawerDescription className="sr-only">Imagem, horários, motivo e atendimento</DrawerDescription>
          <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
            {selected && <OccurrenceDetail occurrence={selected} />}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
