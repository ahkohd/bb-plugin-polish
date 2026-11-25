import { useEffect } from "react";

// Polish's header row: bb's sidebar toggle moves out of the sidebar into the
// main area's header, just left of the thread title, and the sidebar's header
// row (project filter, Search, New thread) drops to the same centre line as
// the main header, which sits inside an inset card.
//
// bb draws the toggle in a fixed overlay at the window's top-left, so Polish
// measures where the main header is and publishes it as CSS variables; the
// rules in nav.css read them only while <html data-pl-header-align> is set.

const ATTR = "data-pl-header-align";

interface HeaderBox {
  left: number;
  top: number;
  height: number;
}

// The main area's header, or, on pages without one (the new thread page),
// the top row of the main card, so the toggle stays in one place.
function headerBox(): HeaderBox | null {
  const header = mainHeader();
  if (header) {
    const rect = header.getBoundingClientRect();
    return { left: rect.left, top: rect.top, height: rect.height };
  }
  const shell = document.querySelector<HTMLElement>('[data-testid="app-layout-content-shell"]');
  if (!shell) return null;
  const rect = shell.getBoundingClientRect();
  if (rect.width < 120) return null;
  return { left: rect.left, top: rect.top, height: chromeRowHeight() };
}

// bb's chrome row height, which bb sets in rem.
function chromeRowHeight(): number {
  const style = getComputedStyle(document.documentElement);
  const raw = style.getPropertyValue("--bb-app-chrome-row-height").trim();
  const value = parseFloat(raw);
  if (!Number.isFinite(value) || value <= 0) return 48;
  if (raw.endsWith("rem")) return value * (parseFloat(style.fontSize) || 16);
  return value;
}

function mainHeader(): HTMLElement | null {
  let best: HTMLElement | null = null;
  let bestLeft = Infinity;
  for (const row of document.querySelectorAll<HTMLElement>('[data-testid="app-page-header-content-row"]')) {
    const header = row.closest("header") ?? row;
    const rect = header.getBoundingClientRect();
    if (rect.width < 120 || rect.top > 80) continue;
    if (rect.left < bestLeft) {
      best = header;
      bestLeft = rect.left;
    }
  }
  return best;
}

export function useHeaderAlign(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    let last = "";
    const measure = () => {
      const rect = headerBox();
      if (!rect) {
        if (last) {
          root.removeAttribute(ATTR);
          last = "";
        }
        return;
      }
      const key = `${Math.round(rect.left)}:${Math.round(rect.top)}:${Math.round(rect.height)}`;
      if (key === last) return;
      last = key;
      root.style.setProperty("--pl-main-header-left", `${Math.round(rect.left)}px`);
      root.style.setProperty("--pl-main-header-top", `${Math.round(rect.top)}px`);
      root.style.setProperty("--pl-main-header-height", `${Math.round(rect.height)}px`);
      root.setAttribute(ATTR, "");
    };
    measure();
    // The header moves when the sidebar opens, closes or resizes, and is
    // replaced on navigation; a light poll catches all of these.
    const timer = window.setInterval(measure, 250);
    window.addEventListener("resize", measure);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("resize", measure);
      root.removeAttribute(ATTR);
      for (const name of ["--pl-main-header-left", "--pl-main-header-top", "--pl-main-header-height"]) root.style.removeProperty(name);
    };
  }, [enabled]);
}
