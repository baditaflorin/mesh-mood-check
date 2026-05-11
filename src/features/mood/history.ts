import { appConfig } from "../../shared/config";

export type DayCounts = [number, number, number, number, number];
export type HistoryEntry = { date: string; counts: DayCounts };

const KEY = `${appConfig.storagePrefix}:history`;
const CAP = 30;

export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHistoryEntry);
  } catch {
    return [];
  }
}

export function saveHistory(entries: HistoryEntry[]): void {
  const trimmed = entries.slice(-CAP);
  localStorage.setItem(KEY, JSON.stringify(trimmed));
}

export function clearHistory(): void {
  localStorage.removeItem(KEY);
}

export function appendIfNew(entry: HistoryEntry): HistoryEntry[] {
  const cur = loadHistory();
  if (cur.some((e) => e.date === entry.date)) return cur;
  const next = [...cur, entry].slice(-CAP);
  saveHistory(next);
  return next;
}

function isHistoryEntry(x: unknown): x is HistoryEntry {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.date === "string" &&
    Array.isArray(o.counts) &&
    o.counts.length === 5 &&
    o.counts.every((n) => typeof n === "number" && Number.isFinite(n))
  );
}
