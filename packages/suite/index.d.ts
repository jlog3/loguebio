import type { ReactElement } from 'react';

export interface Tool {
  /** Subdomain in production and folder under apps/. */
  slug: string;
  /** Display name. */
  name: string;
  /** Fixed port in `npm run dev`. */
  port: number;
}

/** Port the landing page uses in `npm run dev`. */
export const HOME_DEV_PORT: number;

/** Every tool in the suite. */
export const TOOLS: readonly Tool[];

/** Address of the landing page (the tool directory). */
export function homeUrl(): string;

/** Address of one tool: localhost:<port> in development, <slug>.loguebio.com otherwise. */
export function toolUrl(slug: string): string;

export interface SuiteNavProps {
  /** Corner to sit in. Default 'bottom-right' (Next.js puts its dev badge bottom-left). */
  placement?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  /** 'dark' for dark apps, 'light' for light ones. Default 'dark'. */
  theme?: 'dark' | 'light';
  /** Link text after the arrow. Default 'All tools'. */
  label?: string;
}

/** "← All tools": a link back to the landing page, fixed in a corner. */
export function SuiteNav(props?: SuiteNavProps): ReactElement;
