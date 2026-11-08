import { CategoryIcon, PriorityBadge, StatusBadge } from "@/components/common/indicators";
import { DETECTION_TITLE, getCamera, getClient, type Occurrence } from "@/lib/demo-data";
import { formatClock, formatRelative, useSimNow } from "@/lib/sim-clock";
import { cn } from "@/lib/utils";

export function OccurrenceCard({
  occurrence,
  selected,
  onSelect,
  showStatus,
}: {
  occurrence: Occurrence;
  selected?: boolean;
  onSelect: (id: string) => void;
  showStatus?: boolean;
}) {
  const now = useSimNow();
  const cam = getCamera(occurrence.cameraId);
  return (
    <button
      type="button"
      onClick={() => onSelect(occurrence.id)}
      aria-pressed={selected}
      className={cn(
        "relative flex w-full cursor-pointer gap-3 rounded-lg border bg-card p-2.5 text-left transition-colors hover:border-gold/50",
        selected && "border-gold/70 bg-gold-soft",
      )}
    >
      {selected && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-gold" />}
      <div className="relative h-14 w-[84px] shrink-0 overflow-hidden rounded-md bg-video">
        <img src={cam.image} alt="" loading="lazy" width={168} height={112} className="size-full object-cover" />
        <span className="absolute bottom-1 left-1 grid size-5 place-items-center rounded bg-video-overlay text-video-foreground">
          <CategoryIcon category={occurrence.category} className="size-3" />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-semibold">{DETECTION_TITLE[occurrence.category]}</span>
          <PriorityBadge priority={occurrence.priority} className="ml-auto shrink-0" />
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {getClient(cam.clientId).name} · {cam.location}
        </div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="tabular-nums">{formatClock(occurrence.captureAt)}</span>
          <span>·</span>
          <span>{formatRelative(now, occurrence.captureAt)}</span>
          {showStatus && <StatusBadge status={occurrence.status} className="ml-auto" />}
          {!showStatus && occurrence.status === "em_atendimento" && (
            <span className="ml-auto truncate text-info">{occurrence.operator}</span>
          )}
        </div>
      </div>
    </button>
  );
}
