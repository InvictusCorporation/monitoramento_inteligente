import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  Cctv,
  ChevronDown,
  Focus,
  Grid2x2,
  Grid3x3,
  Headset,
  ListChecks,
  Maximize,
  Minimize,
  Plus,
  Radar,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { CameraDialog } from "@/components/camera/CameraDialog";
import { CameraTile } from "@/components/camera/CameraTile";
import { CategoryIcon, DemoNotice, StatChip } from "@/components/common/indicators";
import { Segmented } from "@/components/common/Segmented";
import { QueuePanel } from "@/components/occurrence/QueuePanel";
import { EventTimeline } from "@/components/timeline/EventTimeline";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/use-media-query";
import { CATEGORY_LABEL, cameraLabel, getClient, type Camera, type Category } from "@/lib/demo-data";
import { CATEGORIES, summarize } from "@/lib/detection-logic";
import { useDemo, useFilteredCameras, useFilteredOccurrences } from "@/lib/demo-store";
import { notIntegrated } from "@/lib/not-integrated";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Visão ao vivo · INVICTUS Monitoramento Inteligente" },
      {
        name: "description",
        content: "Central de operação INVICTUS: câmeras ao vivo, fila de atendimento e linha do tempo de eventos.",
      },
      { property: "og:title", content: "Visão ao vivo · INVICTUS" },
      {
        property: "og:description",
        content: "Central de operação INVICTUS: câmeras ao vivo, fila de atendimento e linha do tempo de eventos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LiveView,
});

type GridMode = "foco" | "4" | "9";

function EmptySlot({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => notIntegrated("Adicionar câmera à grade")}
      className={cn(
        "flex aspect-video cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-input bg-card/60 text-xs text-muted-foreground hover:border-gold/60",
        className,
      )}
    >
      <Plus className="size-4" />
      Espaço livre
      <span className="text-[10.5px]">Disponível após integração</span>
    </button>
  );
}

