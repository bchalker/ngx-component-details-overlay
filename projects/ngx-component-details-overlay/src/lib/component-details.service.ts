import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, computed, inject, Injectable, isDevMode, signal } from '@angular/core';
import { COMPONENT_DETAILS_OPTIONS } from './config';
import { ensureLatoFont } from './font';
import { TEXT_SCALE, type ComponentDetailsOptions, type TextSize } from './types';

export const DEFAULT_ATTRIBUTE = 'data-component';
export const DEFAULT_STORAGE_KEY = 'component-details-overlay';

interface Saved {
  active: boolean;
  hoverOnly: boolean;
  textSize: TextSize;
  highContrast: boolean;
  announce: boolean;
}

/** Reads and controls the overlay. Inject it anywhere. */
@Injectable({ providedIn: 'root' })
export class ComponentDetailsService {
  readonly options: ComponentDetailsOptions & {
    attributeName: string;
    autoContrast: boolean;
    copyOnAltClick: boolean;
    filter: (name: string) => boolean;
  };

  /** False in a production build unless `enabled` is set. Nothing renders or listens when false. */
  readonly available: boolean;

  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly state = signal<Saved>({
    active: false,
    hoverOnly: false,
    textSize: 'normal',
    highContrast: false,
    announce: false,
  });

  readonly active = computed(() => this.available && this.state().active);
  readonly hoverOnly = computed(() => this.state().hoverOnly);
  readonly textSize = computed(() => this.state().textSize);
  readonly textScale = computed(() => TEXT_SCALE[this.state().textSize]);
  readonly highContrast = computed(() => this.state().highContrast);
  readonly announce = computed(() => this.state().announce);

  constructor() {
    const given = inject(COMPONENT_DETAILS_OPTIONS, { optional: true }) ?? {};
    this.options = {
      attributeName: DEFAULT_ATTRIBUTE,
      autoContrast: true,
      copyOnAltClick: true,
      filter: () => true,
      ...given,
    };
    this.available = given.enabled ?? isDevMode();

    if (!this.available || !this.browser) return;
    if (given.loadFont !== false) ensureLatoFont();
    this.state.update((prev) => ({
      ...prev,
      active: given.defaultActive ?? prev.active,
      hoverOnly: given.defaultHoverOnly ?? prev.hoverOnly,
      ...this.read(),
    }));
  }

  setActive(active: boolean) {
    this.update({ active });
  }
  toggle() {
    this.update({ active: !this.state().active });
  }
  setHoverOnly(hoverOnly: boolean) {
    this.update({ hoverOnly });
  }
  setTextSize(textSize: TextSize) {
    this.update({ textSize });
  }
  setHighContrast(highContrast: boolean) {
    this.update({ highContrast });
  }
  setAnnounce(announce: boolean) {
    this.update({ announce });
  }

  // Save only when the user changes a setting, so the defaults never overwrite what was saved.
  private update(patch: Partial<Saved>) {
    if (!this.available) return;
    const next = { ...this.state(), ...patch };
    this.state.set(next);
    this.write(next);
  }

  private key() {
    return this.options.storageKey === undefined ? DEFAULT_STORAGE_KEY : this.options.storageKey;
  }

  private read(): Partial<Saved> {
    const key = this.key();
    if (!key) return {};
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Partial<Saved>;
      const out: Partial<Saved> = {};
      if (typeof parsed.active === 'boolean') out.active = parsed.active;
      if (typeof parsed.hoverOnly === 'boolean') out.hoverOnly = parsed.hoverOnly;
      if (typeof parsed.textSize === 'string' && parsed.textSize in TEXT_SCALE)
        out.textSize = parsed.textSize;
      if (typeof parsed.highContrast === 'boolean') out.highContrast = parsed.highContrast;
      if (typeof parsed.announce === 'boolean') out.announce = parsed.announce;
      return out;
    } catch {
      return {};
    }
  }

  private write(value: Saved) {
    const key = this.key();
    if (!key || !this.browser) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage blocked or full. The setting just won't survive a reload.
    }
  }
}
