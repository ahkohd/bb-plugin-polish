# Polish

A clean, calm bb in the manner of Capy, T3 Code, Conductor and Amp: a theme
with palettes and layout options, plus the pages and shortcuts an agent
workspace should have.

## Theme

Turn it on in Settings, Appearance, or run `bb theme set plugin:polish:polish`.
Switch back with `bb theme reset`.

- A grey window with the thread and its side panel on separate rounded cards.
- Palettes: Capy (cool greys and blue), Conductor (black and green), Amp (deep
  teal and orange) and Flexoki (ink on paper). The accent follows the palette
  or one you pick.
- Backdrops behind the sidebar: plain, glow, aurora or grain.
- Inter or your system font, sans or serif headings, and a 13, 14 or 15px
  transcript.
- Calm menus, palette and dialogs; plain tables; rounded code blocks with
  neutral colours.
- The sidebar footer's warning and update pills are hidden. Plugin errors,
  machine issues and updates stay in Settings.

## Pages and pieces

- **Overview**: every thread that needs you, is in progress, is ready for
  review or ran in the last week, as a list or a board. Move with `j` and `k`,
  peek at a thread beside the list and answer it there, filter with `/` or
  by project.
- **New thread page**: a pulse line with a 14-day sparkline, your projects,
  four starters, and what needs you.
- **Polish dock**: a compact sidebar navigation: a New thread button and one
  row of icons. Pick it in Settings, Appearance, Navigation.
- **Crew**: a tab beside any thread that started other threads, with filters,
  live timers and a progress bar.
- **Needs-you pill**: shows while any thread waits on you; click to jump to
  the one that has waited longest.
- **Status line**: running and unread counts with the time, under the main
  area.
- **Zen mode**: the thread alone, with the sidebar and side panel hidden.

## Commands

All are in Settings, Keyboard, where you can rebind them.

| Command | Default shortcut |
| --- | --- |
| Go to the next thread that needs you | Ctrl+Alt+J (Cmd+Option+J) |
| Open Overview | Ctrl+Alt+O (Cmd+Option+O) |
| Toggle zen mode | Ctrl+Alt+Z (Cmd+Option+Z) |
| Next palette, backdrop or accent | none |
| Toggle inset panel or compact density | none |

## Settings

Settings, Polish: look (palette, accent, backdrop), layout (main area, side
panel, density, status line), text (font, headings, reading size) and
attention (needs-you pill). They are saved per device.

## Development

`docs/DESIGN.md` holds the design rules and `docs/HARNESS.md` how to build and
screenshot in a test box. `npm test` runs the unit tests; `bb plugin build`
builds the plugin. The code themes are Flexoki's VS Code themes recoloured
(MIT, see `themes/code/FLEXOKI-LICENSE`).
