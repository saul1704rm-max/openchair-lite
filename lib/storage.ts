import type { Session } from "./types";

const KEY = "openchair-lite:sessions";
export function loadSessions(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    const value = localStorage.getItem(KEY);
    return value ? (JSON.parse(value) as Session[]) : [];
  } catch {
    return [];
  }
}
export function saveSessions(sessions: Session[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(KEY, JSON.stringify(sessions));
    return true;
  } catch {
    return false;
  }
}
export function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
export function isSession(value: unknown): value is Session {
  return Boolean(
    value &&
    typeof value === "object" &&
    (value as { version?: unknown }).version === 1 &&
    Array.isArray((value as { delegations?: unknown }).delegations),
  );
}
