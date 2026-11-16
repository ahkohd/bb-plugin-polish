// Polish's settings: layout, density and accent, saved on this device.
import type { ReactNode } from "react";
import { ACCENTS, type Accent, type Density, type Layout, usePrefs } from "./prefs";

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

const ACCENT_NAMES: Record<Accent, string> = {
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
      <Field label="Layout" hint="Inset puts the main area on a rounded panel beside the sidebar, as Capy does.">
        <Segmented<Layout>
          label="Layout"
          value={prefs.layout}
          options={[{ value: "inset", label: "Inset panel" }, { value: "flat", label: "Flat" }]}
          onChange={(layout) => update({ layout })}
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
      <p className="pl-settings-note">
        These apply while the Polish theme is on (Settings, Appearance) and are saved on this device only.
      </p>
    </div>
  );
}
