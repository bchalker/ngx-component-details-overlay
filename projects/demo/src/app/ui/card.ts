import { Component, input } from '@angular/core';
import { ComponentTagDirective } from 'ngx-component-details-overlay';

@Component({
  selector: 'app-card',
  imports: [ComponentTagDirective],
  template: `
    <section cdoTag="Card" class="card">
      <header class="card__header">
        <h2>{{ title() }}</h2>
        <ng-content select="[actions]" />
      </header>
      <div class="card__body"><ng-content /></div>
    </section>
  `,
})
export class Card {
  readonly title = input.required<string>();
}

@Component({
  selector: 'app-stat-card',
  imports: [ComponentTagDirective],
  template: `
    <div cdoTag="StatCard" class="stat">
      <span class="stat__label">{{ label() }}</span>
      <span class="stat__value">{{ value() }}</span>
    </div>
  `,
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
}
