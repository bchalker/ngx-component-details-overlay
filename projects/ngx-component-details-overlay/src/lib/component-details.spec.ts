import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideComponentDetails } from './config';
import { ComponentDetailsService } from './component-details.service';
import { ComponentTagDirective } from './component-tag.directive';
import { ToggleComponent } from './toggle.component';

@Component({
  imports: [ComponentTagDirective, ToggleComponent],
  template: `<div cdoTag="Card">Body</div>
    <cdo-toggle />`,
})
class Host {}

function setup(
  options: Parameters<typeof provideComponentDetails>[0] = { enabled: true, loadFont: false },
) {
  window.localStorage.clear();
  TestBed.configureTestingModule({ providers: [provideComponentDetails(options)] });
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  return fixture;
}

describe('component details overlay', () => {
  it('writes the tag attribute when enabled', async () => {
    const fixture = setup();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[data-component="Card"]')).not.toBeNull();
  });

  it('writes nothing and hides the toggle when disabled', async () => {
    const fixture = setup({ enabled: false });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[data-component]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="switch"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('cdo-toggle').style.display).toBe('none');
  });

  it('switches on, and saves every setting', () => {
    const fixture = setup();
    const service = TestBed.inject(ComponentDetailsService);
    fixture.nativeElement.querySelector('[role="switch"]').click();
    fixture.detectChanges();
    expect(service.active()).toBe(true);
    service.setTextSize('large');
    service.setHighContrast(true);
    service.setAnnounce(true);
    const saved = JSON.parse(window.localStorage.getItem('component-details-overlay') ?? '{}');
    expect(saved).toEqual({
      active: true,
      hoverOnly: false,
      textSize: 'large',
      highContrast: true,
      announce: true,
    });
    expect(service.textScale()).toBe(1.35);
  });

  it('keeps the Accessibility section collapsed', () => {
    const fixture = setup();
    const details = fixture.nativeElement.querySelector('details.cdo-a11y') as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect(details.querySelector('summary')?.textContent?.trim()).toBe('Accessibility');
  });
});
