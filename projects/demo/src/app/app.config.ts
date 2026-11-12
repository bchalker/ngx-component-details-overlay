import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideComponentDetails } from 'ngx-component-details-overlay';

export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), provideComponentDetails()],
};
