import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    providePrimeNG({
      theme: {
        preset: definePreset(Aura, {
          semantic: {
            primary: {
              50: '#f0f5ff',
              100: '#eaf1ff',
              200: '#ccdefb',
              300: '#9cbeed',
              400: '#6594ce',
              500: '#3267a7',
              600: '#22528f',
              700: '#1c457a',
              800: '#17365b',
              900: '#142c48',
              950: '#0b1c32',
            },
          },
        }),
        options: { darkModeSelector: false },
      },
    }),
    MessageService,
    ConfirmationService,
  ],
};
