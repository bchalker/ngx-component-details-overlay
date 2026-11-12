import { Directive, ElementRef, Renderer2, effect, inject, input } from '@angular/core';
import { ComponentDetailsService } from './component-details.service';

/**
 * Marks an element as the root of a named component.
 *
 *   <div cdoTag="Card" class="card">
 *
 * Writes `data-component="Card"` in development and nothing in a production build.
 */
@Directive({ selector: '[cdoTag]', standalone: true })
export class ComponentTagDirective {
  readonly cdoTag = input.required<string>();

  constructor() {
    const service = inject(ComponentDetailsService);
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const renderer = inject(Renderer2);
    effect(() => {
      const name = this.cdoTag();
      const attribute = service.options.attributeName;
      if (service.available && name) renderer.setAttribute(el, attribute, name);
      else renderer.removeAttribute(el, attribute);
    });
  }
}
