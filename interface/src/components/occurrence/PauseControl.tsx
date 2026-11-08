import { PauseCircle, PlayCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SectionLabel } from "@/components/common/indicators";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABEL, cameraLabel, getCamera, type Category } from "@/lib/demo-data";
import { useDemo } from "@/lib/demo-store";
import { formatClock } from "@/lib/sim-clock";

/** Pausa explícita e separada do atendimento: por categoria + câmera, com Reativar. */
export function PauseControl({ cameraId, category }: { cameraId: string; category: Category }) {
  const { config, setCategory } = useDemo();
  const [confirm, setConfirm] = useState(false);
  const det = config[cameraId];
  const paused = det?.states[category] === "pausado";
  const label = CATEGORY_LABEL[category];
  const camName = cameraLabel(getCamera(cameraId));

  return (
    <div className="space-y-2.5 rounded-lg border border-dashed p-3">
      <SectionLabel>Pausa de detecção · ação separada</SectionLabel>
      {!paused ? (
        <>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Pausar <strong className="text-foreground">{label}</strong> em {camName} interrompe novos avisos desta
            categoria nesta câmera e <strong className="text-foreground">também bloqueia novos alvos</strong> até
            você reativar.
          </p>
          <Button variant="outline" size="sm" className="w-full" onClick={() => setConfirm(true)}>
            <PauseCircle /> Pausar {label.toLowerCase()} nesta câmera
          </Button>
        </>
      ) : (
        <>
          <div className="rounded-md bg-warning-soft p-2.5 text-xs leading-relaxed text-warning">
            <strong>{label} pausado</strong> nesta câmera desde {formatClock(det.pausedAt[category] ?? 0)}. Novos
            alvos desta categoria estão bloqueados.
          </div>
          <Button
            variant="graphite"
            size="sm"
            className="w-full"
            onClick={() => {
              setCategory(cameraId, category, "detectar");
              toast.success(`${label} reativado em ${camName}`);
            }}
          >
            <PlayCircle /> Reativar detecção de {label.toLowerCase()}
          </Button>
        </>
      )}

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pausar {label.toLowerCase()} nesta câmera?</AlertDialogTitle>
            <AlertDialogDescription>
              {camName}: novos avisos de {label.toLowerCase()} deixam de ser gerados e novos alvos também ficam
              bloqueados. As demais categorias e câmeras continuam detectando. Você pode reativar a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setCategory(cameraId, category, "pausado");
                toast(`${label} pausado em ${camName}`, { description: "Novos alvos bloqueados até reativar." });
              }}
            >
              Pausar detecção
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
