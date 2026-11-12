import { Component, input } from '@angular/core';
import { ComponentTagDirective } from 'ngx-component-details-overlay';

@Component({
  selector: 'app-button',
  imports: [ComponentTagDirective],
  template: `
    <button cdoTag="Button" type="button" [class]="'btn btn--' + variant()"><ng-content /></button>
  `,
})
export class Button {
  readonly variant = input<'primary' | 'secondary'>('primary');
}
