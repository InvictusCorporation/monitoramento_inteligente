import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Maximize2, Plus, Settings2, Timer } from "lucide-react";
import { useState } from "react";

import { CameraConfigSheet } from "@/components/camera/CameraConfigSheet";
import { CameraDialog } from "@/components/camera/CameraDialog";
import { CategoryIcon, DemoNotice } from "@/components/common/indicators";
import { Button } from "@/components/ui/button";
import { CAMERAS, CATEGORY_LABEL, getClient, type Camera } from "@/lib/demo-data";
import { CATEGORIES, listActivePauses } from "@/lib/detection-logic";
import { useDemo, useFilteredCameras } from "@/lib/demo-store";
import { notIntegrated } from "@/lib/not-integrated";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cameras")({
  validateSearch: (search: Record<string, unknown>): { camera?: string | undefined } => ({
    camera: typeof search["camera"] === "string" ? search["camera"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Câmeras · INVICTUS Monitoramento Inteligente" },
      { name: "description", content: "Câmeras por cliente e configuração de detecção por categoria e intervalo." },
      { property: "og:title", content: "Câmeras · INVICTUS" },
      {
        property: "og:description",
        content: "Câmeras por cliente e configuração de detecção por categoria e intervalo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CamerasPage,
});

function CamerasPage() {
  const cameras = useFilteredCameras();
  const { config } = useDemo();
  const { camera: cameraId } = Route.useSearch();
  const navigate = useNavigate({ from: "/cameras" });
  const [preview, setPreview] = useState<Camera | null>(null);

  const configuring = CAMERAS.find((c) => c.id === cameraId) ?? null;
  const pauses = listActivePauses(config).filter((p) => cameras.some((c) => c.id === p.cameraId));

  return (
    <div className="space-y-5 p-3 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-xl font-semibold tracking-tight">Câmeras</h1>
        <DemoNotice />
        <Button size="sm" className="ml-auto h-8" onClick={() => notIntegrated("Cadastro de novas câmeras")}>
          <Plus /> Adicionar câmera
        </Button>
      </div>
      <p className="-mt-2 text-[13px] text-muted-foreground">
        {cameras.length} câmeras · {pauses.length === 0 ? "nenhuma pausa ativa" : `${pauses.length} pausa(s) ativa(s)`}
        {" · "}imagens ilustrativas, sem conexão real
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {cameras.map((cam) => {
          const det = config[cam.id]!;
          return (
            <article key={cam.id} className="overflow-hidden rounded-lg border bg-card shadow-panel">
              <button
                type="button"
                onClick={() => setPreview(cam)}
                className="group relative block aspect-video w-full cursor-pointer bg-video"
                aria-label={`Visualizar ${cam.location}`}
              >
                <img src={cam.image} alt="" loading="lazy" width={640} height={360} className="size-full object-cover" />
                <span className="scrim-top absolute inset-x-0 top-0 flex items-center justify-between p-2.5 pb-6 text-[11px] text-video-foreground">
                  <span className="font-medium">{cam.code}</span>
                  <span className="rounded bg-video-overlay px-1.5 py-0.5">Simulação</span>
                </span>
                <span className="absolute right-2 bottom-2 grid size-7 place-items-center rounded-md bg-video-overlay text-video-foreground opacity-0 transition-opacity group-hover:opacity-100">
                  <Maximize2 className="size-3.5" />
                </span>
              </button>
              <div className="space-y-3 p-3.5">
                <div>
                  <h2 className="text-sm font-semibold">{cam.location}</h2>
                  <p className="text-xs text-muted-foreground">
                    {getClient(cam.clientId).name} · {cam.zone}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => {
                    const paused = det.states[c] === "pausado";
                    return (
                      <span
                        key={c}
                        className={cn(
                          "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium",
                          paused ? "bg-warning-soft text-warning" : "bg-secondary text-foreground",
                        )}
                      >
                        <CategoryIcon category={c} className="size-3" />
                        {CATEGORY_LABEL[c]}: {paused ? "Pausado" : "Detectar"}
                      </span>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Timer className="size-3.5" /> Captura a cada {det.intervalSec} s
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto h-8"
                    onClick={() => navigate({ search: { camera: cam.id } })}
                  >
                    <Settings2 /> Configurar
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <CameraConfigSheet
        camera={configuring}
        onOpenChange={(open) => !open && navigate({ search: { camera: undefined } })}
      />
      <CameraDialog camera={preview} onOpenChange={(o) => !o && setPreview(null)} />
    </div>
  );
}
