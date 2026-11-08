import { CheckCircle2, Hand, ShieldOff } from "lucide-react";
import { toast } from "sonner";

import { CategoryIcon, PriorityBadge, SectionLabel, StatusBadge } from "@/components/common/indicators";
import { PauseControl } from "@/components/occurrence/PauseControl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORY_LABEL, DETECTION_TITLE, OPERATOR, getCamera, getClient, type Occurrence } from "@/lib/demo-data";
import { useDemo } from "@/lib/demo-store";
import { SIM_DATE_LABEL, formatClock } from "@/lib/sim-clock";

export function OccurrenceDetail({ occurrence }: { occurrence: Occurrence }) {
  const { assume, finalize, updateNote, config } = useDemo();
  const cam = getCamera(occurrence.cameraId);
  const client = getClient(cam.clientId);
  const o = occurrence;

  return (
    <div className="space-y-4">
      {/* Captura */}
      <figure className="relative aspect-video overflow-hidden rounded-lg bg-video text-video-foreground">
        <img
          src={cam.image}
          alt={`Captura ilustrativa: ${client.name} · ${cam.location}`}
          width={1280}
          height={720}
          className="absolute inset-0 size-full object-cover"
        />
        {o.bbox && (
          <div
            className="absolute rounded-sm border-2 border-gold"
            style={{ left: `${o.bbox.x}%`, top: `${o.bbox.y}%`, width: `${o.bbox.w}%`, height: `${o.bbox.h}%` }}
          >
            <span className="absolute -top-5 left-[-2px] rounded-t-sm bg-gold px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-primary-foreground">
              {CATEGORY_LABEL[o.category]} · {Math.round(o.confidence * 100)}%
            </span>
          </div>
        )}
        <figcaption className="scrim-bottom absolute inset-x-0 bottom-0 flex items-end justify-between p-2.5 pt-8 text-[11px]">
          <span className="font-medium">
            {cam.code} · {cam.location}
          </span>
          <span className="tabular-nums text-video-foreground/85">
            {SIM_DATE_LABEL} {formatClock(o.captureAt)}
          </span>
        </figcaption>
      </figure>

      {/* Título */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md bg-secondary">
            <CategoryIcon category={o.category} />
          </span>
          <h2 className="text-base font-semibold">{DETECTION_TITLE[o.category]}</h2>
          <span className="text-xs text-muted-foreground">{o.code}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={o.status} />
          <PriorityBadge priority={o.priority} />
          {o.simulated && (
            <span className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground">Evento simulado</span>
          )}
        </div>
      </div>

      {/* Dados */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg bg-secondary/60 p-3 text-[13px]">
        <div className="col-span-2">
          <dt className="text-[11px] text-muted-foreground">Câmera</dt>
          <dd className="font-medium">
            {client.name} · {cam.location} <span className="text-muted-foreground">({cam.code})</span>
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">Captura (simulada)</dt>
          <dd className="font-medium tabular-nums">{formatClock(o.captureAt)}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">Aviso (simulado)</dt>
          <dd className="font-medium tabular-nums">{formatClock(o.alertAt)}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">Responsável</dt>
          <dd className="font-medium">{o.operator ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">Intervalo de captura</dt>
          <dd className="font-medium">{config[o.cameraId]?.intervalSec ?? 15} s</dd>
        </div>
      </dl>

      <div className="space-y-1.5">
        <SectionLabel>Motivo</SectionLabel>
        <p className="text-[13px] leading-relaxed">{o.reason}</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`note-${o.id}`}>
          <SectionLabel>Observação</SectionLabel>
        </label>
        <Textarea
          id={`note-${o.id}`}
          value={o.note}
          onChange={(e) => updateNote(o.id, e.target.value)}
          placeholder="Registre o que foi verificado (salvo localmente nesta demonstração)"
          className="min-h-[72px] bg-card text-[13px]"
        />
      </div>

      {/* Atendimento */}
      {o.status !== "finalizada" ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              disabled={o.status !== "pendente"}
              onClick={() => {
                assume(o.id);
                toast.success(`Atendimento assumido: ${o.code}`, { description: `Responsável: ${OPERATOR.name}` });
              }}
            >
              <Hand /> {o.status === "pendente" ? "Assumir atendimento" : "Assumido"}
            </Button>
            <Button
              variant={o.status === "em_atendimento" ? "graphite" : "outline"}
              onClick={() => {
                finalize(o.id);
                toast.success(`Ocorrência ${o.code} finalizada`, {
                  description: "A detecção desta câmera continua ativa.",
                });
              }}
            >
              <CheckCircle2 /> Finalizar
            </Button>
          </div>
          <p className="text-[11.5px] text-muted-foreground">
            Finalizar encerra esta ocorrência. A detecção da câmera continua ativa — para interromper, use a pausa
            abaixo.
          </p>
        </div>
      ) : (
        <div className="rounded-md bg-success-soft p-2.5 text-xs text-success">
          Finalizada às {formatClock(o.finishedAt ?? 0)} por {o.operator}. Detecção da câmera segue ativa.
        </div>
      )}

      <PauseControl cameraId={o.cameraId} category={o.category} />

      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
        <ShieldOff className="mt-0.5 size-3.5 shrink-0" />
        Sem identificação facial, leitura de placas ou inferências sobre criminalidade. A detecção indica apenas a
        categoria do objeto.
      </p>
    </div>
  );
}
