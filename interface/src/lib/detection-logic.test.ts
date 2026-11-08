import { describe, expect, it } from "vitest";

import { CAMERAS, INITIAL_OCCURRENCES } from "./demo-data";
import {
  INTERVAL_OPTIONS,
  assumeOccurrence,
  createInitialConfig,
  finalizeOccurrence,
  isPaused,
  listActivePauses,
  setCaptureInterval,
  setCategoryState,
  simulateDetection,
  summarize,
} from "./detection-logic";

const ids = CAMERAS.map((c) => c.id);

describe("Regras de detecção da demonstração", () => {
  it("nunca inicia com pausas marcadas", () => {
    const config = createInitialConfig(ids);
    expect(listActivePauses(config)).toHaveLength(0);
  });

  it("começa com 8 câmeras, 3 ocorrências abertas e 1 em atendimento", () => {
    expect(CAMERAS).toHaveLength(8);
    const s = summarize(INITIAL_OCCURRENCES);
    expect(s.open).toBe(3);
    expect(s.inService).toBe(1);
  });

  it("assumir muda de pendente para em atendimento com o operador", () => {
    const occ = INITIAL_OCCURRENCES.find((o) => o.status === "pendente")!;
    const next = assumeOccurrence(occ, "Rafael Lima", 1000);
    expect(next.status).toBe("em_atendimento");
    expect(next.operator).toBe("Rafael Lima");
  });

  it("finalizar não pausa a detecção da câmera", () => {
    const config = createInitialConfig(ids);
    const occ = INITIAL_OCCURRENCES[0]!;
    const done = finalizeOccurrence(occ, "Rafael Lima", 2000);
    expect(done.status).toBe("finalizada");
    expect(isPaused(config, occ.cameraId, occ.category)).toBe(false);
    const sim = simulateDetection({ config, cameraId: occ.cameraId, category: occ.category, now: 2010, sequence: 9999 });
    expect(sim.blocked).toBe(false);
  });

  it("pausa por categoria e câmera bloqueia novos alvos só naquela combinação", () => {
    let config = createInitialConfig(ids);
    config = setCategoryState(config, "loja-entrada", "pessoa", "pausado", 500);
    expect(simulateDetection({ config, cameraId: "loja-entrada", category: "pessoa", now: 600, sequence: 1 }).blocked).toBe(true);
    expect(simulateDetection({ config, cameraId: "loja-entrada", category: "veiculo", now: 600, sequence: 1 }).blocked).toBe(false);
    expect(simulateDetection({ config, cameraId: "loja-estoque", category: "pessoa", now: 600, sequence: 1 }).blocked).toBe(false);
  });

  it("reativar volta a gerar alvos", () => {
    let config = createInitialConfig(ids);
    config = setCategoryState(config, "loja-entrada", "pessoa", "pausado", 500);
    config = setCategoryState(config, "loja-entrada", "pessoa", "detectar", 700);
    expect(isPaused(config, "loja-entrada", "pessoa")).toBe(false);
    expect(listActivePauses(config)).toHaveLength(0);
  });

  it("intervalo aceita apenas 10, 15 ou 30 segundos", () => {
    expect([...INTERVAL_OPTIONS]).toEqual([10, 15, 30]);
    let config = createInitialConfig(ids);
    config = setCaptureInterval(config, "aurora-portao", 30);
    expect(config["aurora-portao"]!.intervalSec).toBe(30);
    config = setCaptureInterval(config, "aurora-portao", 5);
    expect(config["aurora-portao"]!.intervalSec).toBe(30);
  });
});
