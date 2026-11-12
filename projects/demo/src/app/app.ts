import { Component, signal } from '@angular/core';
import {
  ComponentTagDirective,
  OverlayComponent,
  ToggleComponent,
} from 'ngx-component-details-overlay';
import { Card, StatCard } from './ui/card';
import { Modal } from './ui/modal';
import { StatusBadge, type Status } from './ui/status-badge';

interface Row {
  id: string;
  name: string;
  what: string;
  status: Status;
  code: string;
}

const ROWS: Row[] = [
  {
    id: 'Button',
    name: 'Button',
    what: 'Actions, including the one in this card',
    status: 'Tagged',
    code: '<button cdoTag="Button" class="btn">',
  },
  {
    id: 'StatCard',
    name: 'StatCard',
    what: 'A number with a label, at the top of the page',
    status: 'Tagged',
    code: '<div cdoTag="StatCard" class="stat">',
  },
  {
    id: 'Card',
    name: 'Card',
    what: 'A titled section, like this one',
    status: 'Tagged',
    code: '<section cdoTag="Card" class="card">',
  },
  {
    id: 'Table',
    name: 'Table',
    what: 'This table, which scrolls on its own',
    status: 'Tagged',
    code: '<div cdoTag="Table" class="table-wrap">',
  },
  {
    id: 'StatusBadge',
    name: 'StatusBadge',
    what: 'The pill in the last column',
    status: 'Tagged',
    code: '<span cdoTag="StatusBadge" class="status">',
  },
  {
    id: 'Modal',
    name: 'Modal',
    what: 'The dialog you are looking at, on its own layer',
    status: 'Tagged',
    code: '<div cdoTag="Modal" role="dialog">',
  },
  {
    id: 'Banner',
    name: 'Banner',
    what: 'The yellow notice near the top',
    status: 'Untagged',
    code: '<div class="promo">  (no tag, so the overlay skips it)',
  },
];

const REPO_URL = 'https://github.com/bchalker/ngx-component-details-overlay';
const REACT_URL = 'https://github.com/bchalker/component-details-overlay';

@Component({
  selector: 'app-root',
  imports: [
    ComponentTagDirective,
    OverlayComponent,
    ToggleComponent,
    Card,
    StatCard,
    Modal,
    StatusBadge,
  ],
  templateUrl: './app.html',
})
export class App {
  protected readonly rows = ROWS;
  protected readonly selected = signal<Row | null>(null);
  protected readonly repoUrl = REPO_URL;
  protected readonly reactUrl = REACT_URL;
  protected readonly offText =
    'Turn on to outline each tagged component and label it with its name.';
  protected readonly onText =
    'Outlining each tagged component with its name. Alt/Option-click one to copy it.';

  protected open(row: Row, event: MouseEvent) {
    // Alt-click copies a component name, so it should not also open the row.
    if (!event.altKey) this.selected.set(row);
  }
}
