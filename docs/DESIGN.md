# Polish design rules

Polish makes bb look calm and exact, in the manner of Capy, T3 Code, Conductor
and Amp. Every screen follows these rules. When a rule and a spec disagree, the
spec wins; when neither covers a case, pick the quieter option.

## Principles

1. Content first. Chrome is grey and thin; only one thing per screen is loud.
2. One accent. `var(--pl-accent, var(--primary))` marks the primary action,
   selection, links and focus. Status colours (below) are the only other hues.
3. No decoration. No gradients, no borders around borders, no icons that
   repeat a label. Shadows only on things that float.
4. Quiet until needed. Secondary controls sit at 55-70% strength and come up
   on hover or focus.
5. Colour means something or it is not there. Counts are plain text. No
   traffic-light dots, no coloured squares, no outline boxes for focus on
   rows. The only tinted figure is the one that needs you.
6. Fast. Hover changes are instant or 120-150ms. Movement is 200-300ms with
   `cubic-bezier(0.23, 1, 0.32, 1)`. Pressing a button scales it to 0.97-0.98.
   Honour `prefers-reduced-motion`.

## Tokens

Use bb's tokens only, so every palette and both modes work. Never write a hex
colour outside a palette preview.

| Use | Token |
| --- | --- |
| Page | `var(--background)` |
| Card, menu, input | `var(--card)` |
| Text | `var(--foreground)` |
| Secondary text | `var(--muted-foreground)` |
| Tertiary text, icons at rest | `var(--subtle-foreground)` |
| Hairline | `var(--border)` (stronger: `var(--input)`) |
| Hover fill | `var(--state-hover)` |
| Pressed or selected fill | `var(--state-active)` |
| Accent | `var(--pl-accent, var(--primary))`, text on it `var(--primary-foreground)` |
| Needs you | `var(--warning)`, text `var(--warning-text)` |
| Working | the accent |
| Done, added | `var(--success)`, text `var(--success-foreground)` |
| Failed, removed | `var(--destructive)` |
| Floating shadow | `var(--shadow-lg)` |
| Focus ring | `outline: 2px solid var(--ring); outline-offset: -2px` or `2px` |

## Type

Inter (inherited). Sizes: 13px (0.8125rem) for UI text, 12px for meta, 11px for
the smallest labels, 14px for a card title, 22px for a page title. Weights:
450 normal, 500 for labels and buttons, 560 for titles and unread. Numbers use
`font-variant-numeric: tabular-nums`. Mono (`var(--font-mono)`) for branches,
paths and counts of code only. Sentence case everywhere; no all caps.

## Shape and space

- Radii: 6px controls and rows (`var(--radius)`), 8-10px cards and menus, 12px
  panels, 999px pills and dots.
- Row height 28-32px for one line; two-line rows pad 7px top and bottom.
- Spacing steps: 2, 4, 6, 8, 12, 16, 20, 24, 40px.
- Reading width for a list page: 46rem. Never let a list run the full width
  of a wide window.
- Icons: 14-16px, 1.5-1.75 stroke, `currentColor`, drawn inline as SVG or
  taken from the SDK's icon components. No emoji.

## Components already in the plugin

Read `src/ui.tsx`, `src/model.ts` and `app.css` before writing new ones.

- `Group` - a collapsible group with a filled header pill and a count.
- `ThreadRow` - status glyph, title, provider icon, meta, time.
- `EmptyNote`, `useNow`, `useCollapsed`, `useProviderLookup`,
  `useProjectLookup`.
- `groupThreads`, `bucketOf`, `childrenByParent`, `descendants`,
  `statusPhrase`, `compactAge`, `needsYou`, `isBusy`, `waitingOnYou`.
- CSS: `.pl-button`, `.pl-button-primary`, `.pl-chip`, `.pl-segmented`,
  `.pl-row`, `.pl-group`, `.pl-dot`, `.pl-empty`, `.pl-mono`.

## Code rules

- Class names start with `pl-`. Plain CSS in the feature's own `.css` file.
  No Tailwind classes, no CSS-in-JS, no new dependencies.
- Each feature lives in `src/features/<name>.tsx` and `<name>.css`, and
  exports `register<Name>(app)`. Do not edit `app.tsx`, `app.css`,
  `src/ui.tsx`, `src/model.ts`, `src/prefs.ts`, `src/Settings.tsx`,
  `src/Island.tsx` or `themes/`: other people are changing them. Put helpers
  you need in your feature's files (a second file such as
  `src/features/<name>-model.ts` is fine, with tests beside it).
- Remember a view choice with `localStorage` under `polish.<feature>.<key>`,
  wrapped in try/catch.
- Every control is a real `button`, `a` or `input`, reachable by Tab, with a
  visible focus ring and an accessible name.
- Use the SDK's host components (`ThreadChat`, `experimental_ProviderIcon`,
  `experimental_ThreadStatusGlyph`, `experimental_SidebarNavigationIcon`) for
  host-owned things. The types are in
  `node_modules/@get-bb/plugin-sdk/bundled-types/bb-plugin-sdk-app.d.ts`.
