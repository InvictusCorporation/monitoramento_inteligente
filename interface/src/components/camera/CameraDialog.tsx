import { Link } from "@tanstack/react-router";
import { Settings2 } from "lucide-react";

import { CameraTile } from "@/components/camera/CameraTile";
import { CategoryIcon, SectionLabel, StatusBadge } from "@/components/common/indicators";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CATEGORY_LABEL, DETECTION_TITLE, getClient, type Camera } from "@/lib/demo-data";
import { CATEGORIES } from "@/lib/detection-logic";
import { useDemo } from "@/lib/demo-store";
import { formatClock } from "@/lib/sim-clock";
import { cn } from "@/lib/utils";

export function CameraDialog({
  camera,
  onOpenChange,
}: {
  camera: Camera | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { config, occurrences } = useDemo();
  if (!camera) return null;
  const det = config[camera.id];
  const recent = occurrences.filter((o) => o.cameraId === camera.id).slice(0, 4);

  return (
    <Dialog open={!!camera} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-5xl overflow-y-auto p-0 sm:rounded-lg">
        <div className="grid lg:grid-cols-[1fr_280px]">
          <div className="bg-video p-2 sm:p-3">
            <CameraTile camera={camera} variant="main" eager />
          </div>
          <div className="space-y-5 p-5">
            <DialogHeader className="text-left">
              <DialogTitle className="text-base">
                {getClient(camera.clientId).name} · {camera.location}
              </DialogTitle>
              <DialogDescription>
                {camera.code} · {camera.zone} · imagem ilustrativa
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <SectionLabel>Detecção</SectionLabel>
              <ul className="space-y-1.5">
                {CATEGORIES.map((c) => {
                  const p = det?.states[c] === "pausado";
                  return (
                    <li key={c} className="flex items-center gap-2 text-sm">
                      <CategoryIcon category={c} className="text-muted-foreground" />
                      {CATEGORY_LABEL[c]}
                      <span
                        className={cn(
                          "ml-auto rounded px-1.5 py-0.5 text-[11px] font-medium",
                          p ? "bg-warning-soft text-warning" : "bg-success-soft text-success",
                        )}
                      >
                        {p ? "Pausado" : "Detectar"}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-muted-foreground">Intervalo entre capturas: {det?.intervalSec ?? 15} s (simulado)</p>
            </div>

            <div className="space-y-2">
              <SectionLabel>Ocorrências recentes</SectionLabel>
              {recent.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma ocorrência.</p>}
              <ul className="space-y-1.5">
                {recent.map((o) => (
                  <li key={o.id} className="flex items-center gap-2 text-[13px]">
                    <CategoryIcon category={o.category} className="text-muted-foreground" />
                    <span className="truncate">{DETECTION_TITLE[o.category]}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{formatClock(o.captureAt, false)}</span>
                    <StatusBadge status={o.status} className="ml-auto" />
                  </li>
                ))}
              </ul>
            </div>

            <Button asChild variant="outline" className="w-full">
              <Link to="/cameras" search={{ camera: camera.id }} onClick={() => onOpenChange(false)}>
                <Settings2 /> Configurar câmera
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
