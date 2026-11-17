import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  ArrowTurnBackwardIcon,
  ArrowUp01Icon,
  Clock01Icon,
  MailOpen01Icon,
  Notification03Icon,
  NotificationOff01Icon,
  Search01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { experimental_Icon as BbIcon } from "@get-bb/plugin-sdk/app";
import { EXTRA_ICONS, SetIcon } from "../../icons/register";
import { usePrefs } from "../../prefs";
import { cn } from "../lib/utils";

const ICON_MAP = {
  ArrowTurnBackward: ArrowTurnBackwardIcon,
  Check: Tick02Icon,
  ChevronDown: ArrowDown01Icon,
  ChevronRight: ArrowRight01Icon,
  ChevronUp: ArrowUp01Icon,
  Clock: Clock01Icon,
  MailOpen: MailOpen01Icon,
  Notification: Notification03Icon,
  NotificationOff: NotificationOff01Icon,
  Search: Search01Icon,
} as const satisfies Record<string, IconSvgElement>;

export type IconName = keyof typeof ICON_MAP;

// Names BB also draws. These go through BB's icon registry, so the sidebar
// follows whichever icon set is chosen; the bells are Polish's own.
const OWN_NAMES: ReadonlySet<IconName> = new Set(["Notification", "NotificationOff"]);

export function Icon({
  name,
  className,
  "aria-hidden": ariaHidden,
  "aria-label": ariaLabel,
}: {
  name: IconName;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}) {
  const [prefs] = usePrefs();
  if (OWN_NAMES.has(name)) {
    if (prefs.icons !== "bb") {
      return <SetIcon name={name} icon={EXTRA_ICONS[name]!} className={className} label={ariaLabel} />;
    }
  } else if (prefs.icons !== "bb") {
    return (
      <BbIcon
        name={name}
        className={cn(className)}
        aria-hidden={ariaHidden}
        aria-label={ariaLabel}
      />
    );
  }
  return (
    <HugeiconsIcon
      icon={ICON_MAP[name]}
      className={cn(className)}
      aria-hidden={ariaHidden}
      aria-label={ariaLabel}
      data-icon={name}
    />
  );
}
