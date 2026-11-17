// One palette for the suite. Categories always come with a shape and a word
// as well; colour is never the only carrier of meaning.
//
// standard: Okabe-Ito (Wong 2011), safe for red-green colour blindness.
// tritan:   for blue-yellow colour blindness (tritanopia); avoids blue/green
//           and yellow/pink pairs that tritan vision merges.
// high-contrast: maximum contrast against the background.

const OKABE_ITO = {
  orange: '#E69F00',
  skyBlue: '#56B4E9',
  bluishGreen: '#009E73',
  yellow: '#F0E442',
  blue: '#0072B2',
  vermillion: '#D55E00',
  reddishPurple: '#CC79A7',
  grey: '#999999',
};

/**
 * Category colours in a fixed order, per palette and background.
 * Pick by index (category 0, 1, 2 …) so every tool uses the same order.
 */
export const PALETTES = Object.freeze({
  standard: {
    light: ['#0072B2', '#D55E00', '#009E73', '#CC79A7', '#E69F00', '#56B4E9', '#000000'],
    dark: ['#56B4E9', '#E69F00', '#009E73', '#CC79A7', '#F0E442', '#D55E00', '#FFFFFF'],
  },
  tritan: {
    light: ['#1F5FA8', '#C2410C', '#111111', '#8B5CF6', '#B91C1C', '#0E7490', '#6B7280'],
    dark: ['#7DB7FF', '#FF8A4C', '#F5F5F5', '#C4A7FF', '#FF6B6B', '#5EEAD4', '#9CA3AF'],
  },
  'high-contrast': {
    light: ['#0033CC', '#B30000', '#000000', '#6600AA', '#8A4B00', '#006060', '#444444'],
    dark: ['#66CCFF', '#FFD400', '#FFFFFF', '#FF66FF', '#00FF7F', '#FF9966', '#CCCCCC'],
  },
});

export { OKABE_ITO };

export function categoryColors(paletteName, dark) {
  const p = PALETTES[paletteName] || PALETTES.standard;
  return dark ? p.dark : p.light;
}

// Cividis (Nuñez et al. 2018): perceptually uniform and readable with any
// colour vision. 9 stops, linearly interpolated.
const CIVIDIS = [
  [0, 34, 78], [18, 53, 112], [59, 73, 108], [87, 92, 109], [112, 113, 115],
  [138, 134, 120], [165, 156, 116], [195, 179, 105], [254, 232, 56],
];

/** Sequential colour for t in 0–1, as an rgb() string. */
export function cividis(t) {
  const x = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0)) * (CIVIDIS.length - 1);
  const i = Math.min(CIVIDIS.length - 2, Math.floor(x));
  const f = x - i;
  const a = CIVIDIS[i];
  const b = CIVIDIS[i + 1];
  const c = a.map((v, k) => Math.round(v + (b[k] - v) * f));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/** WCAG contrast ratio between two #rrggbb colours. */
export function contrastRatio(hexA, hexB) {
  const lum = (hex) => {
    const n = parseInt(hex.replace('#', ''), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  };
  const [l1, l2] = [lum(hexA), lum(hexB)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}
