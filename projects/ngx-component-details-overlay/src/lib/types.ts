/** Size of badge text and of the toggle card. `normal` is 1x, `large` 1.35x, `xlarge` 1.75x. */
export type TextSize = 'normal' | 'large' | 'xlarge';

export const TEXT_SCALE: Record<TextSize, number> = { normal: 1, large: 1.35, xlarge: 1.75 };

export interface CopyDetail {
  /** The label text that was copied. */
  name: string;
  /** The element the label belongs to. */
  element: Element;
  /** False if the clipboard write failed or the clipboard API isn't available. */
  copied: boolean;
}

export type ToggleCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface ComponentDetailsOptions {
  /**
   * Whether the overlay exists at all. Defaults to `true` in development and `false` in a
   * production build (Angular's `isDevMode()`). When it is false the toggle renders nothing,
   * `cdoTag` writes nothing and no listeners are attached.
   */
  enabled?: boolean;
  /** Attribute written by `cdoTag` and read by the overlay. Default `data-component`. */
  attributeName?: string;
  /** localStorage key for the saved settings. `null` turns saving off. */
  storageKey?: string | null;
  /** Whether the overlay starts switched on when nothing is saved. Default `false`. */
  defaultActive?: boolean;
  /** Whether hover-only mode starts on when nothing is saved. Default `false`. */
  defaultHoverOnly?: boolean;
  /**
   * Adjust badge and outline colours to meet WCAG contrast against the colour behind each
   * component: 4.5:1 for the badge text and 3:1 between the badge and the page. Default `true`.
   */
  autoContrast?: boolean;
  /** Load Lato, the default font, from Google Fonts when the overlay is available. Default `true`. */
  loadFont?: boolean;
  /** Alt/Option-click a labelled component to copy its name. Default `true`. */
  copyOnAltClick?: boolean;
  /** Called after a copy attempt. Use it to show your own toast. */
  onCopy?: (detail: CopyDetail) => void;
  /** Return `false` to hide a name. */
  filter?: (name: string) => boolean;
}
