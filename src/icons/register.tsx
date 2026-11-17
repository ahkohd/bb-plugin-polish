// Polish's icons in BB. A registration shadows BB's icon of the same name, and
// registrations are read once when the plugin loads, so Polish registers only
// while a Polish set is chosen; switching to or from BB's own icons reloads
// the window. Between Lucide and Phosphor, and between weights, each icon
// follows the setting live.
import type { PluginAppBuilder } from "@get-bb/plugin-sdk/app";
import { readPrefs, usePrefs, type IconWeight } from "../prefs";
import { EXTRA_ICONS, ICON_SETS, type IconPair } from "./sets";

const LUCIDE_STROKE: Record<IconWeight, number> = { thin: 1.25, regular: 1.6, bold: 2.1 };
const PHOSPHOR_WEIGHT: Record<IconWeight, string> = { thin: "light", regular: "regular", bold: "bold" };

export function SetIcon({ name, icon, className, label }: {
  name: string;
  icon: IconPair;
  className?: string;
  label?: string;
}) {
  const [prefs] = usePrefs();
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  if (prefs.icons === "phosphor") {
    const Glyph = icon.phosphor;
    return (
      <Glyph
        className={className}
        size={24}
        weight={PHOSPHOR_WEIGHT[prefs.iconWeight]}
        mirrored={icon.mirrored}
        data-icon={name}
        data-polish-icon="phosphor"
        {...a11y}
      />
    );
  }
  const Glyph = icon.lucide;
  return (
    <Glyph
      className={className}
      strokeWidth={LUCIDE_STROKE[prefs.iconWeight]}
      data-icon={name}
      data-polish-icon="lucide"
      {...a11y}
    />
  );
}

/** Whether Polish draws BB's icons on this load. */
export const polishIconsActive = (): boolean => readPrefs().icons !== "bb";

export function registerIcons(app: PluginAppBuilder): void {
  if (!polishIconsActive()) return;
  for (const [name, icon] of Object.entries(ICON_SETS)) {
    app.experimental_icons.register({
      name,
      component: ({ className }) => <SetIcon name={name} icon={icon} className={className} />,
    });
  }
}

export { EXTRA_ICONS };
