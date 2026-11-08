import { toast } from "sonner";

/** Feedback padrão para recursos que dependem da integração com o backend real. */
export function notIntegrated(feature?: string) {
  toast("Disponível após integração", {
    description: feature
      ? `${feature} será habilitado quando a plataforma for conectada ao sistema de monitoramento.`
      : "Este recurso será habilitado quando a plataforma for conectada ao sistema de monitoramento.",
  });
}
