// One settings source for every LogueBio tool.
//
// Saved in a cookie so a person's choices follow them from tool to tool:
// in development every tool is a different localhost port, and ports share
// cookies; in production the cookie is set for .loguebio.com, which all the
// tool subdomains share. Nothing is sent to a server; the cookie is only read
// by the page. localStorage keeps a copy in case cookies are blocked.

import { useSyncExternalStore } from 'react';

export const SETTINGS_VERSION = 1;
const COOKIE = 'loguebio_access';
const STORAGE_KEY = 'loguebio.access.v1';

/** @type {import('./index').AccessSettings} */
export const DEFAULT_SETTINGS = Object.freeze({
  theme: 'system',
  contrast: 'normal',
  palette: 'standard',
  textSize: 100,
  spacing: 'normal',
  motion: 'system',
  autoplay: 'auto',
  simpler: false,
  readingTime: 'normal',
  guidance: 'beginner',
  sound: false,
  vibration: false,
});

const CHOICES = {
  theme: ['system', 'light', 'dark'],
  contrast: ['normal', 'high'],
  palette: ['standard', 'tritan'],
  textSize: [100, 125, 150, 200],
  spacing: ['normal', 'wide'],
  motion: ['system', 'reduce', 'allow'],
  autoplay: ['auto', 'never', 'always'],
  readingTime: ['normal', 'longer'],
  guidance: ['beginner', 'expert'],
};

/** Keeps only known keys with allowed values; anything else falls back to the default. */
export function sanitizeSettings(input) {
  const out = { ...DEFAULT_SETTINGS };
  if (!input || typeof input !== 'object') return out;
  for (const key of Object.keys(CHOICES)) {
    if (CHOICES[key].includes(input[key])) out[key] = input[key];
  }
  for (const key of ['simpler', 'sound', 'vibration']) {
    if (typeof input[key] === 'boolean') out[key] = input[key];
  }
  return out;
}

function cookieDomain() {
  if (typeof location === 'undefined') return '';
  const h = location.hostname;
  return h === 'loguebio.com' || h.endsWith('.loguebio.com') ? '; Domain=.loguebio.com' : '';
}

function readRaw() {
  if (typeof document === 'undefined') return null;
  try {
    const m = document.cookie.match(new RegExp('(?:^|; )' + COOKIE + '=([^;]*)'));
    if (m) return JSON.parse(decodeURIComponent(m[1]));
  } catch {
    /* unreadable cookie: fall through */
  }
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return JSON.parse(s);
  } catch {
    /* storage blocked */
  }
  return null;
}

let current = DEFAULT_SETTINGS;
let loaded = false;
const listeners = new Set();

function load() {
  const raw = readRaw();
  const next = sanitizeSettings(raw && raw.v === SETTINGS_VERSION ? raw.s : null);
  if (JSON.stringify(next) !== JSON.stringify(current)) current = Object.freeze(next);
  loaded = true;
}

function emit() {
  for (const l of listeners) l();
}

/** Current settings (read once from the cookie on first use). */
export function getSettings() {
  if (!loaded && typeof document !== 'undefined') load();
  return current;
}

/** Saves a change and tells every subscriber, including other tabs of the same tool. */
export function updateSettings(partial) {
  const next = Object.freeze(sanitizeSettings({ ...getSettings(), ...partial }));
  current = next;
  const payload = JSON.stringify({ v: SETTINGS_VERSION, s: next });
  try {
    const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
    document.cookie =
      COOKIE + '=' + encodeURIComponent(payload) + '; Path=/; Max-Age=31536000; SameSite=Lax' + cookieDomain() + secure;
  } catch {
    /* cookies blocked */
  }
  try {
    localStorage.setItem(STORAGE_KEY, payload);
  } catch {
    /* storage blocked */
  }
  try {
    if (channel) channel.postMessage('changed');
  } catch {
    /* ignore */
  }
  emit();
}

export function resetSettings() {
  updateSettings(DEFAULT_SETTINGS);
}

let channel = null;
let wired = false;
function wire() {
  if (wired || typeof window === 'undefined') return;
  wired = true;
  const reload = () => {
    const before = current;
    load();
    if (before !== current) emit();
  };
  try {
    channel = new BroadcastChannel('loguebio-access');
    channel.onmessage = reload;
  } catch {
    channel = null;
  }
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) reload();
  });
  // Another tool (another port or subdomain) may have changed the cookie while this tab was hidden.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') reload();
  });
  window.addEventListener('focus', reload);
  for (const q of ['(prefers-reduced-motion: reduce)', '(prefers-color-scheme: dark)', '(prefers-contrast: more)']) {
    try {
      window.matchMedia(q).addEventListener('change', emitSystem);
    } catch {
      /* old browsers */
    }
  }
}

let systemVersion = 0;
function emitSystem() {
  systemVersion++;
  emit();
}

export function subscribeSettings(listener) {
  wire();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function media(q) {
  try {
    return typeof window !== 'undefined' && window.matchMedia(q).matches;
  } catch {
    return false;
  }
}

/**
 * Turns choices into what the interface should do, combining the person's
 * declared choices with their system settings. What the person declares wins.
 */
export function resolveSettings(s) {
  const systemReduce = media('(prefers-reduced-motion: reduce)');
  const reducedMotion = s.motion === 'reduce' || (s.motion === 'system' && systemReduce);
  const dark = s.theme === 'dark' || (s.theme === 'system' && media('(prefers-color-scheme: dark)'));
  const highContrast = s.contrast === 'high';
  const autoplay = s.autoplay === 'always' ? true : s.autoplay === 'never' ? false : !reducedMotion;
  return {
    settings: s,
    reducedMotion,
    dark,
    highContrast,
    autoplay,
    paletteName: highContrast ? 'high-contrast' : s.palette,
    /** Multiplier for how long messages stay and how far apart announcements are. */
    readingFactor: s.readingTime === 'longer' ? 2.5 : 1,
    beginner: s.guidance === 'beginner',
    systemContrastMore: media('(prefers-contrast: more)'),
  };
}

let resolvedCache = { key: '', value: null };
function getResolved() {
  const s = getSettings();
  const key = JSON.stringify(s) + ':' + systemVersion;
  if (resolvedCache.key !== key) resolvedCache = { key, value: resolveSettings(s) };
  return resolvedCache.value;
}

const serverResolved = Object.freeze({
  settings: DEFAULT_SETTINGS,
  reducedMotion: false,
  dark: false,
  highContrast: false,
  autoplay: false, // never start before the page knows the person's settings
  paletteName: 'standard',
  readingFactor: 1,
  beginner: true,
  systemContrastMore: false,
  server: true,
});

/** React hook: the person's settings, resolved against their system preferences. */
export function useAccess() {
  return useSyncExternalStore(subscribeSettings, getResolved, () => serverResolved);
}

/** Writes the settings onto <html> as data attributes for CSS to use. */
export function applySettingsToDocument(resolved) {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  el.dataset.theme = resolved.dark ? 'dark' : 'light';
  el.dataset.contrast = resolved.highContrast ? 'high' : 'normal';
  el.dataset.motion = resolved.reducedMotion ? 'reduce' : 'allow';
  el.dataset.spacing = resolved.settings.spacing;
  el.dataset.palette = resolved.paletteName;
  el.dataset.simpler = resolved.settings.simpler ? 'true' : 'false';
  el.dataset.textSize = String(resolved.settings.textSize);
  el.style.setProperty('--access-text-scale', String(resolved.settings.textSize / 100));
}

export { ACCESS_BOOT_SCRIPT } from './boot.js';
