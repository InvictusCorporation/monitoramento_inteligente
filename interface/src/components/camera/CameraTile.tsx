import { Maximize2, Pause, Play } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/common/indicators";
import { CATEGORY_LABEL, getClient, type Camera, type Occurrence } from "@/lib/demo-data";
import { CATEGORIES } from "@/lib/detection-logic";
import { useDemo } from "@/lib/demo-store";
import { SIM_DATE_LABEL, formatClock, useSimNow } from "@/lib/sim-clock";
import { cn } from "@/lib/utils";

interface CameraTileProps {
  camera: Camera;
  variant?: "main" | "secondary" | "grid";
  onExpand?: (camera: Camera) => void;
  onSelect?: (camera: Camera) => void;
  showControls?: boolean;
  className?: string;
  eager?: boolean;
}

function useActiveDetection(cameraId: string): Occurrence | undefined {
  const { occurrences } = useDemo();
  return occurrences.find((o) => o.cameraId === cameraId && o.status !== "finalizada" && o.bbox);
}

/** Tile de vídeo demonstrativo: imagem ilustrativa, rótulos, relógio simulado, play/pause e expandir. */
export function CameraTile({
  camera,
  variant = "grid",
  onExpand,
  onSelect,
  showControls = true,
  className,
  eager,
}: CameraTileProps) {
  const now = useSimNow();
  const [playing, setPlaying] = useState(true);
  const [frozenAt, setFrozenAt] = useState<number | null>(null);
  const { config } = useDemo();
  const detection = useActiveDetection(camera.id);
  const paused = CATEGORIES.filter((c) => config[camera.id]?.states[c] === "pausado");
  const client = getClient(camera.clientId);
  const big = variant === "main";

  const togglePlay = () => {
    if (playing) setFrozenAt(now);
    else setFrozenAt(null);
    setPlaying(!playing);
  };

  return (
    <div
      className={cn(
        "group relative aspect-video overflow-hidden rounded-lg bg-video text-video-foreground",
        onSelect && "cursor-pointer",
        className,
      )}
      onClick={onSelect ? () => onSelect(camera) : undefined}
    >
      <img
        src={camera.image}
        alt={`Imagem ilustrativa: ${client.name} · ${camera.location}`}
        width={1280}
        height={720}
        loading={eager ? "eager" : "lazy"}
        className={cn(
          "absolute inset-0 size-full object-cover animate-cam-drift",
          !playing && "[animation-play-state:paused] brightness-75",
        )}
      />

      {detection?.bbox && (
        <div
          className="pointer-events-none absolute rounded-sm border-2 border-gold"
          style={{
            left: `${detection.bbox.x}%`,
            top: `${detection.bbox.y}%`,
            width: `${detection.bbox.w}%`,
            height: `${detection.bbox.h}%`,
          }}
        >
          <span className="absolute -top-5 left-[-2px] flex items-center gap-1 rounded-t-sm bg-gold px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-primary-foreground">
            <CategoryIcon category={detection.category} className="size-3" />
            {CATEGORY_LABEL[detection.category]}
          </span>
        </div>
      )}

      {/* Top labels */}
      <div className={cn("scrim-top absolute inset-x-0 top-0 flex items-start gap-2", big ? "p-4 pb-10" : "p-2.5 pb-8")}>
        <div className="min-w-0">
          <div className={cn("truncate font-semibold", big ? "text-[15px]" : "text-[12.5px]")}>
            {client.name} · {camera.location}
          </div>
          <div className={cn("truncate text-video-foreground/70", big ? "text-xs" : "text-[10.5px]")}>
            {camera.code} · {camera.zone}
          </div>
        </div>
        <div className="ml-auto flex shrink-0 flex-col items-end gap-1">
          <span className="inline-flex items-center gap-1.5 rounded bg-video-overlay px-1.5 py-0.5 text-[10px] font-medium backdrop-blur-sm">
            <span className={cn("size-1.5 rounded-full bg-gold", playing && "animate-soft-pulse")} />
            Simulação
          </span>
          {paused.length > 0 && (
            <span className="rounded bg-warning px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
              {paused.map((c) => CATEGORY_LABEL[c]).join(", ")} pausado
            </span>
          )}
        </div>
      </div>

      {!playing && (
        <div className="absolute inset-0 grid place-items-center">
          <span className="rounded-md bg-video-overlay px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
            Reprodução pausada (demonstração)
          </span>
        </div>
      )}

      {/* Bottom bar */}
      <div className={cn("scrim-bottom absolute inset-x-0 bottom-0 flex items-end gap-2", big ? "p-4 pt-10" : "p-2.5 pt-8")}>
        <span className={cn("font-medium tabular-nums text-video-foreground/90", big ? "text-xs" : "text-[10.5px]")}>
          {SIM_DATE_LABEL} {formatClock(frozenAt ?? now)}
        </span>
        {showControls && (
          <div className="ml-auto flex gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="video"
              size="icon"
              className={big ? "size-8" : "size-7"}
              aria-label={playing ? "Pausar reprodução" : "Retomar reprodução"}
              onClick={togglePlay}
            >
              {playing ? <Pause /> : <Play />}
            </Button>
            {onExpand && (
              <Button
                variant="video"
                size="icon"
                className={big ? "size-8" : "size-7"}
                aria-label="Expandir câmera"
                onClick={() => onExpand(camera)}
              >
                <Maximize2 />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
