import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import {
  CAMERAS,
  INITIAL_OCCURRENCES,
  OPERATOR,
  REFERENCE_BOXES,
  getCamera,
  type Category,
  type ClientFilter,
  type Occurrence,
} from "./demo-data";
import {
  assumeOccurrence,
  createInitialConfig,
  finalizeOccurrence,
  nextSequence,
  setCaptureInterval,
  setCategoryState,
  simulateDetection,
  type CategoryState,
  type DetectionConfig,
  type SimulationResult,
} from "./detection-logic";
import { getSimNow } from "./sim-clock";

interface DemoStore {
  clientId: ClientFilter;
  setClientId: (id: ClientFilter) => void;
  occurrences: Occurrence[];
  config: DetectionConfig;
  selectedOccurrenceId: string | null;
  selectOccurrence: (id: string | null) => void;
  assume: (id: string) => void;
  finalize: (id: string) => void;
  updateNote: (id: string, note: string) => void;
  setCategory: (cameraId: string, category: Category, state: CategoryState) => void;
  setInterval: (cameraId: string, sec: number) => void;
  simulate: (cameraId: string, category: Category) => SimulationResult;
  reset: () => void;
}

const DemoContext = createContext<DemoStore | null>(null);

const freshConfig = () => createInitialConfig(CAMERAS.map((c) => c.id));

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [clientId, setClientId] = useState<ClientFilter>("todos");
  const [occurrences, setOccurrences] = useState<Occurrence[]>(INITIAL_OCCURRENCES);
  const [config, setConfig] = useState<DetectionConfig>(freshConfig);
  const [selectedOccurrenceId, setSelected] = useState<string | null>(null);

  const patch = useCallback((id: string, fn: (o: Occurrence) => Occurrence) => {
    setOccurrences((list) => list.map((o) => (o.id === id ? fn(o) : o)));
  }, []);

  const simulate = useCallback(
    (cameraId: string, category: Category): SimulationResult => {
      const result = simulateDetection({
        config,
        cameraId,
        category,
        now: getSimNow(),
        sequence: nextSequence(occurrences),
        bbox: REFERENCE_BOXES[cameraId]?.[category],
      });
      if (!result.blocked) setOccurrences((list) => [result.occurrence, ...list]);
      return result;
    },
    [config, occurrences],
  );

  const value = useMemo<DemoStore>(
    () => ({
      clientId,
      setClientId,
      occurrences,
      config,
      selectedOccurrenceId,
      selectOccurrence: setSelected,
      assume: (id) => patch(id, (o) => assumeOccurrence(o, OPERATOR.name, getSimNow())),
      finalize: (id) => patch(id, (o) => finalizeOccurrence(o, OPERATOR.name, getSimNow())),
      updateNote: (id, note) => patch(id, (o) => ({ ...o, note })),
      setCategory: (cameraId, category, state) =>
        setConfig((c) => setCategoryState(c, cameraId, category, state, getSimNow())),
      setInterval: (cameraId, sec) => setConfig((c) => setCaptureInterval(c, cameraId, sec)),
      simulate,
      reset: () => {
        setOccurrences(INITIAL_OCCURRENCES);
        setConfig(freshConfig());
        setSelected(null);
        setClientId("todos");
      },
    }),
    [clientId, occurrences, config, selectedOccurrenceId, patch, simulate],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoStore {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo precisa estar dentro de DemoStoreProvider");
  return ctx;
}

export function useFilteredCameras() {
  const { clientId } = useDemo();
  return useMemo(
    () => (clientId === "todos" ? CAMERAS : CAMERAS.filter((c) => c.clientId === clientId)),
    [clientId],
  );
}

export function useFilteredOccurrences() {
  const { clientId, occurrences } = useDemo();
  return useMemo(
    () =>
      clientId === "todos"
        ? occurrences
        : occurrences.filter((o) => getCamera(o.cameraId).clientId === clientId),
    [clientId, occurrences],
  );
}
