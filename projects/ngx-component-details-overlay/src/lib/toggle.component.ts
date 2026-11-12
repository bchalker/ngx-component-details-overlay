import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  inject,
  input,
} from '@angular/core';
import { ComponentDetailsService } from './component-details.service';
import type { TextSize, ToggleCorner } from './types';

let nextId = 0;

/**
 * A card with a switch that turns the overlay on and off, a hover-only option, and a
 * collapsed Accessibility section. Renders nothing when the overlay isn't available.
 */
@Component({
  selector: 'cdo-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: './toggle.scss',
  host: {
    '[attr.data-cdo-ignore]': "''",
    '[class.cdo-toggle]': 'service.available',
    '[class.cdo-toggle--on]': 'service.active()',
    '[class.cdo-toggle--contrast]': 'service.highContrast()',
    '[class.cdo-toggle--fixed]': 'service.available && !!position()',
    '[class]': 'cornerClass()',
    '[style.display]': "service.available ? null : 'none'",
    '[style.--_cdo-scale]': 'service.textScale()',
  },
  template: `
    @if (service.available) {
      <button
        type="button"
        role="switch"
        class="cdo-toggle__switch"
        [attr.aria-checked]="service.active()"
        [attr.aria-describedby]="description() ? id + '-desc' : null"
        title="Show each tagged component's name. Alt/Option-click a component to copy its name."
        (click)="service.toggle()"
      >
        <span class="cdo-toggle__label">{{ label() }}</span>
        <span class="cdo-toggle__track" aria-hidden="true"
          ><span class="cdo-toggle__thumb"></span
        ></span>
      </button>
      @if (description()) {
        <p class="cdo-toggle__desc" [id]="id + '-desc'">{{ description() }}</p>
      }
      @if (service.active() && showHoverOnly()) {
        <label class="cdo-toggle__option">
          <input
            type="checkbox"
            [checked]="service.hoverOnly()"
            (change)="service.setHoverOnly($any($event.target).checked)"
          />
          {{ hoverOnlyLabel() }}
        </label>
      }
      @if (showAccessibility()) {
        <details class="cdo-a11y">
          <summary class="cdo-a11y__summary">{{ accessibilityLabel() }}</summary>
          <div class="cdo-a11y__body">
            <fieldset class="cdo-a11y__group">
              <legend>Text size</legend>
              @for (size of sizes; track size.value) {
                <label class="cdo-a11y__choice">
                  <input
                    type="radio"
                    [name]="id + '-size'"
                    [checked]="service.textSize() === size.value"
                    (change)="service.setTextSize(size.value)"
                  />
                  {{ size.text }}
                </label>
              }
            </fieldset>
            <label class="cdo-a11y__row">
              <input
                type="checkbox"
                [checked]="service.highContrast()"
                (change)="service.setHighContrast($any($event.target).checked)"
              />
              High contrast badges
            </label>
            <label class="cdo-a11y__row">
              <input
                type="checkbox"
                [checked]="service.announce()"
                [attr.aria-describedby]="id + '-announce'"
                (change)="service.setAnnounce($any($event.target).checked)"
              />
              Announce names to screen readers
            </label>
            <p class="cdo-a11y__hint" [id]="id + '-announce'">
              Speaks a component's name when keyboard focus enters it. Badges follow focus, and
              Alt+Shift+C copies the focused component's name.
            </p>
          </div>
        </details>
      }
    }
  `,
})
export class ToggleComponent {
  protected readonly service = inject(ComponentDetailsService);

  /** Switch label. Default "Component details". */
  readonly label = input('Component details');
  /** Checkbox label. Default "Labels on hover only". */
  readonly hoverOnlyLabel = input('Labels on hover only');
  /** Show the hover-only checkbox while the overlay is on. Default `true`. */
  readonly showHoverOnly = input(true);
  /** Show the collapsed Accessibility section. Default `true`. */
  readonly showAccessibility = input(true);
  /** Label for the accessibility section. Default "Accessibility". */
  readonly accessibilityLabel = input('Accessibility');
  /** A short line under the switch that explains what it does. */
  readonly description = input<string>('');
  /** Pin the card to a corner of the viewport. Leave it out to place it inline. */
  readonly position = input<ToggleCorner | null>(null);

  protected readonly id = `cdo-toggle-${++nextId}`;
  protected readonly sizes: Array<{ value: TextSize; text: string }> = [
    { value: 'normal', text: 'Default' },
    { value: 'large', text: 'Large' },
    { value: 'xlarge', text: 'Extra large' },
  ];

  protected cornerClass() {
    const corner = this.position();
    return this.service.available && corner ? `cdo-toggle--${corner}` : '';
  }
}
