import type { BBox, Category, Occurrence, Priority } from "./demo-data";

/**
 * Regras de atendimento e detecção da demonstração (estado local, sem backend).
 * - Toda câmera começa com todas as categorias em "detectar" (nunca inicia pausada).
 * - Finalizar uma ocorrência não altera a detecção.
 * - Pausar é uma ação separada por câmera + categoria e também bloqueia novos alvos.
 */

export type CategoryState = "detectar" | "pausado";

export const CATEGORIES: Category[] = ["pessoa", "veiculo", "animal"];
export const INTERVAL_OPTIONS = [10, 15, 30] as const;
export type IntervalSec = (typeof INTERVAL_OPTIONS)[number];
export const DEFAULT_INTERVAL: IntervalSec = 15;

export interface CameraDetection {
  states: Record<Category, CategoryState>;
  pausedAt: Partial<Record<Category, number>>;
  intervalSec: IntervalSec;
}

export type DetectionConfig = Record<string, CameraDetection>;

export function createInitialConfig(cameraIds: string[]): DetectionConfig {
  const config: DetectionConfig = {};
  for (const id of cameraIds) {
    config[id] = {
      states: { pessoa: "detectar", veiculo: "detectar", animal: "detectar" },
      pausedAt: {},
      intervalSec: DEFAULT_INTERVAL,
    };
  }
  return config;
}

export function isPaused(config: DetectionConfig, cameraId: string, category: Category): boolean {
  return config[cameraId]?.states[category] === "pausado";
}

export function setCategoryState(
  config: DetectionConfig,
  cameraId: string,
  category: Category,
  state: CategoryState,
  now: number,
): DetectionConfig {
  const current = config[cameraId];
  if (!current || current.states[category] === state) return config;
  const pausedAt = { ...current.pausedAt };
  if (state === "pausado") pausedAt[category] = now;
  else delete pausedAt[category];
  return {
    ...config,
    [cameraId]: { ...current, states: { ...current.states, [category]: state }, pausedAt },
  };
}

export function isValidInterval(value: number): value is IntervalSec {
  return (INTERVAL_OPTIONS as readonly number[]).includes(value);
}

export function setCaptureInterval(
  config: DetectionConfig,
  cameraId: string,
  intervalSec: number,
): DetectionConfig {
  const current = config[cameraId];
  if (!current || !isValidInterval(intervalSec)) return config;
  return { ...config, [cameraId]: { ...current, intervalSec } };
}

export interface ActivePause {
  cameraId: string;
  category: Category;
  since: number;
}

export function listActivePauses(config: DetectionConfig): ActivePause[] {
  const out: ActivePause[] = [];
  for (const [cameraId, det] of Object.entries(config)) {
    for (const category of CATEGORIES) {
      if (det.states[category] === "pausado") {
        out.push({ cameraId, category, since: det.pausedAt[category] ?? 0 });
      }
    }
  }
  return out;
}

export function assumeOccurrence(occ: Occurrence, operator: string, now: number): Occurrence {
  if (occ.status !== "pendente") return occ;
  return { ...occ, status: "em_atendimento", operator, assumedAt: now };
}

export function finalizeOccurrence(occ: Occurrence, operator: string, now: number): Occurrence {
  if (occ.status === "finalizada") return occ;
  return {
    ...occ,
    status: "finalizada",
    operator: occ.operator ?? operator,
    assumedAt: occ.assumedAt ?? now,
    finishedAt: now,
  };
}

export function summarize(occs: Occurrence[]) {
  const pending = occs.filter((o) => o.status === "pendente").length;
  const inService = occs.filter((o) => o.status === "em_atendimento").length;
  return { pending, inService, open: pending + inService };
}

export type SimulationResult =
  | { blocked: true; cameraId: string; category: Category }
  | { blocked: false; occurrence: Occurrence };

const SIM_REASON: Record<Category, string> = {
  pessoa: "Pessoa detectada na área monitorada (evento simulado).",
  veiculo: "Veículo detectado na área monitorada (evento simulado).",
  animal: "Animal detectado na área monitorada (evento simulado).",
};

const SIM_PRIORITY: Record<Category, Priority> = { pessoa: "alta", veiculo: "media", animal: "baixa" };

export function simulateDetection(input: {
  config: DetectionConfig;
  cameraId: string;
  category: Category;
  now: number;
  sequence: number;
  bbox?: BBox | undefined;
}): SimulationResult {
  const { config, cameraId, category, now, sequence, bbox } = input;
  if (isPaused(config, cameraId, category)) return { blocked: true, cameraId, category };
  return {
    blocked: false,
    occurrence: {
      id: `oc-${sequence}`,
      code: `OC-${sequence}`,
      cameraId,
      category,
      priority: SIM_PRIORITY[category],
      status: "pendente",
      captureAt: now,
      alertAt: now + 6,
      reason: SIM_REASON[category],
      note: "",
      confidence: 0.87,
      bbox,
      simulated: true,
    },
  };
}

export function nextSequence(occs: Occurrence[]): number {
  return occs.reduce((max, o) => Math.max(max, Number(o.code.replace(/\D/g, "")) || 0), 0) + 1;
}
