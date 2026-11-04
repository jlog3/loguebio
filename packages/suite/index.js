// @repo/suite: what every LogueBio app needs to know about the others.
//
// One list of tools and ports, the URLs built from it, and the "All tools" link
// each tool shows. Plain JavaScript (no JSX, no build step) so every app can use
// it as-is, whether it is TypeScript or JavaScript, Tailwind or CSS modules.
// The link carries its own small stylesheet for the same reason.

import { createElement as h } from 'react';

/** Port the landing page (the tool directory) uses in `npm run dev`. */
export const HOME_DEV_PORT = 3002;

/**
 * Every tool. `slug` is its subdomain in production (<slug>.loguebio.com) and
 * its folder under apps/; `port` is its fixed port in `npm run dev` (keep in
 * step with the -p flag in apps/<slug>/package.json).
 */
export const TOOLS = [
  { slug: 'cancer-pathway-visualizer', name: 'Cancer Pathway Visualizer', port: 3003 },
  { slug: 'chromaloop-simulator', name: 'ChromaLoop', port: 3004 },
  { slug: 'condensate-lab', name: 'Condensate Lab', port: 3005 },
  { slug: 'foldflow-dynamics', name: 'FoldFlow Dynamics', port: 3006 },
  { slug: 'mag', name: 'MAG Dashboard', port: 3007 },
  { slug: 'omniharmony', name: 'OmniHarmony', port: 3008 },
  { slug: 'pangenome-voyager', name: 'Pangenome Voyager', port: 3009 },
  { slug: 'waddington-landscape-explorer', name: 'Waddington Explorer', port: 3010 },
];

function isDev() {
  return process.env.NODE_ENV === 'development';
}

/**
 * Address of the landing page. Set NEXT_PUBLIC_LOGUEBIO_HOME_URL to point
 * somewhere else (for example a preview deployment).
 */
export function homeUrl() {
  const override = process.env.NEXT_PUBLIC_LOGUEBIO_HOME_URL;
  if (override) return override;
  return isDev() ? `http://localhost:${HOME_DEV_PORT}` : 'https://loguebio.com';
}

/** Address of one tool: its local port in development, its subdomain otherwise. */
export function toolUrl(slug) {
  const tool = TOOLS.find((t) => t.slug === slug);
  if (isDev() && tool) return `http://localhost:${tool.port}`;
  return `https://${slug}.loguebio.com`;
}

const CSS = `
.lb-suite-nav{position:fixed;z-index:90;right:12px;bottom:12px;margin:0;padding:0}
.lb-suite-nav[data-placement="bottom-left"]{right:auto;left:12px}
.lb-suite-nav[data-placement="top-right"]{bottom:auto;top:12px}
.lb-suite-nav[data-placement="top-left"]{bottom:auto;top:12px;right:auto;left:12px}
.lb-suite-link{display:inline-flex;align-items:center;gap:8px;box-sizing:border-box;min-height:44px;min-width:44px;padding:0 16px;border-radius:999px;font:600 14px/1.2 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;letter-spacing:0;text-decoration:none;box-shadow:0 4px 18px rgba(0,0,0,.28);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
.lb-suite-link[data-theme="dark"]{background:rgba(3,7,17,.92);color:#f1f3fb;border:1px solid rgba(241,243,251,.45)}
.lb-suite-link[data-theme="light"]{background:rgba(255,255,255,.95);color:#111827;border:1px solid rgba(17,24,39,.7)}
.lb-suite-link:hover{text-decoration:underline;text-underline-offset:3px}
.lb-suite-link[data-theme="dark"]:focus-visible{outline:3px solid #7fdcff;outline-offset:3px}
.lb-suite-link[data-theme="light"]:focus-visible{outline:3px solid #0b5cad;outline-offset:3px}
@media (forced-colors: active){.lb-suite-link{background:Canvas;color:LinkText;border:1px solid LinkText;box-shadow:none}}
@media print{.lb-suite-nav{display:none}}
`;

/**
 * "← All tools": a link back to the landing page, fixed in a corner.
 * Render it once, as the first thing inside <body>, so it is the first stop
 * when someone presses Tab.
 *
 *   <SuiteNav />                                   bottom-right, dark
 *   <SuiteNav placement="top-right" theme="light" />
 *
 * Bottom-right by default because Next.js puts its dev badge bottom-left.
 */
export function SuiteNav({ placement = 'bottom-right', theme = 'dark', label = 'All tools' } = {}) {
  return h(
    'nav',
    { className: 'lb-suite-nav', 'data-placement': placement, 'aria-label': 'LogueBio tools' },
    // href + precedence: React 19 moves this into <head> and keeps one copy.
    // Inside <body>, browser extensions such as Dark Reader insert their own
    // <style> next to it, which made hydration fail.
    h('style', { href: 'lb-suite-nav', precedence: 'default' }, CSS),
    h(
      'a',
      { className: 'lb-suite-link', 'data-theme': theme, href: homeUrl() },
      h('span', { 'aria-hidden': 'true' }, '←'),
      label,
    ),
  );
}
