import { useEffect, useRef, useState } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import {
  experimental_useSidebarNavigation as useNavigation,
  experimental_useSidebarNavigationSplit as useSplit,
  experimental_SidebarNavigationIcon as NavigationIcon,
  type ExperimentalSidebarHeaderProps,
  type ExperimentalSidebarNavigationItem as Item,
  type ExperimentalSidebarNavigationProps,
  type PluginAppBuilder,
} from "@get-bb/plugin-sdk/app";
import { usePortalScopeProps } from "../sidebar/lib/portal-scope";
import { ProjectPicker } from "../sidebar/ProjectPicker";
import { ALL_PROJECTS, projectScope, useProjectScope } from "../sidebar/projectScope";
import { badgeText, splitNavigation } from "./nav-model";
import "./nav.css";

function HeaderActionButton({ item, controlSize }: { item: Item; controlSize: number }) {
  const { activeItemId, actions } = useNavigation();
  const split = useSplit(item.id);
  const scopeProps = usePortalScopeProps();
  const accessibleName = item.badge ? `${item.label}, ${item.badge.label}` : item.label;

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>
        <button
          type="button"
          className="pl-nav-header-btn"
          style={{ width: controlSize, height: controlSize }}
          aria-label={accessibleName}
          aria-current={activeItemId === item.id ? "page" : undefined}
          aria-keyshortcuts={item.shortcut?.ariaKeyShortcuts}
          disabled={item.isDisabled || item.isLoading}
          {...split.splitProps}
          onClick={(event) => {
            actions.activate(item.id, {
              target: event.metaKey || event.ctrlKey ? "split" : "current",
            });
          }}
        >
          <NavigationIcon icon={item.icon} className="pl-nav-header-glyph" />
        </button>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          {...scopeProps}
          className="pl-nav-tooltip"
          side="bottom"
          sideOffset={6}
          collisionPadding={8}
        >
          <span>{item.label}</span>
          {item.shortcut && <kbd className="pl-nav-tooltip-kbd">{item.shortcut.label}</kbd>}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

// The project filter sits in the header row, beside the sidebar toggle,
// whenever Polish's thread list is showing and there is room for it.
const HEADER_PICKER_MIN_WIDTH = 72;

function HeaderControls({ width, controlSize }: ExperimentalSidebarHeaderProps) {
  const { items } = useNavigation();
  const { search, newThread } = splitNavigation(items);
  const { scope, projects } = useProjectScope();
  useEffect(() => projectScope.mountHeader(), []);

  if (width < controlSize) return null;

  const canFitTwo = width >= controlSize * 2 + 4;
  const shown: Item[] = [];
  if (search && (canFitTwo || !newThread)) shown.push(search);
  if (newThread) shown.push(newThread);
  const buttonsWidth = shown.length * controlSize + Math.max(0, shown.length - 1) * 4;
  const showPicker = projects.length > 0 && width - buttonsWidth - 8 >= HEADER_PICKER_MIN_WIDTH;
  if (shown.length === 0 && !showPicker) return null;

  return (
    <TooltipPrimitive.Provider delayDuration={350} disableHoverableContent>
      <div className="pl-nav-header">
        {showPicker ? (
          <div className="pl-nav-header-scope">
            <ProjectPicker
              value={scope}
              allValue={ALL_PROJECTS}
              allLabel="All projects"
              projects={projects}
              onChange={projectScope.setScope}
            />
          </div>
        ) : null}
        {shown.map((item) => (
          <HeaderActionButton key={item.id} item={item} controlSize={controlSize} />
        ))}
      </div>
    </TooltipPrimitive.Provider>
  );
}

function NavRow({ item, menu = false, close }: { item: Item; menu?: boolean; close?: () => void }) {
  const { activeItemId, actions, isShortcutModifierHeld } = useNavigation();
  const split = useSplit(item.id, menu ? { activation: "distance", onDragStart: close } : undefined);
  const count = badgeText(item.badge);

  return (
    <button
      type="button"
      role={menu ? "menuitem" : undefined}
      className={menu ? "pl-nav-menu-item" : "pl-nav-row"}
      aria-label={item.badge ? `${item.label}, ${item.badge.label}` : item.label}
      aria-current={activeItemId === item.id ? "page" : undefined}
      aria-keyshortcuts={item.shortcut?.ariaKeyShortcuts}
      disabled={item.isDisabled || item.isLoading}
      {...split.splitProps}
      onClick={(event) => {
        actions.activate(item.id, {
          target: event.metaKey || event.ctrlKey ? "split" : "current",
        });
        close?.();
      }}
    >
      <NavigationIcon icon={item.icon} className="pl-nav-glyph" />
      <span className="pl-nav-label">{item.label}</span>
      {!menu && isShortcutModifierHeld && item.shortcut ? (
        <kbd className="pl-nav-shortcut">{item.shortcut.label}</kbd>
      ) : item.badge ? (
        count === null ? (
          <span aria-hidden="true" className="pl-nav-dot" data-tone={item.badge.tone} />
        ) : (
          <span aria-hidden="true" className="pl-nav-count" data-tone={item.badge.tone}>
            {count}
          </span>
        )
      ) : null}
    </button>
  );
}

function Dock({ isCompactViewport }: ExperimentalSidebarNavigationProps) {
  const { items, actions } = useNavigation();
  const { visible, hidden } = splitNavigation(items);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const more = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const { listRight } = useProjectScope();
  const [rightInset, setRightInset] = useState(0);
  // Line the counts up with the thread list below, whose slot may end short of ours.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const measure = () => {
      const inset = listRight === null ? 0 : Math.round(nav.getBoundingClientRect().right - listRight);
      setRightInset(inset > 0 && inset < 48 ? inset : 0);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [listRight]);
  const close = () => {
    setOpen(false);
    more.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  return (
    <nav ref={navRef} className="pl-nav" style={rightInset ? { paddingRight: 8 + rightInset } : undefined} data-compact={isCompactViewport} aria-label="Sidebar navigation">
      <div className="pl-nav-list">
        {visible.map((item) => (
          <NavRow key={item.id} item={item} />
        ))}
        <div className="pl-nav-more" ref={root}>
          <button
            type="button"
            ref={more}
            className="pl-nav-row pl-nav-more-btn"
            aria-label="More navigation"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setOpen(true);
              }
            }}
          >
            <svg className="pl-nav-glyph" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <circle cx="3.5" cy="8" r="1.1" />
              <circle cx="8" cy="8" r="1.1" />
              <circle cx="12.5" cy="8" r="1.1" />
            </svg>
            <span className="pl-nav-label">More</span>
          </button>
          {open && (
            <div
              className="pl-nav-menu"
              ref={menu}
              role="menu"
              aria-label="More navigation"
              onBlur={(event) => {
                if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
                  setOpen(false);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  close();
                }
                const buttons = Array.from(
                  event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
                );
                const index = buttons.findIndex((button) => button === document.activeElement);
                if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
                  event.preventDefault();
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? buttons.length - 1
                        : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
                  buttons[next]?.focus();
                }
              }}
            >
              {hidden.map((item) => (
                <NavRow key={item.id} item={item} menu close={close} />
              ))}
              {hidden.length > 0 && <div className="pl-nav-menu-divider" />}
              <button
                type="button"
                role="menuitem"
                className="pl-nav-menu-item"
                onClick={() => {
                  close();
                  actions.openCustomize();
                }}
              >
                <svg
                  className="pl-nav-glyph"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M2.5 4h11M2.5 8h11M2.5 12h11M6 2.5v3M10 6.5v3M6 10.5v3" />
                </svg>
                <span className="pl-nav-label">Customize navigation</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export function registerNav(app: PluginAppBuilder): void {
  app.slots.experimental_sidebarNavigation({
    id: "dock",
    title: "Polish dock",
    placement: "list",
    component: Dock,
    headerComponent: HeaderControls,
  });
}
