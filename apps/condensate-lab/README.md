# Condensate Lab

Watch proteins and RNA gather into droplets (liquid-liquid phase separation), the
way cells build compartments without walls. Change stickiness, temperature,
concentration, pH and crowding; bleach a droplet to test whether it is liquid
(FRAP); turn on disease mode to watch droplets harden; find the threshold where
droplets start; compare with textbook Flory-Huggins theory or your own FRAP data.

A simplified 2D teaching model with arbitrary units. The app lists what it leaves
out under "About this model".

```bash
npm run dev -w apps/condensate-lab      # from the repo root
```

## Layout

```
app/            page, layout (applies saved settings before first paint), styles
components/     CondensateLab (composition), SimCanvas, Controls, Playback, Status,
                Panels (Droplets, Over time, FRAP, Threshold, Theory, Log), Guide,
                Dialogs
lib/sim/        engine (Brownian dynamics, clusters, hardening, bleaching), params,
                frap (fit, CSV import), floryHuggins, rng
lib/store.ts    the one state model every view reads and every control writes
lib/describe.ts the text versions of the picture (summary, announcements, alt text)
lib/export.ts   CSV, JSON and SVG exports, each labelled as simulated data
lib/content.ts  presets, guide, glossary, model limits
```

Settings (theme, contrast, palette, text size, motion, autoplay, simpler interface,
reading time, sound, vibration) and the colour tokens come from the shared
`@repo/access` package, so they carry across every LogueBio tool. Charts, tables,
tabs, dialogs and sound come from `@repo/kit`, shared with the other tools.

## Every route reaches the same result

- **Picture:** shapes as well as colours (protein circles, RNA triangles, solid
  squares, bleached hollow), numbered droplet outlines.
- **Text:** a live summary under the picture, a sortable droplets table, a log of
  every change, and a table under each chart.
- **Keyboard:** in the picture, arrows move between droplets, B bleaches, Space
  plays or pauses; in charts, arrows read each point.
- **Screen readers:** throttled spoken updates (they can be turned off), droplets
  announced with size, contents, state and position.
- **Sound and touch (optional):** tones for changes, a tone whose pitch follows
  the share of protein in droplets, vibration where the device supports it.
- **Motion:** nothing starts by itself unless the settings allow it; pause, step,
  jump ahead, speed, and "picture updates once a second / only when paused".
