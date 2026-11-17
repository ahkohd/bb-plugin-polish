# Polish

A clean, minimal bb in the style of [Capy](https://capy.ai), with palettes
after Conductor, Amp and Flexoki, plus the pages and shortcuts an agent
workspace should have.

## Theme

- A grey window with the main area on a rounded panel (or flat, if you
  prefer), neutral cool greys, hairline borders and no decorative shadows.
- Inter at weight 450, Capy's muted text levels, 6px radii.
- One accent for primary actions, the send button, switches, counts, links
  and focus: blue, graphite, violet, green or orange.
- Calm menus, palette and dialogs; plain tables; quiet inline code; a white
  composer card; neutral code colours.
- The sidebar footer's warning and update pills are hidden. Plugin errors,
  machine issues and updates stay in Settings.

Turn it on in Settings, Appearance, or run `bb theme set plugin:polish:polish`.
Switch back with `bb theme reset`.

## Pages

- **Overview**: a navigation item listing every thread that needs you, is in
  progress, is ready for review or ran in the last week, grouped as in Capy,
  with a project filter. Its badge counts the threads that need you.
- **Your threads**: the same at a glance on the New thread page.
- **Crew**: a tab beside any thread that started other threads, with each
  subthread's state and a progress bar, and a one-line summary above the
  composer that opens into the same list.
- **Needs-you pill**: a small pill at the top of the window while any thread
  waits on you. Click it to jump to the one that has waited longest; hover to
  see the rest.

## Commands

All are in Settings, Keyboard, where you can rebind them.

| Command | Default shortcut |
| --- | --- |
| Go to the next thread that needs you | Ctrl+Alt+J (Cmd+Option+J) |
| Open Overview | Ctrl+Alt+O (Cmd+Option+O) |
| Next palette | none |
| Toggle inset panel | none |
| Toggle compact density | none |
| Next accent colour | none |

## Settings

Settings, Polish: palette (Capy, Conductor, Amp or Flexoki), layout (inset
panel or flat), density (comfortable or compact), accent (the palette's own or
one of five) and the needs-you pill. They are saved per device.

## Development

`npm test` runs the unit tests; `bb plugin build` builds the plugin. The code
themes are Flexoki's VS Code themes recoloured (MIT, see
`themes/code/FLEXOKI-LICENSE`).
