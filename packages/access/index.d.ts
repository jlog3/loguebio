import type { ReactElement } from 'react';

export interface AccessSettings {
  /** Colour scheme. */
  theme: 'system' | 'light' | 'dark';
  contrast: 'normal' | 'high';
  /** Category colours: standard (Okabe-Ito) or tuned for blue-yellow colour blindness. */
  palette: 'standard' | 'tritan';
  /** Percent. */
  textSize: 100 | 125 | 150 | 200;
  spacing: 'normal' | 'wide';
  motion: 'system' | 'reduce' | 'allow';
  /** Whether simulations start by themselves. 'auto' follows the motion setting. */
  autoplay: 'auto' | 'never' | 'always';
  /** Main controls first, the rest one step away. */
  simpler: boolean;
  readingTime: 'normal' | 'longer';
  guidance: 'beginner' | 'expert';
  sound: boolean;
  vibration: boolean;
}

export type PaletteName = 'standard' | 'tritan' | 'high-contrast';

export interface ResolvedAccess {
  settings: AccessSettings;
  reducedMotion: boolean;
  dark: boolean;
  highContrast: boolean;
  /** Whether a simulation may start without the person pressing Play. */
  autoplay: boolean;
  paletteName: PaletteName;
  /** 1 normally, larger with "longer reading time". Multiply message durations by it. */
  readingFactor: number;
  beginner: boolean;
  systemContrastMore: boolean;
  /** True only during server rendering, before the person's settings are known. */
  server?: boolean;
}

export const DEFAULT_SETTINGS: Readonly<AccessSettings>;
export const SETTINGS_VERSION: number;
/** Inline <head> script that applies saved settings before first paint. */
export const ACCESS_BOOT_SCRIPT: string;
export function sanitizeSettings(input: unknown): AccessSettings;
export function getSettings(): Readonly<AccessSettings>;
export function updateSettings(partial: Partial<AccessSettings>): void;
export function resetSettings(): void;
export function subscribeSettings(listener: () => void): () => void;
export function resolveSettings(s: AccessSettings): ResolvedAccess;
/** React hook: settings resolved against system preferences. */
export function useAccess(): ResolvedAccess;
/** Sets data-theme, data-contrast, data-motion, data-spacing, data-palette, data-simpler, data-text-size and --access-text-scale on <html>. */
export function applySettingsToDocument(resolved: ResolvedAccess): void;

export const PALETTES: Readonly<Record<PaletteName, { light: string[]; dark: string[] }>>;
export const OKABE_ITO: Readonly<Record<string, string>>;
/** Category colours in the suite's fixed order. */
export function categoryColors(paletteName: PaletteName, dark: boolean): string[];
/** Perceptually uniform sequential colour (cividis) for t in 0–1. */
export function cividis(t: number): string;
/** WCAG contrast ratio of two #rrggbb colours. */
export function contrastRatio(hexA: string, hexB: string): number;

export interface AnnounceOptions {
  priority?: 'polite' | 'assertive';
  /** Polite messages with the same topic replace each other while waiting. */
  topic?: string;
}
export function announce(text: string, opts?: AnnounceOptions): void;
export function setAnnounceGap(ms: number): void;
export function getAnnouncementHistory(): { at: number; text: string; priority: 'polite' | 'assertive' }[];
export function subscribeAnnouncements(listener: () => void): () => void;
export function canVibrate(): boolean;
export function vibrate(pattern: number | number[], settings: AccessSettings): boolean;

export interface AccessSettingsPanelProps {
  /** Heading level for the section titles. Default 3. */
  headingLevel?: 2 | 3 | 4;
  onReset?: () => void;
}
/** The suite's settings form: applies and saves every change at once. */
export function AccessSettingsPanel(props?: AccessSettingsPanelProps): ReactElement;
