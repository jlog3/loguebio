// One screen-reader announcer for the suite.
//
// Two hidden live regions (polite and assertive) are added to <body> on first
// use. Messages announce changes, not re-reads: an identical message is
// dropped, and polite messages with the same `topic` replace each other while
// they wait, so a fast simulation produces one up-to-date sentence instead of
// a flood. The gap between polite messages grows with "longer reading time".

const regions = { polite: null, assertive: null };
let gapMs = 1500;
let lastText = '';
let lastAt = 0;
let pending = new Map(); // topic -> text
let timer = null;
let lastFlush = 0;
const history = [];
const historyListeners = new Set();

function region(priority) {
  if (typeof document === 'undefined') return null;
  if (regions[priority] && document.body.contains(regions[priority])) return regions[priority];
  const el = document.createElement('div');
  el.setAttribute('aria-live', priority);
  el.setAttribute('aria-atomic', 'true');
  el.setAttribute('role', priority === 'assertive' ? 'alert' : 'status');
  el.dataset.accessAnnouncer = priority;
  Object.assign(el.style, {
    position: 'absolute', width: '1px', height: '1px', margin: '-1px', padding: '0',
    overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: '0',
  });
  document.body.appendChild(el);
  regions[priority] = el;
  return el;
}

function speak(priority, text) {
  const el = region(priority);
  if (!el) return;
  el.textContent = '';
  // A short delay makes screen readers treat the new text as a change.
  setTimeout(() => {
    el.textContent = text;
  }, 60);
  lastText = text;
  lastAt = Date.now();
  history.push({ at: lastAt, text, priority });
  if (history.length > 100) history.shift();
  for (const l of historyListeners) l();
}

function flush() {
  timer = null;
  if (pending.size === 0) return;
  const text = Array.from(pending.values()).join(' ');
  pending = new Map();
  lastFlush = Date.now();
  if (text === lastText && Date.now() - lastAt < 10000) return;
  speak('polite', text);
}

/**
 * Queues a message for screen readers.
 * @param {string} text
 * @param {{priority?: 'polite'|'assertive', topic?: string}} [opts]
 */
export function announce(text, opts = {}) {
  if (!text) return;
  const priority = opts.priority || 'polite';
  if (priority === 'assertive') {
    speak('assertive', text);
    return;
  }
  pending.set(opts.topic || text, text);
  if (timer) return;
  const wait = Math.max(0, gapMs - (Date.now() - lastFlush));
  timer = setTimeout(flush, wait);
}

/** Sets the minimum gap between polite announcements (ms). */
export function setAnnounceGap(ms) {
  gapMs = Math.max(250, ms);
}

/** Recent announcements, newest last, so a page can show them as text too. */
export function getAnnouncementHistory() {
  return history.slice();
}

export function subscribeAnnouncements(listener) {
  historyListeners.add(listener);
  return () => historyListeners.delete(listener);
}

/** Device vibration, if the person turned it on and the device supports it. */
export function canVibrate() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function vibrate(pattern, settings) {
  if (!settings || !settings.vibration || !canVibrate()) return false;
  try {
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}
