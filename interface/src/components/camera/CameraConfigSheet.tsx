import { Ban, Check, Info, PauseCircle, PlugZap, ScanEye } from "lucide-react";
import { toast } from "sonner";

import { CategoryIcon, SectionLabel } from "@/components/common/indicators";
import { Segmented } from "@/components/common/Segmented";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CATEGORY_LABEL, getClient, type Camera, type Category } from "@/lib/demo-data";
import { CATEGORIES, INTERVAL_OPTIONS, type CategoryState, type IntervalSec } from "@/lib/detection-logic";
import { useDemo } from "@/lib/demo-store";
import { notIntegrated } from "@/lib/not-integrated";
import { formatClock } from "@/lib/sim-clock";

const CATEGORY_HINT: Record<Category, string> = {
  pessoa: "Silhueta de pessoa na imagem",
  veiculo: "Carros, motos e caminhões",
  animal: "Cães, gatos e outros animais",
};

export const ANALYSIS_LIMITS = [
  "Identificação facial — não realizada",
  "Leitura de placas — não realizada",
  "Inferência de criminalidade ou intenção — não realizada",
  "Detecção de furto — não implementada",
];

export function CameraConfigSheet({
  camera,
  onOpenChange,
}: {
  camera: Camera | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { config, setCategory, setInterval } = useDemo();
  const det = camera ? config[camera.id] : undefined;

  return (
    <Sheet open={!!camera} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        {camera && det && (
          <>
            <SheetHeader className="border-b p-5 text-left">
              <SheetTitle className="text-base">Configuração da câmera</SheetTitle>
              <SheetDescription>
                {getClient(camera.clientId).name} · {camera.location} · {camera.code}
              </SheetDescription>
              <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded bg-gold-soft px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
                <Info className="size-3.5" /> Configuração demo · alterações aplicadas localmente
              </span>
            </SheetHeader>

            <div className="scrollbar-thin flex-1 space-y-6 overflow-y-auto p-5">
              <img
                src={camera.image}
                alt={`Imagem ilustrativa: ${camera.location}`}
                width={1280}
                height={720}
                className="aspect-video w-full rounded-lg bg-video object-cover"
              />

              <section className="space-y-3">
                <SectionLabel>Detecção por categoria</SectionLabel>
                <p className="text-xs text-muted-foreground">
                  Escolha um estado por categoria. <strong className="text-foreground">Pausado</strong> também bloqueia
                  novos alvos desta categoria nesta câmera.
                </p>
                <ul className="divide-y rounded-lg border">
                  {CATEGORIES.map((c) => {
                    const state = det.states[c];
                    return (
                      <li key={c} className="flex flex-wrap items-center gap-3 p-3">
                        <span className="grid size-8 place-items-center rounded-md bg-secondary">
                          <CategoryIcon category={c} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{CATEGORY_LABEL[c]}</div>
                          <div className="text-[11.5px] text-muted-foreground">
                            {state === "pausado"
                              ? `Pausado desde ${formatClock(det.pausedAt[c] ?? 0)}`
                              : CATEGORY_HINT[c]}
                          </div>
                        </div>
                        <Segmented<CategoryState>
                          ariaLabel={`Estado de ${CATEGORY_LABEL[c]}`}
                          size="sm"
                          value={state}
                          onChange={(v) => setCategory(camera.id, c, v)}
                          options={[
                            { value: "detectar", label: "Detectar", icon: ScanEye },
                            { value: "pausado", label: "Pausado", icon: PauseCircle, tone: "warning" },
                          ]}
                        />
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className="space-y-3">
                <SectionLabel>Intervalo entre capturas</SectionLabel>
                <Segmented<IntervalSec>
                  ariaLabel="Intervalo entre capturas"
                  fullWidth
                  value={det.intervalSec}
                  onChange={(v) => setInterval(camera.id, v)}
                  options={INTERVAL_OPTIONS.map((s) => ({ value: s, label: `${s} segundos` }))}
                />
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Info className="mt-0.5 size-3.5 shrink-0" />
                  Intervalo entre capturas; processamento pode acrescentar espera. Simulação local.
                </p>
              </section>

              <section className="space-y-3">
                <SectionLabel>Conexão</SectionLabel>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" htmlFor="stream">
                    Endereço do fluxo de vídeo
                  </label>
                  <Input id="stream" disabled placeholder="Disponível após integração" className="bg-secondary" />
                </div>
                <Button variant="outline" size="sm" onClick={() => notIntegrated("Teste de conexão com a câmera")}>
                  <PlugZap /> Testar conexão
                </Button>
              </section>

              <section className="space-y-2 rounded-lg bg-secondary/70 p-3">
                <SectionLabel>Limites da análise</SectionLabel>
                <ul className="space-y-1.5">
                  {ANALYSIS_LIMITS.map((l) => (
                    <li key={l} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Ban className="size-3.5 shrink-0" />
                      {l}
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <div className="flex gap-2 border-t p-4">
              <Button
                className="flex-1"
                onClick={() => {
                  toast.success("Configuração demonstrativa salva localmente");
                  onOpenChange(false);
                }}
              >
                <Check /> Concluir
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
