import { accessibleBadgeColors, over, parseColor, toHex, type RGB, type RGBA } from './contrast';
import type { CopyDetail } from './types';

/** Elements inside a node with this attribute are never labelled. The overlay uses it on itself. */
export const IGNORE_ATTRIBUTE = 'data-cdo-ignore';

const DEPTH_COLORS = 5;

interface Entry {
  el: Element;
  name: string;
  key: number;
  /** Position in document order. */
  index: number;
  depth: number;
  /** Indexes of labelled ancestors, outermost first. */
  ancestors: number[];
  /** Ancestors that clip their content (overflow other than visible). */
  clips: Element[];
  /** The colour showing behind the element. Null when auto contrast is off. */
  under: RGB | null;
}

export interface Box {
  key: number;
  name: string;
  depth: number;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Badge top, relative to the box. */
  badgeY: number;
  /** Adjusted outline and badge colour. Unset when auto contrast is off. */
  color?: string;
  /** Adjusted badge text colour. */
  textColor?: string;
  /** clip-path that cuts out anything opaque sitting on top of the element. */
  clip?: string;
}

function sameBoxes(a: Box[], b: Box[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const p = a[i];
    const q = b[i];
    if (
      p.key !== q.key ||
      p.name !== q.name ||
      p.x !== q.x ||
      p.y !== q.y ||
      p.w !== q.w ||
      p.h !== q.h ||
      p.badgeY !== q.badgeY ||
      p.depth !== q.depth ||
      p.color !== q.color ||
      p.textColor !== q.textColor ||
      p.clip !== q.clip
    ) {
      return false;
    }
  }
  return true;
}

