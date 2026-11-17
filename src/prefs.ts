// Polish preferences: palette, layout, type and the rest, kept per device in
// localStorage. A content script copies them onto <html> as data attributes,
// and the theme CSS keys its variants off those attributes.
import { useSyncExternalStore } from "react";

export type Layout = "inset" | "flat";
export type Density = "comfortable" | "compact";
export type Accent = "auto" | "blue" | "graphite" | "violet" | "green" | "orange";
export type Palette = "capy" | "conductor" | "amp" | "flexoki";
export type Backdrop = "none" | "glow" | "aurora" | "grain";
export type Panels = "cards" | "joined";
export type Font = "inter" | "system";
export type Headings = "sans" | "serif";
export type Reading = "13" | "14" | "15";

export interface PolishPrefs {
  palette: Palette;
  layout: Layout;
  density: Density;
  accent: Accent;
  /** The floating pill that shows threads waiting on you. */
  island: boolean;
  /** What shows behind the sidebar and around the panels (inset layout). */
  backdrop: Backdrop;
  /** Whether the thread and its side panel are separate cards or one. */
  panels: Panels;
  font: Font;
  headings: Headings;
  /** Transcript text size in px. */
  reading: Reading;
  /** The status line under the main area (inset layout). */
  statusbar: boolean;
}

export const DEFAULT_PREFS: PolishPrefs = {
  palette: "capy",
  layout: "inset",
  density: "comfortable",
  accent: "auto",
  island: true,
  backdrop: "none",
  panels: "cards",
  font: "inter",
  headings: "sans",
  reading: "13",
  statusbar: true,
};

export const PALETTES: readonly Palette[] = ["capy", "conductor", "amp", "flexoki"];
export const LAYOUTS: readonly Layout[] = ["inset", "flat"];
export const DENSITIES: readonly Density[] = ["comfortable", "compact"];
export const ACCENTS: readonly Accent[] = ["auto", "blue", "graphite", "violet", "green", "orange"];
export const BACKDROPS: readonly Backdrop[] = ["none", "glow", "aurora", "grain"];
export const PANELS: readonly Panels[] = ["cards", "joined"];
export const FONTS: readonly Font[] = ["inter", "system"];
export const HEADINGS: readonly Headings[] = ["sans", "serif"];
export const READINGS: readonly Reading[] = ["13", "14", "15"];

const STORAGE_KEY = "polish.prefs.v1";
const CHANGE_EVENT = "polish:prefs";

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/** Parse stored JSON into valid prefs; anything unknown falls back to the default. */
export function parsePrefs(raw: string | null): PolishPrefs {
  if (!raw) return DEFAULT_PREFS;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return DEFAULT_PREFS;
  }
  if (typeof value !== "object" || value === null) return DEFAULT_PREFS;
  const record = value as Record<string, unknown>;
  return {
    palette: pick(record.palette, PALETTES, DEFAULT_PREFS.palette),
    layout: pick(record.layout, LAYOUTS, DEFAULT_PREFS.layout),
    density: pick(record.density, DENSITIES, DEFAULT_PREFS.density),
    accent: pick(record.accent, ACCENTS, DEFAULT_PREFS.accent),
    island: typeof record.island === "boolean" ? record.island : DEFAULT_PREFS.island,
    backdrop: pick(record.backdrop, BACKDROPS, DEFAULT_PREFS.backdrop),
    panels: pick(record.panels, PANELS, DEFAULT_PREFS.panels),
    font: pick(record.font, FONTS, DEFAULT_PREFS.font),
    headings: pick(record.headings, HEADINGS, DEFAULT_PREFS.headings),
    reading: pick(record.reading, READINGS, DEFAULT_PREFS.reading),
    statusbar: typeof record.statusbar === "boolean" ? record.statusbar : DEFAULT_PREFS.statusbar,
  };
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

let cachedRaw: string | null | undefined;
let cachedPrefs: PolishPrefs = DEFAULT_PREFS;

export function readPrefs(): PolishPrefs {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedPrefs = parsePrefs(raw);
  }
  return cachedPrefs;
}

export function writePrefs(next: PolishPrefs): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be full or blocked; the change still applies to this page.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribePrefs(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function usePrefs(): [PolishPrefs, (patch: Partial<PolishPrefs>) => void] {
  const prefs = useSyncExternalStore(subscribePrefs, readPrefs, () => DEFAULT_PREFS);
  const update = (patch: Partial<PolishPrefs>) => writePrefs({ ...readPrefs(), ...patch });
  return [prefs, update];
}

const ATTRIBUTES = {
  palette: "data-polish-palette",
  layout: "data-polish-layout",
  density: "data-polish-density",
  accent: "data-polish-accent",
  backdrop: "data-polish-backdrop",
  panels: "data-polish-panels",
  font: "data-polish-font",
  headings: "data-polish-headings",
  reading: "data-polish-reading",
  statusbar: "data-polish-statusbar",
} as const;

/** Set by the zen command, not saved. */
export const ZEN_ATTRIBUTE = "data-polish-zen";
const ZEN_EVENT = "polish:zen";

export function isZen(): boolean {
  return document.documentElement.hasAttribute(ZEN_ATTRIBUTE);
}

export function setZen(on: boolean): void {
  document.documentElement.toggleAttribute(ZEN_ATTRIBUTE, on);
  window.dispatchEvent(new Event(ZEN_EVENT));
}

export function useZen(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener(ZEN_EVENT, onChange);
      return () => window.removeEventListener(ZEN_EVENT, onChange);
    },
    isZen,
    () => false,
  );
}

export function applyPrefs(prefs: PolishPrefs, root: HTMLElement): void {
  root.setAttribute(ATTRIBUTES.palette, prefs.palette);
  root.setAttribute(ATTRIBUTES.layout, prefs.layout);
  root.setAttribute(ATTRIBUTES.density, prefs.density);
  root.setAttribute(ATTRIBUTES.accent, prefs.accent);
  root.setAttribute(ATTRIBUTES.backdrop, prefs.backdrop);
  root.setAttribute(ATTRIBUTES.panels, prefs.panels);
  root.setAttribute(ATTRIBUTES.font, prefs.font);
  root.setAttribute(ATTRIBUTES.headings, prefs.headings);
  root.setAttribute(ATTRIBUTES.reading, prefs.reading);
  root.setAttribute(ATTRIBUTES.statusbar, prefs.statusbar ? "on" : "off");
}

export function clearPrefs(root: HTMLElement): void {
  for (const name of Object.values(ATTRIBUTES)) root.removeAttribute(name);
  root.removeAttribute(ZEN_ATTRIBUTE);
}

/** The next value in a list, wrapping around. */
export function cycle<T>(list: readonly T[], current: T): T {
  const index = list.indexOf(current);
  return list[(index + 1) % list.length] as T;
}
