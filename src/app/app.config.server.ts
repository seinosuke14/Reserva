import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideServerRoutesConfig, provideServerRouting } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.server.routes';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    provideNoopAnimations(),
    provideServerRouting(serverRoutes),
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
