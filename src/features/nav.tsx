import { useEffect, useRef, useState } from "react";
import {
  experimental_useSidebarNavigation as useNavigation,
  experimental_useSidebarNavigationSplit as useSplit,
  experimental_SidebarNavigationIcon as NavigationIcon,
  type ExperimentalSidebarNavigationItem as Item,
  type ExperimentalSidebarNavigationProps,
  type PluginAppBuilder,
} from "@get-bb/plugin-sdk/app";
import { badgeText, splitNavigation } from "./nav-model";
import "./nav.css";

function NavItem({ item, newThread = false, menu = false, close }: { item: Item; newThread?: boolean; menu?: boolean; close?: () => void }) {
  const { activeItemId, actions, isShortcutModifierHeld } = useNavigation();
  const split = useSplit(item.id, menu ? { activation: "distance", onDragStart: close } : undefined);
  const count = badgeText(item.badge);
  return <button type="button" role={menu ? "menuitem" : undefined}
    className={newThread ? "pl-nav-new" : menu ? "pl-nav-menu-item" : "pl-nav-icon"}
    aria-label={item.badge ? `${item.label}, ${item.badge.label}` : item.label}
    aria-current={activeItemId === item.id ? "page" : undefined}
    aria-keyshortcuts={item.shortcut?.ariaKeyShortcuts}
    disabled={item.isDisabled || item.isLoading}
    {...split.splitProps}
    onClick={event => {
      actions.activate(item.id, { target: event.metaKey || event.ctrlKey ? "split" : "current" });
      close?.();
    }}>
    <NavigationIcon icon={item.icon} className="pl-nav-glyph" />
    {(newThread || menu) && <span>{item.label}</span>}
    {newThread && item.shortcut && <kbd className="pl-nav-key" data-held={isShortcutModifierHeld}>{item.shortcut.label}</kbd>}
    {!newThread && item.badge && <span aria-hidden="true" className={count === null ? "pl-nav-badge pl-nav-dot" : "pl-nav-badge"} data-tone={item.badge.tone}>{count}</span>}
    {!newThread && !menu && <span className="pl-nav-tooltip" aria-hidden="true">{item.label}{item.shortcut && <kbd>{item.shortcut.label}</kbd>}</span>}
  </button>;
}

function Dock({ isCompactViewport }: ExperimentalSidebarNavigationProps) {
  const { items, actions } = useNavigation();
  const { newThread, visible, hidden } = splitNavigation(items);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const more = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const close = () => { setOpen(false); more.current?.focus(); };
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return <nav className="pl-nav" data-compact={isCompactViewport} aria-label="Sidebar navigation">
    {newThread && <NavItem item={newThread} newThread />}
    <div className="pl-nav-dock">
      {visible.map(item => <NavItem key={item.id} item={item} />)}
      <div className="pl-nav-more" ref={root}>
        <button type="button" ref={more} className="pl-nav-icon" aria-label="More navigation" aria-haspopup="menu" aria-expanded={open}
          onClick={() => setOpen(value => !value)}
          onKeyDown={event => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); } }}>
          <svg className="pl-nav-glyph" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="3" cy="8" r="1"/><circle cx="8" cy="8" r="1"/><circle cx="13" cy="8" r="1"/></svg>
          <span className="pl-nav-tooltip" aria-hidden="true">More</span>
        </button>
        {open && <div className="pl-nav-menu" ref={menu} role="menu" aria-label="More navigation"
          onBlur={event => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
          onKeyDown={event => {
            if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
            const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
            const index = buttons.findIndex(button => button === document.activeElement);
            if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
              event.preventDefault();
              const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
              buttons[next]?.focus();
            }
          }}>
          {hidden.map(item => <NavItem key={item.id} item={item} menu close={close} />)}
          <div className="pl-nav-menu-divider" />
          <button type="button" role="menuitem" className="pl-nav-menu-item" onClick={() => { close(); actions.openCustomize(); }}>
            <svg className="pl-nav-glyph" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 4h10M3 8h10M3 12h10M6 2v4M10 6v4M6 10v4"/></svg>
            Customize navigation
          </button>
        </div>}
      </div>
    </div>
  </nav>;
}

export function registerNav(app: PluginAppBuilder): void {
  app.slots.experimental_sidebarNavigation({ id: "dock", title: "Polish dock", placement: "list", component: Dock, headerComponent: () => null });
}
