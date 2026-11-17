// Polish's settings, saved on this device: look, layout, text and attention.
import type { ReactNode } from "react";
import {
  ACCENTS,
  type Accent,
  type Backdrop,
  type Density,
  type Font,
  type Headings,
  type Layout,
  type Palette,
  type Panels,
  type Reading,
  usePrefs,
} from "./prefs";

function Segmented<T extends string>(props: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="pl-segmented" role="radiogroup" aria-label={props.label}>
      {props.options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={props.value === option.value}
          data-selected={props.value === option.value || undefined}
          onClick={() => props.onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Switch(props: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={props.label}
      aria-checked={props.checked}
      data-state={props.checked ? "checked" : "unchecked"}
      className="pl-switch"
      onClick={() => props.onChange(!props.checked)}
    >
      <span />
    </button>
  );
}

function Field(props: { label: string; hint: string; children: ReactNode }) {
  return (
    <div className="pl-field">
      <div className="pl-field-text">
        <div className="pl-field-label">{props.label}</div>
        <div className="pl-field-hint">{props.hint}</div>
      </div>
      {props.children}
    </div>
  );
}

function Section(props: { title: string; children: ReactNode }) {
  return (
    <section className="pl-settings-section">
      <h3 className="pl-settings-heading">{props.title}</h3>
      <div className="pl-settings-card">{props.children}</div>
    </section>
  );
}

const PALETTE_OPTIONS: readonly { value: Palette; label: string }[] = [
  { value: "capy", label: "Capy" },
  { value: "conductor", label: "Conductor" },
  { value: "amp", label: "Amp" },
  { value: "flexoki", label: "Flexoki" },
];

const BACKDROP_OPTIONS: readonly { value: Backdrop; label: string }[] = [
  { value: "none", label: "Plain" },
  { value: "glow", label: "Glow" },
  { value: "aurora", label: "Aurora" },
  { value: "grain", label: "Grain" },
];

const ACCENT_NAMES: Record<Accent, string> = {
  auto: "The palette's own",
  blue: "Blue",
  graphite: "Graphite",
  violet: "Violet",
  green: "Green",
  orange: "Orange",
};

export function PolishSettings() {
  const [prefs, update] = usePrefs();
  return (
    <div className="pl-settings">
      <Section title="Look">
        <Field label="Palette" hint="Capy's cool greys, Conductor's black and green, Amp's deep teal and orange, or Flexoki's ink on paper.">
          <div className="pl-palettes" role="radiogroup" aria-label="Palette">
            {PALETTE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={prefs.palette === option.value}
                data-selected={prefs.palette === option.value || undefined}
                className="pl-palette"
                data-palette={option.value}
                onClick={() => update({ palette: option.value })}
              >
                <span className="pl-palette-preview" aria-hidden="true">
                  <span /><span /><span />
                </span>
                {option.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Accent" hint="Used for primary buttons, counts, links and focus.">
          <div className="pl-swatches" role="radiogroup" aria-label="Accent">
            {ACCENTS.map((accent) => (
              <button
                key={accent}
                type="button"
                role="radio"
                aria-checked={prefs.accent === accent}
                aria-label={ACCENT_NAMES[accent]}
                title={ACCENT_NAMES[accent]}
                className="pl-swatch"
                data-accent={accent}
                data-selected={prefs.accent === accent || undefined}
                onClick={() => update({ accent })}
              />
            ))}
          </div>
        </Field>
        <Field label="Backdrop" hint="What shows behind the sidebar and around the panels. Needs the inset layout.">
          <Segmented<Backdrop>
            label="Backdrop"
            value={prefs.backdrop}
            options={BACKDROP_OPTIONS}
            onChange={(backdrop) => update({ backdrop })}
          />
        </Field>
      </Section>

      <Section title="Layout">
        <Field label="Main area" hint="Inset puts it on a rounded panel beside the sidebar, as Capy does.">
          <Segmented<Layout>
            label="Main area"
            value={prefs.layout}
            options={[{ value: "inset", label: "Inset" }, { value: "flat", label: "Flat" }]}
            onChange={(layout) => update({ layout })}
          />
        </Field>
        <Field label="Side panel" hint="Cards separates the thread and its side panel; Joined keeps them on one surface.">
          <Segmented<Panels>
            label="Side panel"
            value={prefs.panels}
            options={[{ value: "cards", label: "Cards" }, { value: "joined", label: "Joined" }]}
            onChange={(panels) => update({ panels })}
          />
        </Field>
        <Field label="Density" hint="Compact tightens sidebar rows, menus and message spacing.">
          <Segmented<Density>
            label="Density"
            value={prefs.density}
            options={[{ value: "comfortable", label: "Comfortable" }, { value: "compact", label: "Compact" }]}
            onChange={(density) => update({ density })}
          />
        </Field>
        <Field label="Status line" hint="Running and unread counts under the main area. It shows only when there is something to count.">
          <Switch label="Status line" checked={prefs.statusbar} onChange={(statusbar) => update({ statusbar })} />
        </Field>
      </Section>

      <Section title="Text">
        <Field label="Font" hint="Inter, or your system's font (San Francisco on a Mac).">
          <Segmented<Font>
            label="Font"
            value={prefs.font}
            options={[{ value: "inter", label: "Inter" }, { value: "system", label: "System" }]}
            onChange={(font) => update({ font })}
          />
        </Field>
        <Field label="Headings" hint="Serif sets headings in replies and page titles in a book face.">
          <Segmented<Headings>
            label="Headings"
            value={prefs.headings}
            options={[{ value: "sans", label: "Sans" }, { value: "serif", label: "Serif" }]}
            onChange={(headings) => update({ headings })}
          />
        </Field>
        <Field label="Reading size" hint="Text size in the transcript, in pixels.">
          <Segmented<Reading>
            label="Reading size"
            value={prefs.reading}
            options={[{ value: "13", label: "13" }, { value: "14", label: "14" }, { value: "15", label: "15" }]}
            onChange={(reading) => update({ reading })}
          />
        </Field>
      </Section>

      <Section title="Attention">
        <Field label="Needs-you pill" hint="A small pill at the top of the window while a thread waits on you. Click it to jump there.">
          <Switch label="Needs-you pill" checked={prefs.island} onChange={(island) => update({ island })} />
        </Field>
      </Section>

      <p className="pl-settings-note">
        These apply while the Polish theme is on (Settings, Appearance) and are saved on this device only.
        Shortcuts for zen mode, Overview and the rest are in Settings, Keyboard.
      </p>
    </div>
  );
}