function readPx(style: CSSStyleDeclaration, prop: string, fallback: number) {
  const value = parseFloat(style.getPropertyValue(prop));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

// Same as the defaults in styles.scss. Used when the page doesn't set --cdo-color-N.
const DEFAULT_COLORS = ['#2563eb', '#db2777', '#d97706', '#16a34a', '#7c3aed'].map(
  (c) => parseColor(c) as RGB,
);
const DEFAULT_TEXT = parseColor('#ffffff') as RGB;

function readColor(style: CSSStyleDeclaration, prop: string, fallback: RGB): RGB {
  return parseColor(style.getPropertyValue(prop)) ?? fallback;
}

function readOpacity(style: CSSStyleDeclaration) {
  const value = parseFloat(style.getPropertyValue('--_cdo-badge-opacity'));
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1;
}

function ownBackground(el: Element, cache: Map<Element, RGBA | null>) {
  if (cache.has(el)) return cache.get(el) ?? null;
  const color = parseColor(getComputedStyle(el).backgroundColor);
  const result = color && color.a > 0 ? color : null;
  cache.set(el, result);
  return result;
}

const SAMPLES = 5;
const FAR = 5000;

/**
 * Finds the opaque elements that sit on top of a labelled element, so the outline and badge
 * can be cut away where they would otherwise draw across them (a modal, say). The layer
 * sits above everything, so it has to do this itself. Translucent covers such as a modal
 * backdrop are ignored: the outline still shows through those, which is intended.
 */
function coveredRects(
  el: Element,
  area: { left: number; top: number; right: number; bottom: number },
  extra: Array<[number, number]>,
  rectOf: (el: Element) => DOMRect,
  cache: Map<Element, RGBA | null>,
): DOMRect[] {
  if (typeof document.elementFromPoint !== 'function') return [];
  const found = new Set<Element>();
  const test = (x: number, y: number) => {
    const hit = document.elementFromPoint(x, y);
    if (!hit || el.contains(hit) || hit.contains(el)) return;
    // Climb to the outermost opaque ancestor below the shared one: a dialog, not the card inside it.
    let outer: Element | null = null;
    for (let node: Element | null = hit; node; node = node.parentElement) {
      if (node.contains(el)) break;
      const bg = ownBackground(node, cache);
      if (bg && bg.a >= 0.9) outer = node;
    }
    if (outer) found.add(outer);
  };
  const w = area.right - area.left;
  const h = area.bottom - area.top;
  for (let i = 0; i < SAMPLES; i++) {
    for (let j = 0; j < SAMPLES; j++) {
      test(
        area.left + 1 + ((w - 2) * i) / (SAMPLES - 1),
        area.top + 1 + ((h - 2) * j) / (SAMPLES - 1),
      );
    }
  }
  for (const [x, y] of extra) test(x, y);
  return [...found].map(rectOf);
}

function clipPathFor(holes: DOMRect[], originX: number, originY: number) {
  if (holes.length === 0) return undefined;
  const start = `${-FAR}px ${-FAR}px`;
  const parts = [start, `${FAR}px ${-FAR}px`, `${FAR}px ${FAR}px`, `${-FAR}px ${FAR}px`, start];
  for (const r of holes) {
    const x1 = r.left - originX;
    const y1 = r.top - originY;
    const x2 = r.right - originX;
    const y2 = r.bottom - originY;
    parts.push(
      `${x1}px ${y1}px`,
      `${x2}px ${y1}px`,
      `${x2}px ${y2}px`,
      `${x1}px ${y2}px`,
      `${x1}px ${y1}px`,
      start,
    );
  }
  return `polygon(evenodd, ${parts.join(', ')})`;
}

/** The colour a browser paints behind the page when nothing else covers it. */
function pageCanvas(): RGB {
  const root = getComputedStyle(document.documentElement).colorScheme;
  const prefersDark =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = root.includes('dark') && (!root.includes('light') || prefersDark);
  return dark ? { r: 18, g: 18, b: 18 } : { r: 255, g: 255, b: 255 };
}

/**
 * The colour behind an element: its own background, or the nearest ancestor's, with any
 * translucent layers blended on the way down. Background images and gradients aren't read.
 */
function effectiveBackground(el: Element, cache: Map<Element, RGBA | null>): RGB {
  const layers: RGBA[] = [];
  let result: RGB | null = null;
  for (let node: Element | null = el; node; node = node.parentElement) {
    const color = ownBackground(node, cache);
    if (!color) continue;
    if (color.a >= 1) {
      result = color;
      break;
    }
    layers.push(color);
  }
  let base = result ?? pageCanvas();
  for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
  return base;
}

export interface EngineOptions {
  /** The element the boxes are drawn in. Read for CSS custom properties. */
  layer: () => HTMLElement | null;
  attributeName: string;
  autoContrast: boolean;
  filter: (name: string) => boolean;
  copyOnAltClick: boolean;
  textScale: () => number;
  announceFocus: () => boolean;
  onBoxes: (boxes: Box[]) => void;
  onHover: (key: number | null) => void;
  onMessage: (text: string) => void;
  onCopy?: (detail: CopyDetail) => void;
}

/**
 * Finds tagged elements, measures them, and reports boxes to draw. Work is batched: any
 * number of events in one frame cost one collect (if the DOM changed) and one measure.
 * It touches the DOM only to read it, so the page behaves as it did before.
 */
export class OverlayEngine {
  private entries: Entry[] = [];
  private byElement = new Map<Element, Entry>();
  private keys = new WeakMap<Element, number>();
  private nextKey = 1;
  private palette = new Map<string, { color: string; text: string }>();
  private boxes: Box[] = [];

  private frame = 0;
  private needsCollect = true;
  private running = 0;
  private lastTransitionStart = 0;
  private cleanups: Array<() => void> = [];

  constructor(private readonly options: EngineOptions) {}

  start() {
    const o = this.options;
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => this.schedule(false)) : null;
    this.resizeObserver = resizeObserver;

    const mutationObserver = new MutationObserver((records) => {
      const layer = o.layer();
      if (records.some((r) => !layer || !layer.contains(r.target))) this.schedule(true);
    });
    mutationObserver.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [o.attributeName, 'class', 'style', 'hidden'],
    });

    const ownEvent = (event: Event) =>
      event.target instanceof Element && !!event.target.closest(`[${IGNORE_ATTRIBUTE}]`);
    const onTransitionStart = (event: Event) => {
      if (ownEvent(event)) return;
      this.running++;
      this.lastTransitionStart = performance.now();
      this.schedule(false);
    };
    const onTransitionEnd = (event: Event) => {
      if (ownEvent(event)) return;
      this.running = Math.max(0, this.running - 1);
      // A finished colour transition changes what the badges sit on, so read the
      // backgrounds again. Other transitions only move things.
      const property = (event as TransitionEvent).propertyName ?? '';
      this.schedule(o.autoContrast && /color|background|border|outline|opacity/.test(property));
    };
    document.addEventListener('transitionrun', onTransitionStart, true);
    document.addEventListener('transitionend', onTransitionEnd, true);
    document.addEventListener('transitioncancel', onTransitionEnd, true);

    // A theme switch usually changes the root element, which the body observer can't see.
    const rootObserver = new MutationObserver(() => this.schedule(true));
    rootObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme', 'data-color-scheme', 'data-mode'],
    });
    const scheme =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null;
    const onScheme = () => this.schedule(true);
    scheme?.addEventListener?.('change', onScheme);

    const onScrollOrResize = () => this.schedule(false);
    window.addEventListener('scroll', onScrollOrResize, { capture: true, passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });

    // Hover. The layer ignores the pointer, so we read the real element under it.
    const onMove = (event: MouseEvent) => o.onHover(this.entryFor(event.target)?.key ?? null);
    const onLeave = () => o.onHover(null);
    document.addEventListener('mousemove', onMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);

    // Keyboard focus. The badge follows focus, and the name can be spoken.
    const onFocusIn = (event: FocusEvent) => {
      const entry = this.entryFor(event.target);
      o.onHover(entry?.key ?? null);
      if (entry && o.announceFocus()) {
        const parent = entry.ancestors.length
          ? this.entries[entry.ancestors[entry.ancestors.length - 1]]
          : null;
        o.onMessage(
          parent ? `${entry.name} component, inside ${parent.name}` : `${entry.name} component`,
        );
      }
    };
    const onFocusOut = () => o.onHover(null);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);

    // Alt/Option-click copies a name. The badges can't take clicks, and taking over plain
    // clicks would break the page's own buttons and links, so a modifier click stands in.
    // Alt+Shift+C does the same for the focused component. Capture phase, so it runs first.
    const onClick = (event: MouseEvent) => {
      if (!event.altKey) return;
      const entry = this.entryFor(event.target);
      if (!entry) return;
      event.preventDefault();
      event.stopPropagation();
      this.copyName(entry);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.altKey && event.shiftKey && event.code === 'KeyC')) return;
      const entry = this.entryFor(document.activeElement);
      if (!entry) return;
      event.preventDefault();
      this.copyName(entry);
    };
    if (o.copyOnAltClick) {
      document.addEventListener('click', onClick, true);
      document.addEventListener('keydown', onKeyDown, true);
    }

    this.cleanups.push(() => {
      mutationObserver.disconnect();
      rootObserver.disconnect();
      resizeObserver?.disconnect();
      document.removeEventListener('transitionrun', onTransitionStart, true);
      document.removeEventListener('transitionend', onTransitionEnd, true);
      document.removeEventListener('transitioncancel', onTransitionEnd, true);
      scheme?.removeEventListener?.('change', onScheme);
      window.removeEventListener('scroll', onScrollOrResize, { capture: true });
      window.removeEventListener('resize', onScrollOrResize);
      document.removeEventListener('mousemove', onMove);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
    });

    this.run();
  }

  stop() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups = [];
    this.resizeObserver = null;
    this.boxes = [];
    this.options.onBoxes([]);
  }

  /** Re-read the page, for example after the text size changed. */
  refresh() {
    this.schedule(true);
  }

  private resizeObserver: ResizeObserver | null = null;

  private schedule(full: boolean) {
    if (full) this.needsCollect = true;
    if (!this.frame) this.frame = requestAnimationFrame(() => this.run());
  }

  private run() {
    this.frame = 0;
    if (this.needsCollect) {
      this.needsCollect = false;
      const list = this.collect();
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        for (const entry of list) this.resizeObserver.observe(entry.el);
      }
    }
    this.measure();
    if (this.running > 0) {
      // Give up on a transition that never reports its end (a removed element, say).
      if (performance.now() - this.lastTransitionStart > 5000) this.running = 0;
      else this.schedule(false);
    }
  }

  private keyFor(el: Element) {
    let key = this.keys.get(el);
    if (key === undefined) {
      key = this.nextKey++;
      this.keys.set(el, key);
    }
    return key;
  }

  /** The innermost labelled element that contains `target`. */
  private entryFor(target: EventTarget | null) {
    let node = target instanceof Element ? target : null;
    while (node) {
      const entry = this.byElement.get(node);
      if (entry) return entry;
      node = node.parentElement;
    }
    return null;
  }

  private copyName(entry: Entry) {
    const report = (copied: boolean) => {
      this.options.onCopy?.({ name: entry.name, element: entry.el, copied });
      this.options.onMessage(copied ? `Copied ${entry.name}` : `Could not copy ${entry.name}`);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(entry.name).then(
        () => report(true),
        () => report(false),
      );
    } else {
      report(false);
    }
  }

  /** Finds every labelled element. Runs on mount and after DOM changes. */
  private collect() {
    const { attributeName, autoContrast, filter } = this.options;
    const found: Array<{ el: Element; name: string }> = [];
    document.querySelectorAll(`[${attributeName}]`).forEach((el) => {
      if (el.closest(`[${IGNORE_ATTRIBUTE}]`)) return;
      const name = el.getAttribute(attributeName);
      if (name && filter(name)) found.push({ el, name });
    });

    const map = new Map<Element, Entry>();
    const overflowCache = new Map<Element, boolean>();
    const backgrounds = new Map<Element, RGBA | null>();
    const clips = (el: Element) => {
      let result = overflowCache.get(el);
      if (result === undefined) {
        const s = getComputedStyle(el);
        result = s.overflowX !== 'visible' || s.overflowY !== 'visible';
        overflowCache.set(el, result);
      }
      return result;
    };

    // querySelectorAll returns document order, so a parent is always mapped before its children.
    const list: Entry[] = found.map(({ el, name }, index) => {
      const ancestors: number[] = [];
      const clipList: Element[] = [];
      for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
        const parent = map.get(p);
        if (parent) ancestors.unshift(parent.index);
        if (p !== document.body && clips(p)) clipList.push(p);
      }
      const entry: Entry = {
        el,
        name,
        key: this.keyFor(el),
        index,
        depth: ancestors.length,
        ancestors,
        clips: clipList,
        under: autoContrast ? effectiveBackground(el, backgrounds) : null,
      };
      map.set(el, entry);
      return entry;
    });

    this.entries = list;
    this.byElement = map;
    return list;
  }

  /** Measures every labelled element and positions the boxes. */
  private measure() {
    const layer = this.options.layer();
    const textScale = this.options.textScale();
    const style = layer ? getComputedStyle(layer) : null;
    const badgeH = (style ? readPx(style, '--_cdo-badge-height', 16) : 16) * textScale;
    const charW = (style ? readPx(style, '--_cdo-badge-font-size', 10) : 10) * textScale * 0.62;
    const padX = (style ? readPx(style, '--_cdo-badge-padding-x', 4) : 4) * textScale;

    // Base colours and opacity as the page has them set, for the contrast adjustment.
    const opacity = style ? readOpacity(style) : 1;
    const preferredText = style
      ? readColor(style, '--cdo-badge-text-color', DEFAULT_TEXT)
      : DEFAULT_TEXT;
    const bases = DEFAULT_COLORS.map((fallback, i) =>
      style ? readColor(style, `--cdo-color-${i + 1}`, fallback) : fallback,
    );

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const bgCache = new Map<Element, RGBA | null>();
    const rectCache = new Map<Element, DOMRect>();
    const rectOf = (el: Element) => {
      let r = rectCache.get(el);
      if (!r) {
        r = el.getBoundingClientRect();
        rectCache.set(el, r);
      }
      return r;
    };

    // Badge position per entry index, so children can step below a parent's badge.
    const badges: Array<{ x: number; y: number; w: number } | undefined> = [];
    const next: Box[] = [];

    this.entries.forEach((entry, i) => {
      const r = rectOf(entry.el);
      if (r.width === 0 && r.height === 0) return;

      let left = r.left;
      let top = r.top;
      let right = r.right;
      let bottom = r.bottom;
      for (const clip of entry.clips) {
        const c = rectOf(clip);
        left = Math.max(left, c.left);
        top = Math.max(top, c.top);
        right = Math.min(right, c.right);
        bottom = Math.min(bottom, c.bottom);
      }
      left = Math.max(left, 0);
      top = Math.max(top, 0);
      right = Math.min(right, vw);
      bottom = Math.min(bottom, vh);
      if (right <= left || bottom <= top) return;

      // Start at the top-left corner, then step down past any ancestor badge it would cover.
      const badgeW = entry.name.length * charW + padX * 2;
      let y = top;
      for (const a of entry.ancestors) {
        const b = badges[a];
        if (!b) continue;
        const overlapsX = left < b.x + b.w && b.x < left + badgeW;
        const overlapsY = y < b.y + badgeH && b.y < y + badgeH;
        if (overlapsX && overlapsY) y = b.y + badgeH;
      }
      badges[i] = { x: left, y, w: badgeW };

      let color: string | undefined;
      let textColor: string | undefined;
      if (entry.under) {
        const base = bases[entry.depth % DEPTH_COLORS];
        const key = `${toHex(base)}|${toHex(entry.under)}|${toHex(preferredText)}|${opacity}`;
        let pair = this.palette.get(key);
        if (!pair) {
          const result = accessibleBadgeColors(base, entry.under, { opacity, preferredText });
          pair = { color: toHex(result.background), text: toHex(result.text) };
          this.palette.set(key, pair);
        }
        color = pair.color;
        textColor = pair.text;
      }

      const holes = coveredRects(
        entry.el,
        { left, top, right, bottom },
        [[left + 2, y + 2]],
        rectOf,
        bgCache,
      );

      next.push({
        clip: clipPathFor(holes, Math.round(left), Math.round(top)),
        key: entry.key,
        name: entry.name,
        depth: entry.depth,
        x: Math.round(left),
        y: Math.round(top),
        w: Math.round(right - left),
        h: Math.round(bottom - top),
        badgeY: Math.round(y - top),
        color,
        textColor,
      });
    });

    if (!sameBoxes(this.boxes, next)) {
      this.boxes = next;
      this.options.onBoxes(next);
    }
  }
}
