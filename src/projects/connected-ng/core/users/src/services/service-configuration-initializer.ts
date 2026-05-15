import { EnvironmentInjector, inject, Injectable, Provider, runInInjectionContext } from '@angular/core';
import { USER_SERVICE_CONFIG, UserServiceConfiguration } from './users/user-service';
import { ConfigurationProvider, CoreConfigurationProvider } from '@connected-ng/core';

@Injectable({
  providedIn: 'root',
})
export class CoreUsersConfigurationProvider extends ConfigurationProvider {
  override get configurationProviders(): Provider[] {
    return CoreUsersConfigurationProvider.getConfigurationTokenProviders();
  }

  override get configurationTokens() {
    return CoreUsersConfigurationProvider.getConfigurationTokens();
  }

  static getConfigurationTokens(): any[] {
    return [
      USER_SERVICE_CONFIG,
      ...CoreConfigurationProvider.getConfigurationTokens()
    ];
  }

  static getConfigurationTokenProviders(): Provider[] {
    return [
      { provide: USER_SERVICE_CONFIG, useValue: new UserServiceConfiguration() },
      ...CoreConfigurationProvider.getConfigurationTokenProviders()
    ];
  }
}
