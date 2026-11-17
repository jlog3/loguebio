// Server-safe: no React. Import from '@repo/access/boot' in layouts.

const COOKIE = 'loguebio_access';
const STORAGE_KEY = 'loguebio.access.v1';
const SETTINGS_VERSION = 1;

/**
 * Inline script for <head>: applies saved settings before the first paint, so
 * a person who chose dark, high contrast or large text never sees a flash of
 * the defaults. Kept dependency-free and tolerant of bad cookies.
 */
export const ACCESS_BOOT_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )${COOKIE}=([^;]*)/);var r=m?JSON.parse(decodeURIComponent(m[1])):JSON.parse(localStorage.getItem('${STORAGE_KEY}')||'null');var s=(r&&r.v===${SETTINGS_VERSION}&&r.s)||{};var mm=function(q){return window.matchMedia&&matchMedia(q).matches};var e=document.documentElement;var dark=s.theme==='dark'||((!s.theme||s.theme==='system')&&mm('(prefers-color-scheme: dark)'));e.dataset.theme=dark?'dark':'light';e.dataset.contrast=s.contrast==='high'?'high':'normal';e.dataset.motion=(s.motion==='reduce'||((!s.motion||s.motion==='system')&&mm('(prefers-reduced-motion: reduce)')))?'reduce':'allow';e.dataset.spacing=s.spacing==='wide'?'wide':'normal';e.dataset.palette=s.contrast==='high'?'high-contrast':(s.palette==='tritan'?'tritan':'standard');e.dataset.simpler=s.simpler?'true':'false';var t=[100,125,150,200].indexOf(s.textSize)>=0?s.textSize:100;e.dataset.textSize=String(t);e.style.setProperty('--access-text-scale',String(t/100));}catch(_){}})();`;
