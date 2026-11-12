import { Component, computed, input } from '@angular/core';
import { ComponentTagDirective } from 'ngx-component-details-overlay';

export type Status = 'Tagged' | 'Untagged';

@Component({
  selector: 'app-status-badge',
  imports: [ComponentTagDirective],
  template: `<span cdoTag="StatusBadge" [class]="cls()">{{ status() }}</span>`,
})
export class StatusBadge {
  readonly status = input.required<Status>();
  protected readonly cls = computed(() => `status status--${this.status().toLowerCase()}`);
}
