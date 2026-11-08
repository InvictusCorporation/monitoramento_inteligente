import { useSyncExternalStore } from "react";

/** Relógio simulado da demonstração: começa em 07/11/2026 20:47:00 e avança 1 s por segundo. */
export const SIM_DATE_LABEL = "07/11/2026";
export const SIM_START = 20 * 3600 + 47 * 60;

let simNow = SIM_START;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    timer = setInterval(() => {
      simNow += 1;
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export function getSimNow() {
  return simNow;
}

export function useSimNow() {
  return useSyncExternalStore(subscribe, getSimNow, () => SIM_START);
}

const pad = (n: number) => String(n).padStart(2, "0");

export function formatClock(sec: number, withSeconds = true): string {
  const s = ((Math.floor(sec) % 86400) + 86400) % 86400;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return withSeconds ? `${pad(h)}:${pad(m)}:${pad(s % 60)}` : `${pad(h)}:${pad(m)}`;
}

export function formatRelative(now: number, at: number): string {
  const d = Math.max(0, now - at);
  if (d < 60) return "agora";
  if (d < 3600) return `há ${Math.floor(d / 60)} min`;
  const h = Math.floor(d / 3600);
  const m = Math.floor((d % 3600) / 60);
  return m ? `há ${h} h ${m} min` : `há ${h} h`;
}
