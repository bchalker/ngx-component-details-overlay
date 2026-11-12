# ngx-component-details-overlay

A dev-only overlay for Angular apps. Switch it on and every tagged component on the page gets a dashed outline and a badge with its name, as written in code. Use it to check a live page against a design file, find elements built outside your component library, and give the whole team the same names to use in Slack and tickets.

This is the Angular version. There is also a [React version](https://github.com/bchalker/component-details-overlay).

It is off in production builds by default: no overlay, no listeners, no font request, no saved settings, and no attributes in your markup.

## The quickest way: ask your AI coding tool

Paste this into Claude Code, Cursor, Copilot, Windsurf or Codex, from inside your project:

```text
Add ngx-component-details-overlay to this project. Install it with npm, then read node_modules/ngx-component-details-overlay/AI-SETUP.md and follow it.
```

The tool installs the package, adds the overlay and the toggle to your root component, and tags your shared components. [AI-SETUP.md](AI-SETUP.md) is the file it follows.

## Install

```bash
npm install ngx-component-details-overlay
```

Built and tested with Angular 22. It uses signal inputs, signal queries and the new control flow, which exist from Angular 17.2, so older versions may work. I haven't tested them.

If the package isn't on npm yet, build it from source and install the output folder:

```bash
git clone https://github.com/bchalker/ngx-component-details-overlay
cd ngx-component-details-overlay
npm ci && npm run build:lib
# then, in your project:
npm install /path/to/ngx-component-details-overlay/dist/ngx-component-details-overlay
```

## Quick start

Add the overlay and the toggle once, in your root component.

```ts
import { Component } from '@angular/core';
import { OverlayComponent, ToggleComponent } from 'ngx-component-details-overlay';

@Component({
  selector: 'app-root',
  imports: [OverlayComponent, ToggleComponent],
  template: `
    <router-outlet />
    <cdo-toggle position="bottom-right" />
    <cdo-overlay />
  `,
})
export class App {}
```

Then tag your components with the `cdoTag` directive, on the root element of each one.

```ts
import { Component } from '@angular/core';
import { ComponentTagDirective } from 'ngx-component-details-overlay';

@Component({
  selector: 'app-card',
  imports: [ComponentTagDirective],
  template: `<section cdoTag="Card" class="card"><ng-content /></section>`,
})
export class Card {}
```

That writes `data-component="Card"` in development and nothing in a production build. Nested components get different colours, five levels deep.

Only tagged components get a label. An element with no tag has no outline, which is how you spot things built outside your component set.

## Usage

Every piece of the screen has a name in the code. When you use that name in Slack, a ticket or a review, the developer knows exactly what you mean. No screenshot, no guessing, no back and forth.

It also helps product owners, QA testers and other non-technical teammates communicate clearly with developers, and gives them a small look at how the screen is built.

1. Switch on Component details in the bottom-right corner.
2. Find the badge on the thing you mean. The badge is its name.
3. Alt-click it (Option-click on Mac) to copy the name, then paste it into your message. If it sits inside another component, add that first, like `Card › Button`.

| Vague                                         | Clear                                                      |
| --------------------------------------------- | ---------------------------------------------------------- |
| "The pill in that table looks off on mobile." | "`Table › StatusBadge` is cut off at 320px on /customers." |

No badge on something? It is untagged, so say that: "the banner on /customers is untagged." A developer will know to look at it.

## Using it

- The toggle switches the overlay on and off. The setting is saved in localStorage.
- Hover a component to give its outline a solid line and bring its badge forward.
- "Labels on hover only" keeps every outline but shows one badge at a time.
- Alt/Option-click a component to copy its name. The `onCopy` option gets the result, so you can show your own message.
- Outlines of elements an opaque modal covers are hidden, so the modal stays clean. A translucent backdrop still shows the labels behind it.

## Configuration

Everything is optional. Pass options with `provideComponentDetails` in your app config.

```ts
import { provideComponentDetails } from 'ngx-component-details-overlay';

export const appConfig: ApplicationConfig = {
  providers: [provideComponentDetails({ defaultActive: true, attributeName: 'data-ui' })],
};
```

| Option             | Default                       | What it does                                                        |
| ------------------ | ----------------------------- | ------------------------------------------------------------------- |
| `enabled`          | `isDevMode()`                 | Whether the overlay exists at all.                                  |
| `attributeName`    | `'data-component'`            | Attribute written by `cdoTag` and read by the overlay.              |
| `storageKey`       | `'component-details-overlay'` | localStorage key for saved settings. `null` turns saving off.       |
| `defaultActive`    | `false`                       | Start switched on when nothing is saved.                            |
| `defaultHoverOnly` | `false`                       | Start in hover-only mode when nothing is saved.                     |
| `autoContrast`     | `true`                        | Adjust badge colours to meet WCAG contrast.                         |
| `loadFont`         | `true`                        | Load Lato from Google Fonts. Turn off if your app already loads it. |
| `copyOnAltClick`   | `true`                        | Alt/Option-click copies a component name.                           |
| `onCopy`           | none                          | Called after a copy attempt with `{ name, element, copied }`.       |
| `filter`           | none                          | Return `false` to hide a name.                                      |

The toggle takes `label`, `description`, `hoverOnlyLabel`, `showHoverOnly`, `showAccessibility`, `accessibilityLabel` and `position` (`top-left`, `top-right`, `bottom-left` or `bottom-right`). Leave `position` out to place it inline.

To read or control the overlay from code, inject `ComponentDetailsService`. It has signals for `active`, `hoverOnly`, `textSize`, `highContrast` and `announce`, plus setters and `toggle()`.

### Turning it on in production

`enabled` defaults to `isDevMode()`, so a production build has the overlay off. To keep it for an internal test build, set it from your environment:

```ts
provideComponentDetails({ enabled: environment.showComponentDetails });
```

Set that flag only in the build you want it in. When it is false, the toggle is hidden, `cdoTag` writes nothing, and nothing listens or loads. The code is still in the bundle, so if you need it gone entirely, add the toggle and overlay behind a build-time condition or an `@defer` block that your production configuration removes.

### Theming

Every colour, size and position is a CSS custom property with a default. Set any of them on `:root` or on a wrapper.

```css
:root {
  --cdo-color-1: #0f766e;
  --cdo-badge-font-size: 12px;
  --cdo-badge-height: 20px;
  --cdo-z-index: 9000;
  --cdo-toggle-bg: #111;
  --cdo-toggle-accent: #5eead4;
}
```

| Group                    | Properties                                                                                                                                                                                                                                                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Outline colours by depth | `--cdo-color-1` to `--cdo-color-5`                                                                                                                                                                                                                                                                                      |
| Outlines                 | `--cdo-outline-width`, `--cdo-outline-style`, `--cdo-outline-hover-width`                                                                                                                                                                                                                                               |
| Badge                    | `--cdo-badge-text-color`, `--cdo-badge-font-family`, `--cdo-badge-font-size`, `--cdo-badge-font-weight`, `--cdo-badge-height`, `--cdo-badge-padding-x`, `--cdo-badge-radius`, `--cdo-badge-opacity`, `--cdo-badge-offset-x`, `--cdo-badge-offset-y`, `--cdo-badge-shadow`                                               |
| Layer                    | `--cdo-z-index`                                                                                                                                                                                                                                                                                                         |
| Toggle                   | `--cdo-toggle-bg`, `--cdo-toggle-bg-hover`, `--cdo-toggle-text`, `--cdo-toggle-accent`, `--cdo-toggle-track-off`, `--cdo-toggle-thumb-off`, `--cdo-toggle-thumb-on`, `--cdo-toggle-font-family`, `--cdo-toggle-font-size`, `--cdo-toggle-radius`, `--cdo-toggle-padding`, `--cdo-toggle-offset`, `--cdo-toggle-z-index` |

### Accessibility

The toggle card has a collapsed **Accessibility** section. Every choice is saved in localStorage with the other settings.

- **Text size.** Default, Large (1.35x) or Extra large (1.75x). It scales the badges and the toggle card together, and badge positions are measured at the larger size so labels don't overlap.
- **High contrast badges.** Solid black badges with a white edge and thicker solid outlines, for pages where the colour badges are hard to pick out.
- **Announce names to screen readers.** When keyboard focus enters a tagged component, a polite live region says its name and the component it sits inside, for example "Button component, inside Card". Badges follow keyboard focus too, so the overlay works without a mouse. Alt+Shift+C copies the focused component's name, and the result is announced.

Also built in:

- The switch is a real `role="switch"` button. The section uses native `details`, radio buttons and checkboxes, with visible focus rings and controls at least 24px tall.
- The overlay layer is `aria-hidden`, so the badges don't clutter a screen reader's view of the page. Only the live region is read.
- In Windows High Contrast and other forced-colour modes, badges and the toggle get system-colour borders so they stay visible.
- Animations stop when `prefers-reduced-motion` is set.

With `autoContrast` on, the overlay checks the real colour behind each tagged component and adjusts the badge to meet WCAG 2.x: 4.5:1 for the badge text, and 3:1 between the badge and the page. It doesn't read background images or gradients. A badge over a photo is judged against the colour behind the photo.

I have checked the live region updates, but I haven't tested with a real screen reader.

## How it works

The overlay draws on its own fixed layer that ignores the pointer, so clicks, scrolling and layout behave as they did before. It finds tagged elements, measures them with `getBoundingClientRect`, and updates on DOM changes, resizes, scrolling and CSS transitions, batched to one pass per animation frame. It runs outside Angular's zone, and works with zoneless apps.

## Limitations

- Names come from tags only. The React version has a mode that reads names from React internals, and there is no Angular equivalent.
- Colours are read from the element's background. Gradients and images aren't.
- Server-side rendering is safe: nothing touches the DOM until the browser takes over.

## Development

```bash
npm ci
npm start          # the demo app on http://localhost:4200
npm test           # library tests
npm run build:lib  # builds dist/ngx-component-details-overlay
```

The library is in `projects/ngx-component-details-overlay` and the demo app is in `projects/demo`.

To publish: `npm run build:lib && npm publish dist/ngx-component-details-overlay`.

## License

MIT
