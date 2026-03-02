import { EnvironmentInjector, EnvironmentProviders, inject, Injectable, InjectionToken, Provider, runInInjectionContext } from '@angular/core';
import { ConfigurationService } from '../public-api';

import { USER_SERVICE_CONFIG, UserServiceConfiguration } from './users/user-service';
import { EVENT_SERVICE_CONFIG, EventServiceConfiguration } from './common/event-service';

export abstract class ConfigurationProvider {
  bindConfigurations(config: ConfigurationService, injector: EnvironmentInjector) {
    return runInInjectionContext(injector, () => {
      for (let token of this.configurationTokens) {
        let service = inject(token);

        config.bind(service);
      }
    });
  }

  abstract get configurationTokens(): any[];
  abstract get configurationProviders(): Provider[];

  static getProviders(candidate: ConfigurationProviderProvider): Provider[] {
    return candidate.getConfigurationTokenProviders();
  }
}

export interface ConfigurationProviderProvider {
  getConfigurationTokens(): any[];
  getConfigurationTokenProviders(): Provider[];
}

@Injectable({
  providedIn: 'root',
})
export class CoreConfigurationProvider extends ConfigurationProvider {
  override get configurationProviders(): Provider[] {
    return CoreConfigurationProvider.getConfigurationTokenProviders();
  }

  override get configurationTokens() {
    return CoreConfigurationProvider.getConfigurationTokens();
  }

  static getConfigurationTokens(): any[] {
    return [USER_SERVICE_CONFIG, EVENT_SERVICE_CONFIG];
  }

  static getConfigurationTokenProviders(): Provider[] {
    return [
      { provide: USER_SERVICE_CONFIG, useValue: new UserServiceConfiguration() },
      { provide: EVENT_SERVICE_CONFIG, useValue: new EventServiceConfiguration() }
    ];
  }
}
