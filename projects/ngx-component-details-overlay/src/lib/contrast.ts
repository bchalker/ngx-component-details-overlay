// WCAG 2.x contrast math, plus a search that nudges a badge colour until it passes.

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface RGBA extends RGB {
  a: number;
}

export const WHITE: RGB = { r: 255, g: 255, b: 255 };
export const DARK_TEXT: RGB = { r: 17, g: 24, b: 39 };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function fromHex(hex: string): RGBA | null {
  const digits = hex.slice(1);
  if (!/^[0-9a-f]+$/i.test(digits)) return null;
  let full = digits;
  if (digits.length === 3 || digits.length === 4) full = [...digits].map((c) => c + c).join('');
  if (full.length !== 6 && full.length !== 8) return null;
  const part = (i: number) => parseInt(full.slice(i, i + 2), 16);
  return { r: part(0), g: part(2), b: part(4), a: full.length === 8 ? part(6) / 255 : 1 };
}

function channel(token: string) {
  return token.endsWith('%') ? (parseFloat(token) / 100) * 255 : parseFloat(token);
}

function alphaOf(token: string | undefined) {
  if (token === undefined) return 1;
  const value = token.endsWith('%') ? parseFloat(token) / 100 : parseFloat(token);
  return Number.isFinite(value) ? clamp(value, 0, 1) : 1;
}

function fromRgbFunction(text: string): RGBA | null {
  const match = /^rgba?\(\s*([^)]+)\)$/.exec(text);
  if (!match) return null;
  const parts = match[1].split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const [r, g, b] = parts.slice(0, 3).map(channel);
  if (![r, g, b].every(Number.isFinite)) return null;
  return {
    r: clamp(Math.round(r), 0, 255),
    g: clamp(Math.round(g), 0, 255),
    b: clamp(Math.round(b), 0, 255),
    a: alphaOf(parts[3]),
  };
}

let canvasContext: CanvasRenderingContext2D | null | undefined;

// Last resort for formats the quick parsers don't cover (named colours, oklch(), color-mix()).
// The canvas converts any CSS colour to sRGB for us. Not available in every environment.
function fromCanvas(text: string): RGBA | null {
  if (typeof document === 'undefined') return null;
  if (canvasContext === undefined) {
    try {
      canvasContext =
        document.createElement('canvas').getContext('2d', { willReadFrequently: true }) ?? null;
    } catch {
      canvasContext = null;
    }
  }
  const ctx = canvasContext;
  if (!ctx) return null;

  // An unparseable value leaves fillStyle unchanged, so two different starting points
  // would give two different results.
  ctx.fillStyle = '#000';
  ctx.fillStyle = text;
  const first = ctx.fillStyle;
  ctx.fillStyle = '#fff';
  ctx.fillStyle = text;
  if (first !== ctx.fillStyle) return null;

  ctx.clearRect(0, 0, 1, 1);
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return { r, g, b, a: a / 255 };
}

const parsed = new Map<string, RGBA | null>();

/** Parses a CSS colour. Returns null when it can't be read. */
export function parseColor(input: string): RGBA | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;
  if (parsed.has(text)) return parsed.get(text) ?? null;

  let result: RGBA | null;
  if (text === 'transparent') result = { r: 0, g: 0, b: 0, a: 0 };
  else if (text.startsWith('#')) result = fromHex(text);
  else if (text.startsWith('rgb')) result = fromRgbFunction(text);
  else result = fromCanvas(text);

  parsed.set(text, result);
  return result;
}

export function toHex({ r, g, b }: RGB) {
  const part = (n: number) =>
    Math.round(clamp(n, 0, 255))
      .toString(16)
      .padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** Relative luminance, as WCAG defines it. */
export function luminance({ r, g, b }: RGB) {
  const lin = (value: number) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Contrast ratio between two opaque colours, from 1 to 21. */
export function contrast(a: RGB, b: RGB) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** `color` drawn at `alpha` over an opaque `under`. */
export function blend(color: RGB, under: RGB, alpha: number): RGB {
  return {
    r: color.r * alpha + under.r * (1 - alpha),
    g: color.g * alpha + under.g * (1 - alpha),
    b: color.b * alpha + under.b * (1 - alpha),
  };
}

/** A translucent colour drawn over an opaque one. */
export function over(top: RGBA, under: RGB): RGB {
  return blend(top, under, top.a);
}

function toHsl({ r, g, b }: RGB): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h * 60, s, l];
}

function fromHsl(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

export interface AccessibleOptions {
  /** Minimum text contrast. Default 4.5, the WCAG AA level for normal text. */
  minTextContrast?: number;
  /** Minimum contrast between the badge and what's behind it. Default 3 (WCAG 1.4.11). */
  minBoundaryContrast?: number;
  /** Badge opacity. Default 1. Translucent badges blend with the page, which lowers contrast. */
  opacity?: number;
  /** Text colour to try first. White and a near-black follow it. */
  preferredText?: RGB;
}

export interface BadgeColors {
  background: RGB;
  text: RGB;
  /** True when the background had to change. */
  adjusted: boolean;
}

/**
 * Picks a badge background and text colour that meet WCAG contrast on top of `under`.
 * Keeps the base colour when it already passes. Otherwise it keeps the hue and moves the
 * lightness the shortest distance that passes.
 */
export function accessibleBadgeColors(
  base: RGB,
  under: RGB,
  options: AccessibleOptions = {},
): BadgeColors {
  const minText = options.minTextContrast ?? 4.5;
  const minBoundary = options.minBoundaryContrast ?? 3;
  const opacity = options.opacity ?? 1;
  const textChoices = [options.preferredText, WHITE, DARK_TEXT].filter(
    (c): c is RGB => c !== undefined,
  );

  const textFor = (background: RGB): RGB | null => {
    const shown = blend(background, under, opacity);
    if (contrast(shown, under) < minBoundary) return null;
    for (const text of textChoices) {
      if (contrast(blend(text, under, opacity), shown) >= minText) return text;
    }
    return null;
  };

  const direct = textFor(base);
  if (direct) return { background: base, text: direct, adjusted: false };

  const [h, s, l0] = toHsl(base);
  const steps = Array.from({ length: 101 }, (_, i) => i / 100).sort(
    (a, b) => Math.abs(a - l0) - Math.abs(b - l0),
  );
  for (const l of steps) {
    const background = fromHsl(h, s, l);
    const text = textFor(background);
    if (text) return { background, text, adjusted: true };
  }

  // Nothing near the hue works (a mid-grey page with a translucent badge, for example).
  const lightUnder = luminance(under) > 0.5;
  const black: RGB = { r: 0, g: 0, b: 0 };
  return {
    background: lightUnder ? black : WHITE,
    text: lightUnder ? WHITE : black,
    adjusted: true,
  };
}
