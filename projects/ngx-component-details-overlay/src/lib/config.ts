import { InjectionToken, makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import type { ComponentDetailsOptions } from './types';

export const COMPONENT_DETAILS_OPTIONS = new InjectionToken<ComponentDetailsOptions>(
  'COMPONENT_DETAILS_OPTIONS',
);

/** Sets options for the overlay. Optional: the defaults work without it. */
export function provideComponentDetails(
  options: ComponentDetailsOptions = {},
): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: COMPONENT_DETAILS_OPTIONS, useValue: options }]);
}
