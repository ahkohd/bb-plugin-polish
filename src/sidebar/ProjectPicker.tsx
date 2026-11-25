import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import * as Popover from "@radix-ui/react-popover";
import { Icon } from "./components/Icon";
import { usePortalScopeProps } from "./lib/portal-scope";

export interface ProjectOption {
  id: string;
  name: string;
}

function matchesQuery(name: string, query: string): boolean {
  return name.toLowerCase().includes(query.trim().toLowerCase());
}

export function ProjectPicker({
  value,
  allValue,
  allLabel,
  projects,
  onChange,
}: {
  value: string;
  allValue: string;
  allLabel: string;
  projects: readonly ProjectOption[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const listId = useId();
  const listRef = useRef<HTMLDivElement | null>(null);

  const options = useMemo(() => {
    const all = { id: allValue, name: allLabel };
    if (query.trim() === "") return [all, ...projects];
    return projects.filter((project) => matchesQuery(project.name, query));
  }, [allLabel, allValue, projects, query]);

  const selectedLabel =
    value === allValue
      ? allLabel
      : (projects.find((project) => project.id === value)?.name ?? allLabel);

  const openPicker = (next: boolean) => {
    if (next) {
      setQuery("");
      const ids = [allValue, ...projects.map((project) => project.id)];
      setHighlighted(Math.max(0, ids.indexOf(value)));
    }
    setOpen(next);
  };

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${highlighted}"]`)
      ?.scrollIntoView?.({ block: "nearest" });
  }, [highlighted, options]);

  const choose = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((index) => Math.min(options.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((index) => Math.max(0, index - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setHighlighted(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setHighlighted(Math.max(0, options.length - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = options[highlighted];
      if (option) choose(option.id);
    }
  };

  const activeOption = options[highlighted];

  return (
    <Popover.Root open={open} onOpenChange={openPicker}>
      <Popover.Trigger
        aria-label={`Project scope: ${selectedLabel}`}
        aria-haspopup="listbox"
        data-filtered={value !== allValue ? "true" : undefined}
        className="pl-sb-picker-trigger"
      >
        <span className="pl-sb-picker-label">{selectedLabel}</span>
        <Icon
          name="ChevronDown"
          aria-hidden="true"
          className="pl-sb-picker-chevron"
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          {...usePortalScopeProps()}
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement | null)
              ?.querySelector<HTMLInputElement>("input")
              ?.focus();
          }}
          className="pl-sb-picker-content"
        >
          <div className="pl-sb-picker-search">
            <Icon
              name="Search"
              aria-hidden="true"
              className="pl-sb-picker-search-icon"
            />
            <input
              role="combobox"
              aria-label="Search projects"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={
                activeOption ? `${listId}-${highlighted}` : undefined
              }
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setHighlighted(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search projects"
              className="pl-sb-picker-input"
            />
          </div>
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label="Projects"
            className="pl-sb-picker-list"
          >
            {options.length === 0 ? (
              <p className="pl-sb-picker-empty">No projects match.</p>
            ) : (
              options.map((option, index) => {
                const selected = option.id === value;
                return (
                  <div
                    key={option.id}
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={selected}
                    data-index={index}
                    data-highlighted={index === highlighted ? "" : undefined}
                    onPointerMove={() => setHighlighted(index)}
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() => choose(option.id)}
                    className="pl-sb-picker-option"
                  >
                    <span className="pl-sb-picker-option-label">
                      {option.name}
                    </span>
                    {selected ? (
                      <span className="pl-sb-picker-check">
                        <Icon
                          name="Check"
                          className="pl-sb-picker-check-icon"
                        />
                      </span>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