function LiveView() {
  const cameras = useFilteredCameras();
  const occurrences = useFilteredOccurrences();
  const { selectedOccurrenceId, selectOccurrence, simulate, clientId } = useDemo();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  const [mode, setMode] = useState<GridMode>("foco");
  const [mainId, setMainId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Camera | null>(null);
  const [queueOpen, setQueueOpen] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const [nativeFull, setNativeFull] = useState(false);
  const [pseudoFull, setPseudoFull] = useState(false);
  const isFull = nativeFull || pseudoFull;

  const main = (cameras.find((c) => c.id === mainId) ?? cameras[0])!;
  const others = cameras.filter((c) => c.id !== main.id);
  const summary = summarize(occurrences);

  useEffect(() => {
    const onChange = () => setNativeFull(document.fullscreenElement === gridRef.current);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPseudoFull(false);
    document.addEventListener("fullscreenchange", onChange);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const enterFull = async () => {
    const el = gridRef.current;
    if (el?.requestFullscreen) {
      try {
        await el.requestFullscreen();
        return;
      } catch {
        /* sem suporte: usa modo sobreposto */
      }
    }
    setPseudoFull(true);
  };
  const exitFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    setPseudoFull(false);
  };

  const focusCamera = (cam: Camera) => {
    setMainId(cam.id);
    setMode("foco");
  };

  const runSimulation = (category: Category) => {
    const r = simulate(main.id, category);
    if (r.blocked) {
      toast.warning(`Novo alvo bloqueado: ${CATEGORY_LABEL[category]} está pausado`, {
        description: `${cameraLabel(main)} · reative para voltar a gerar avisos.`,
      });
    } else {
      toast.success(`Nova ocorrência simulada: ${r.occurrence.code}`, {
        description: `${CATEGORY_LABEL[category]} · ${cameraLabel(main)}`,
      });
    }
  };

  const openOccurrence = (id: string) => {
    selectOccurrence(id);
    if (isDesktop === false) setQueueOpen(true);
  };

  const fill = (n: number) => Array.from({ length: Math.max(0, n) });

  const grid = (() => {
    if (mode === "foco") {
      const sec = others.slice(0, 2);
      return (
        <div className="grid grid-cols-[2fr_1fr] gap-3">
          <CameraTile camera={main} variant="main" onExpand={setExpanded} className="row-span-2" eager />
          {sec.map((cam) => (
            <CameraTile key={cam.id} camera={cam} variant="secondary" onExpand={setExpanded} onSelect={focusCamera} eager />
          ))}
          {fill(2 - sec.length).map((_, i) => (
            <EmptySlot key={i} />
          ))}
        </div>
      );
    }
    const n = mode === "4" ? 4 : 9;
    const list = cameras.slice(0, n);
    return (
      <div className={cn("grid gap-3", mode === "4" ? "grid-cols-2" : "grid-cols-3")}>
        {list.map((cam) => (
          <CameraTile key={cam.id} camera={cam} onExpand={setExpanded} onSelect={focusCamera} />
        ))}
        {fill(n - list.length).map((_, i) => (
          <EmptySlot key={i} />
        ))}
      </div>
    );
  })();

  const simulateMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 bg-card">
          <Radar /> <span className="hidden sm:inline">Simular detecção</span>
          <ChevronDown className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Gera um evento local em {cameraLabel(main)}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {CATEGORIES.map((c) => (
          <DropdownMenuItem key={c} onSelect={() => runSimulation(c)}>
            <CategoryIcon category={c} /> {CATEGORY_LABEL[c]} na câmera principal
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="flex lg:h-[calc(100dvh-3.5rem)]">
      <section className="scrollbar-thin min-w-0 flex-1 space-y-4 p-3 sm:p-5 lg:overflow-y-auto">
        {/* Cabeçalho da página */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-xl font-semibold tracking-tight">Visão ao vivo</h1>
            <DemoNotice />
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden md:block">
                <Segmented<GridMode>
                  ariaLabel="Layout da grade"
                  size="sm"
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: "foco", label: "Foco", icon: Focus },
                    { value: "4", label: "4", icon: Grid2x2 },
                    { value: "9", label: "9", icon: Grid3x3 },
                  ]}
                />
              </div>
              <Button variant="outline" size="sm" className="hidden h-8 bg-card md:inline-flex" onClick={enterFull}>
                <Maximize /> Tela cheia
              </Button>
              {simulateMenu}
              <Button
                size="sm"
                variant="graphite"
                className="hidden h-8 md:inline-flex lg:hidden"
                onClick={() => setQueueOpen(true)}
              >
                <ListChecks /> Fila ({summary.open})
              </Button>
            </div>
          </div>
          <div className="scrollbar-thin -mx-3 flex gap-2 overflow-x-auto px-3 pb-0.5 sm:mx-0 sm:flex-wrap sm:px-0">
            <StatChip icon={Cctv}>
              {cameras.length} {cameras.length === 1 ? "câmera disponível" : "câmeras disponíveis"}
            </StatChip>
            <StatChip icon={Bell} tone="warning">
              {summary.open} {summary.open === 1 ? "ocorrência aberta" : "ocorrências abertas"}
            </StatChip>
            <StatChip icon={Headset} tone="info">
              {summary.inService} em atendimento
            </StatChip>
            {clientId !== "todos" && (
              <span className="inline-flex items-center px-1 text-xs text-muted-foreground">
                Filtro: {getClient(clientId).name}
              </span>
            )}
          </div>
        </div>

        {/* Grade (tablet/desktop) */}
        <div
          ref={gridRef}
          className={cn(
            isFull ? "flex flex-col justify-center overflow-auto bg-video p-4" : "hidden md:block",
            pseudoFull && "fixed inset-0 z-50",
          )}
        >
          {isFull && (
            <div className="mx-auto mb-3 flex w-full items-center gap-3 text-video-foreground" style={{ maxWidth: mode === "foco" ? "calc((100dvh - 6rem) * 8 / 3)" : "calc((100dvh - 6rem) * 16 / 9)" }}>
              <span className="text-sm font-semibold">Visão ao vivo · tela cheia</span>
              <span className="text-xs text-video-foreground/60">Demonstração · imagens ilustrativas</span>
              <div className="ml-auto flex items-center gap-2">
                {(["foco", "4", "9"] as GridMode[]).map((m) => (
                  <Button key={m} variant="video" size="sm" className={cn(mode === m && "ring-1 ring-gold")} onClick={() => setMode(m)}>
                    {m === "foco" ? "Foco" : m}
                  </Button>
                ))}
                <Button variant="video" size="sm" onClick={exitFull}>
                  <Minimize /> Sair
                </Button>
              </div>
            </div>
          )}
          <div
            className={cn(isFull && "mx-auto w-full")}
            style={isFull ? { maxWidth: mode === "foco" ? "calc((100dvh - 6rem) * 8 / 3)" : "calc((100dvh - 6rem) * 16 / 9)" } : undefined}
          >
            {grid}
          </div>
        </div>

        {/* Celular: foco em uma câmera */}
        <div className="space-y-3 md:hidden">
          <CameraTile camera={main} variant="main" onExpand={setExpanded} eager />
          <div className="scrollbar-thin -mx-3 flex gap-2 overflow-x-auto px-3">
            {cameras.map((cam) => (
              <button
                key={cam.id}
                type="button"
                onClick={() => setMainId(cam.id)}
                aria-pressed={cam.id === main.id}
                className={cn(
                  "w-[112px] shrink-0 cursor-pointer overflow-hidden rounded-md border bg-card text-left",
                  cam.id === main.id && "border-gold ring-1 ring-gold",
                )}
              >
                <img src={cam.image} alt="" loading="lazy" width={224} height={126} className="aspect-video w-full object-cover" />
                <div className="truncate px-1.5 py-1 text-[10.5px] font-medium">{cam.location}</div>
              </button>
            ))}
          </div>
          <Button variant="graphite" className="h-11 w-full justify-between" onClick={() => setQueueOpen(true)}>
            <span className="flex items-center gap-2">
              <ListChecks /> Fila de atendimento
            </span>
            <span className="rounded bg-gold px-2 py-0.5 text-xs font-semibold text-primary-foreground">
              {summary.pending} pendentes
            </span>
          </Button>
        </div>

        <EventTimeline occurrences={occurrences} selectedId={selectedOccurrenceId} onSelect={openOccurrence} />
      </section>

      {/* Coluna de atendimento (desktop) */}
      <aside className="hidden w-[360px] shrink-0 border-l bg-card lg:flex xl:w-[380px]">
        <QueuePanel className="w-full" />
      </aside>

      {/* Fila em drawer (celular/tablet) */}
      <Drawer open={queueOpen && isDesktop === false} onOpenChange={setQueueOpen}>
        <DrawerContent className="h-[86dvh]">
          <DrawerTitle className="sr-only">Fila de atendimento</DrawerTitle>
          <DrawerDescription className="sr-only">Ocorrências pendentes e em atendimento</DrawerDescription>
          <QueuePanel className="min-h-0 flex-1" />
        </DrawerContent>
      </Drawer>

      <CameraDialog camera={expanded} onOpenChange={(o) => !o && setExpanded(null)} />
    </div>
  );
}
