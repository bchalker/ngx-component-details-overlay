# Setting up ngx-component-details-overlay (for AI coding tools)

This file is written for an AI coding agent such as Claude Code, Cursor, Copilot, Windsurf or Codex. If a person asked you to "add ngx-component-details-overlay to this project", follow these steps in order.

The overlay is a development tool. With it switched on, every tagged component on the page gets an outline and a badge with its name. It is off in production builds by default.

## 1. Check the project

- Read `package.json`. The project must use Angular with standalone components and signals. It is tested on Angular 22 and uses APIs from 17.2. If the project is older, stop and tell the person.
- Find the package manager from the lockfile (`package-lock.json` is npm, `pnpm-lock.yaml` is pnpm, `yarn.lock` is yarn).
- Find the root component, usually `src/app/app.ts` or `app.component.ts`.

## 2. Install

```bash
npm install ngx-component-details-overlay
```

Use the project's own package manager. If the package isn't found on npm, tell the person it needs to be built from source (see README.md) and stop.

## 3. Add the toggle and the overlay

In the root component, import `OverlayComponent` and `ToggleComponent` and put them at the end of the template:

```ts
import { OverlayComponent, ToggleComponent } from 'ngx-component-details-overlay';

@Component({
  // ...
  imports: [/* existing imports */ OverlayComponent, ToggleComponent],
  template: `
    <!-- existing template -->
    <cdo-toggle position="bottom-right" />
    <cdo-overlay />
  `,
})
```

If the component uses `templateUrl`, add the two lines to that HTML file instead. Do not wrap or move any existing markup.

No provider is needed. The defaults work. To change options, add `provideComponentDetails({ ... })` to the providers in `app.config.ts` (see README.md for the list).

## 4. Tag the shared components

Tag the components other pages reuse: buttons, cards, tables, inputs, modals, nav, badges. Import `ComponentTagDirective` and add `cdoTag="Name"` to the root element of the component's template:

```ts
imports: [ComponentTagDirective],
template: `<section cdoTag="Card" class="card"><ng-content /></section>`,
```

Rules:

- Use the component's own name in PascalCase, the same as the class without any suffix (`CardComponent` becomes `Card`). If a design system or Figma file uses a different name, ask which to use.
- Put the tag on the outermost element of the template, once per component.
- Do not tag page-level or one-off components unless asked. Do not tag a component that has no element of its own.
- Do not remove or rename existing attributes.

## 5. Verify

Run the app's build (`ng build`) and fix any errors you caused. If you can run the app, switch the toggle on and check that tagged components show a badge.

## 6. Report

Tell the person which files you changed, which components you tagged, and which you skipped. Remind them the overlay is off in production builds, and that `provideComponentDetails({ enabled: ... })` turns it on for an internal test build.
