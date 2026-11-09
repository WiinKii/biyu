import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Contrast check for the real token values (UI_UX §4.2 and §8, TESTING §8):
 * 4.5:1 for normal text, 3:1 for large text, controls and focus indicators.
 */

const css = readFileSync(resolve(process.cwd(), 'src/theme/tokens.css'), 'utf8');

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`Selector not found: ${selector}`);
  const open = css.indexOf('{', start);
  let depth = 0;
  let end = open;
  for (; end < css.length; end++) {
    if (css[end] === '{') depth++;
    if (css[end] === '}' && --depth === 0) break;
  }
  const body = css.slice(open + 1, end);
  return Object.fromEntries(
    [...body.matchAll(/--biyu-([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [
      m[1] ?? '',
      (m[2] ?? '').toLowerCase(),
    ]),
  );
}

function luminance(hex: string): number {
  const channel = (offset: number) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const themes = {
  light: block(':root {'),
  dark: block(":root[data-theme='dark']"),
};

const textTokens = [
  'text-primary',
  'text-secondary',
  'primary',
  'accent-cyan',
  'accent-violet',
  'success',
  'warning',
  'danger',
];
const backgrounds = ['background', 'surface', 'surface-muted'];

describe.each(Object.entries(themes))('%s theme', (_name, tokens) => {
  it.each(textTokens.flatMap((fg) => backgrounds.map((bg) => [fg, bg] as const)))(
    '%s on %s reaches 4.5:1',
    (fg, bg) => {
      const ratio = contrast(tokens[fg] ?? '', tokens[bg] ?? '');
      expect(ratio, `${fg} ${tokens[fg]} / ${bg} ${tokens[bg]}`).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('primary button text reaches 4.5:1 in every interaction state', () => {
    for (const state of ['primary', 'primary-hover', 'primary-pressed']) {
      expect(
        contrast(tokens['primary-contrast'] ?? '', tokens[state] ?? ''),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('focus ring and borders of controls reach 3:1 against the background', () => {
    expect(contrast(tokens['focus-ring'] ?? '', tokens.background ?? '')).toBeGreaterThanOrEqual(3);
    expect(contrast(tokens['focus-ring'] ?? '', tokens.surface ?? '')).toBeGreaterThanOrEqual(3);
  });
});

describe('theme definitions', () => {
  it('keeps the system-dark block identical to the explicit dark theme', () => {
    const systemDark = block(":root:not([data-theme='light'])");
    expect(systemDark).toEqual(themes.dark);
  });
});
