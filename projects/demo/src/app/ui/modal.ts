import { Component, input, output } from '@angular/core';
import { ComponentTagDirective } from 'ngx-component-details-overlay';
import { Button } from './button';

@Component({
  selector: 'app-modal',
  imports: [ComponentTagDirective, Button],
  host: { '(document:keydown.escape)': 'closed.emit()' },
  template: `
    @if (open()) {
      <div class="modal-backdrop" (click)="closed.emit()">
        <div
          cdoTag="Modal"
          class="modal"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="title()"
          (click)="$event.stopPropagation()"
        >
          <h2>{{ title() }}</h2>
          <div class="modal__body"><ng-content /></div>
          <div class="modal__footer">
            <app-button variant="secondary" (click)="closed.emit()">Close</app-button>
          </div>
        </div>
      </div>
    }
  `,
})
export class Modal {
  readonly title = input.required<string>();
  readonly open = input(false);
  readonly closed = output<void>();
}
