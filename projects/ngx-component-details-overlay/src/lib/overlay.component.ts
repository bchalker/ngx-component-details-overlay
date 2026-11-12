import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  NgZone,
  ViewEncapsulation,
  afterNextRender,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ComponentDetailsService } from './component-details.service';
import { IGNORE_ATTRIBUTE, OverlayEngine, type Box } from './overlay-engine';

const DEPTH_COLORS = 5;

/**
 * Draws an outline and a name badge on every tagged element. Add `<cdo-overlay />` once, near
 * the root of your app. It draws on its own fixed layer that ignores the pointer.
 */
@Component({
  selector: 'cdo-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: './overlay.scss',
  template: `
    @if (service.active()) {
      <div role="status" aria-live="polite" aria-atomic="true" class="cdo-sr-only" data-cdo-ignore>
        {{ message() }}
      </div>
      <div
        #layer
        class="cdo-layer"
        [class.cdo-layer--hover-only]="service.hoverOnly()"
        [class.cdo-layer--contrast]="service.highContrast()"
        [style.--_cdo-scale]="service.textScale()"
        aria-hidden="true"
        data-cdo-ignore
      >
        @for (box of boxes(); track box.key) {
          <div
            class="cdo-box"
            [class]="'cdo-box cdo-depth-' + ((box.depth % ${DEPTH_COLORS}) + 1)"
            [class.cdo-box--hovered]="box.key === hovered()"
            [style.transform]="'translate(' + box.x + 'px, ' + box.y + 'px)'"
            [style.width.px]="box.w"
            [style.height.px]="box.h"
            [style.clip-path]="box.clip ?? null"
            [style.--_cdo-color]="box.color ?? null"
            [style.--_cdo-text]="box.textColor ?? null"
          >
            <span class="cdo-badge" [style.top.px]="box.badgeY">{{ box.name }}</span>
          </div>
        }
      </div>
    }
  `,
  host: { '[attr.data-cdo-ignore]': "''" },
})
export class OverlayComponent {
  protected readonly service = inject(ComponentDetailsService);
  private readonly zone = inject(NgZone);
  private readonly injector = inject(Injector);
  private readonly layer = viewChild<ElementRef<HTMLElement>>('layer');

  protected readonly boxes = signal<Box[]>([]);
  protected readonly hovered = signal<number | null>(null);
  protected readonly message = signal('');

  private engine: OverlayEngine | null = null;

  constructor() {
    // Start the engine once the layer is in the page, stop it when the overlay is switched off.
    effect((onCleanup) => {
      if (!this.service.active()) return;
      let started: OverlayEngine | null = null;
      const ref = afterNextRender(
        () => {
          const options = this.service.options;
          started = new OverlayEngine({
            layer: () => this.layer()?.nativeElement ?? null,
            attributeName: options.attributeName,
            autoContrast: options.autoContrast,
            filter: options.filter,
            copyOnAltClick: options.copyOnAltClick,
            textScale: () => this.service.textScale(),
            announceFocus: () => this.service.announce(),
            onBoxes: (next) => this.boxes.set(next),
            onHover: (key) => this.hovered.set(key),
            onMessage: (text) => this.say(text),
            onCopy: options.onCopy,
          });
          this.engine = started;
          this.zone.runOutsideAngular(() => started?.start());
        },
        { injector: this.injector },
      );
      onCleanup(() => {
        ref.destroy();
        started?.stop();
        this.engine = null;
        this.hovered.set(null);
      });
    });

    // Badge sizes change with the text size, so measure again.
    effect(() => {
      this.service.textScale();
      this.engine?.refresh();
    });
  }

  private say(text: string) {
    // Clear first so a repeated message is announced again.
    this.message.set('');
    window.setTimeout(() => this.message.set(text), 40);
  }
}

export { IGNORE_ATTRIBUTE };
