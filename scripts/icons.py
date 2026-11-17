#!/usr/bin/env python3
"""Regenerate src/icons/sets.tsx from src/icons/map.json.

Each map entry is "BbName": ["LucideName", "PhosphorName"]. Phosphor names are
written without their Icon suffix. Run from the repository root.
"""
import json

m = json.load(open("src/icons/map.json"))
# Polish's own icons, kept out of the BB names Polish shadows.
EXTRA = {
    "Notification": ("Bell", "Bell"),
    "NotificationOff": ("BellOff", "BellSlash"),
    "polish.overview": ("Inbox", "Tray"),
    "polish.crew": ("UsersRound", "Users"),
}
lucide = sorted({v[0] for v in m.values()} | {l for l, _ in EXTRA.values()})
phos = sorted({v[1] for v in m.values()} | {p for _, p in EXTRA.values()})
mirrored = {"PanelRight"}
src = open("src/icons/sets.tsx").read()
head, _, _ = src.partition("import type { ComponentType }")
out = [head + 'import type { ComponentType } from "react";', "import {"]
out.append(",\n".join(f"  {n} as L{n}" for n in lucide) + ",")
out.append('} from "lucide-react";')
out.append("import {")
out.append(",\n".join(f"  {n}Icon as P{n}" for n in phos) + ",")
rest = src.split('} from "@phosphor-icons/react";', 1)[1]
body, _, tail = rest.partition("export const ICON_SETS: Record<string, IconPair> = {")
entries = "\n".join(
    f"  {k}: pair(L{l}, P{p}{', true' if k in mirrored else ''}),"
    for k, (l, p) in m.items()
)
tail = tail.split("};", 1)[1]
extra_entries = "\n".join(f'  "{k}": pair(L{l}, P{p}),' for k, (l, p) in EXTRA.items())
tail = tail.split("export const EXTRA_ICONS: Record<string, IconPair> = {", 1)[0] + (
    "export const EXTRA_ICONS: Record<string, IconPair> = {\n" + extra_entries + "\n};\n"
)
out.append('} from "@phosphor-icons/react";' + body + "export const ICON_SETS: Record<string, IconPair> = {\n" + entries + "\n};" + tail)
open("src/icons/sets.tsx", "w").write("\n".join(out))
