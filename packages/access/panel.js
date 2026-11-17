// The suite's settings form. Plain radios and checkboxes, so it works with a
// keyboard, screen reader, braille display, switch access and voice control
// ("click Dark"). Every change applies at once and is saved for all tools.
// Colours inherit from the page, so it fits any tool's theme.

import { createElement as h, useId } from 'react';
import { useAccess, updateSettings, resetSettings } from './settings.js';
import { canVibrate } from './announce.js';

const S = {
  group: { border: '1px solid color-mix(in srgb, currentColor 30%, transparent)', borderRadius: 10, padding: '10px 14px 12px', margin: '0 0 14px' },
  legend: { fontWeight: 650, padding: '0 6px' },
  hint: { margin: '2px 0 8px', fontSize: '0.9em', opacity: 0.85 },
  options: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  option: { display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '4px 12px 4px 8px', border: '1px solid color-mix(in srgb, currentColor 35%, transparent)', borderRadius: 8, cursor: 'pointer' },
  input: { width: 22, height: 22, margin: 0, accentColor: 'currentColor', flex: 'none' },
  section: { margin: '0 0 6px', fontSize: '1.05em' },
  button: { minHeight: 44, padding: '8px 16px', borderRadius: 8, border: '1px solid currentColor', background: 'transparent', color: 'inherit', font: 'inherit', cursor: 'pointer' },
  small: { fontSize: '0.9em', opacity: 0.85, margin: '8px 0 0' },
};

function Radios({ name, legend, hint, value, options, onChange }) {
  const id = useId();
  return h(
    'fieldset',
    { style: S.group, 'aria-describedby': hint ? id + '-hint' : undefined },
    h('legend', { style: S.legend }, legend),
    hint ? h('p', { id: id + '-hint', style: S.hint }, hint) : null,
    h(
      'div',
      { style: S.options },
      options.map((o) =>
        h(
          'label',
          { key: String(o.value), style: S.option },
          h('input', {
            type: 'radio',
            name: id + name,
            value: String(o.value),
            checked: value === o.value,
            onChange: () => onChange(o.value),
            style: S.input,
          }),
          h('span', null, o.label),
        ),
      ),
    ),
  );
}

function Check({ label, hint, checked, onChange, disabled }) {
  const id = useId();
  return h(
    'div',
    { style: { margin: '0 0 10px' } },
    h(
      'label',
      { style: { ...S.option, opacity: disabled ? 0.6 : 1 } },
      h('input', {
        type: 'checkbox',
        checked,
        disabled,
        onChange: (e) => onChange(e.target.checked),
        style: S.input,
        'aria-describedby': hint ? id + '-hint' : undefined,
      }),
      h('span', null, label),
    ),
    hint ? h('p', { id: id + '-hint', style: { ...S.hint, margin: '4px 0 0' } }, hint) : null,
  );
}

/**
 * The settings form.
 * @param {{ headingLevel?: 2|3|4, onReset?: () => void }} props
 */
export function AccessSettingsPanel(props) {
  const { settings: s, reducedMotion, server } = useAccess();
  const level = props && props.headingLevel ? props.headingLevel : 3;
  const head = (text) => h('h' + level, { style: S.section }, text);
  const set = (key) => (v) => updateSettings({ [key]: v });
  const vibrateSupported = !server && canVibrate();
  return h(
    'div',
    { className: 'access-settings' },
    head('Seeing'),
    h(Radios, {
      name: 'theme', legend: 'Colour scheme', value: s.theme, onChange: set('theme'),
      options: [{ value: 'system', label: 'Follow my device' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }],
    }),
    h(Radios, {
      name: 'contrast', legend: 'Contrast', value: s.contrast, onChange: set('contrast'),
      hint: 'High contrast uses the strongest colours and thicker outlines.',
      options: [{ value: 'normal', label: 'Normal contrast' }, { value: 'high', label: 'High contrast' }],
    }),
    h(Radios, {
      name: 'palette', legend: 'Colours for categories', value: s.palette, onChange: set('palette'),
      hint: 'Both sets also use shapes and labels, so colour is never the only clue. High contrast overrides this.',
      options: [
        { value: 'standard', label: 'Standard (safe for red-green colour blindness)' },
        { value: 'tritan', label: 'Blue-yellow colour blindness' },
      ],
    }),
    h(Radios, {
      name: 'textSize', legend: 'Text size', value: s.textSize, onChange: set('textSize'),
      options: [100, 125, 150, 200].map((v) => ({ value: v, label: v + '%' })),
    }),
    h(Radios, {
      name: 'spacing', legend: 'Text spacing', value: s.spacing, onChange: set('spacing'),
      hint: 'Wider spacing between letters, words and lines can make reading easier, for example with dyslexia.',
      options: [{ value: 'normal', label: 'Normal spacing' }, { value: 'wide', label: 'Wide spacing' }],
    }),
    head('Movement'),
    h(Radios, {
      name: 'motion', legend: 'Motion', value: s.motion, onChange: set('motion'),
      hint: reducedMotion ? 'Motion is reduced now.' : 'Motion is allowed now.',
      options: [
        { value: 'system', label: 'Follow my device' },
        { value: 'reduce', label: 'Reduce motion' },
        { value: 'allow', label: 'Allow motion' },
      ],
    }),
    h(Radios, {
      name: 'autoplay', legend: 'Start simulations by themselves', value: s.autoplay, onChange: set('autoplay'),
      hint: 'Simulations can always be paused, stepped and slowed down.',
      options: [
        { value: 'auto', label: 'Only if motion is allowed' },
        { value: 'never', label: 'Never: I press Play' },
        { value: 'always', label: 'Always' },
      ],
    }),
    head('Reading and pace'),
    h(Check, {
      label: 'Simpler interface', checked: s.simpler, onChange: set('simpler'),
      hint: 'Shows the main controls first and tucks the rest away. Nothing is removed: every feature stays one step away.',
    }),
    h(Radios, {
      name: 'readingTime', legend: 'Reading time', value: s.readingTime, onChange: set('readingTime'),
      hint: 'Longer keeps messages on screen longer and spaces out spoken updates.',
      options: [{ value: 'normal', label: 'Normal' }, { value: 'longer', label: 'Longer' }],
    }),
    h(Radios, {
      name: 'guidance', legend: 'Explanations', value: s.guidance, onChange: set('guidance'),
      options: [
        { value: 'beginner', label: 'Show explanations and the guide' },
        { value: 'expert', label: 'Expert: start with them hidden' },
      ],
    }),
    head('Sound and touch'),
    h(Check, {
      label: 'Sounds for changes', checked: s.sound, onChange: set('sound'),
      hint: 'Short tones when something changes, and an optional tone that follows the main result. Every sound also appears as text.',
    }),
    h(Check, {
      label: 'Vibration for changes', checked: s.vibration, onChange: set('vibration'),
      hint: vibrateSupported
        ? 'Short buzzes when something changes. Every buzz also appears as text.'
        : 'This browser cannot vibrate from a web page (iPhones and most computers cannot). Text and sound still work.',
    }),
    h(
      'div',
      { style: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginTop: 8 } },
      h('button', { type: 'button', style: S.button, onClick: () => { resetSettings(); if (props && props.onReset) props.onReset(); } }, 'Reset all settings'),
    ),
    h('p', { style: S.small }, 'Saved on this device only, and shared by every LogueBio tool. Nothing is sent anywhere.'),
  );
}
