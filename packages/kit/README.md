# @repo/kit

Accessible building blocks shared by every LogueBio tool, so each tool does not
grow its own copy:

- **LineChart**: SVG chart with a text summary, keyboard reading of every point
  (arrows, Home, End), a data table, marker shapes as well as colours, and
  "Hear this line" (pitch follows the value).
- **SortableTable**: sortable columns that say how they are sorted, an optional
  action column.
- **Tabs**: arrow-key tabs following the ARIA pattern.
- **Dialog**: native `<dialog>`; focus returns to the control that opened it, and
  Escape never closes it while you are typing in a text field.
- **sound**: `earcon` (rise, fall, chord, buzz, tick), `playSeries`, `setDrone`;
  silent unless sound is turned on in the shared settings.

```tsx
// app/layout.tsx, in this order
import "@repo/access/tokens.css";   // colours for every theme and contrast mode
import "@repo/kit/kit.css";         // the kit's controls
import "./globals.css";             // the app's own layout

import { LineChart, SortableTable, Tabs, Dialog, earcon } from "@repo/kit";
```

TypeScript source exported as is; Next.js compiles it without `transpilePackages`.
Needs `@repo/access` for settings, palette and announcements.
