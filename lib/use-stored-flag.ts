"use client";

import { useCallback, useSyncExternalStore } from "react";

const CHANGE_EVENT = "avia:stored-flag";
// Fallback when storage is blocked (private mode, disabled site data): works until the page reloads
const memory = new Map<string, boolean>();

function read(key: string): boolean {
  try {
    const stored = window.localStorage.getItem(key);
    return stored === null ? (memory.get(key) ?? false) : stored === "1";
  } catch {
    return memory.get(key) ?? false;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** A per-browser on/off preference (e.g. compact view) that survives reloads. False on the server. */
export function useStoredFlag(key: string): [boolean, (next: boolean) => void] {
  const value = useSyncExternalStore(subscribe, () => read(key), () => false);

  const set = useCallback(
    (next: boolean) => {
      memory.set(key, next);
      try {
        window.localStorage.setItem(key, next ? "1" : "0");
      } catch {
        // Blocked: the in-memory value still applies on this page
      }
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
    [key]
  );

  return [value, set];
}
