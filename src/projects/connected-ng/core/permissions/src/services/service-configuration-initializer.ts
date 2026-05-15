import { Injectable, Provider } from '@angular/core';
import { ROLE_SERVICE_CONFIG, RoleServiceConfiguration } from './roles/role-service';
import { MEMBERSHIP_SERVICE_CONFIG, MembershipServiceConfiguration } from './membership/membership-service';
import { CLAIM_SERVICE_CONFIG, ClaimServiceConfiguration } from './claims/claim-service';
import { CLAIM_SCHEMA_SERVICE_CONFIG, ClaimSchemaServiceConfiguration } from './claims/claims-schema-service';
import { ConfigurationProvider, CoreConfigurationProvider } from '@connected-ng/core';

@Injectable({
  providedIn: 'root',
})
export class CorePermissionsConfigurationProvider extends ConfigurationProvider {
  override get configurationProviders(): Provider[] {
    return CorePermissionsConfigurationProvider.getConfigurationTokenProviders();
  }

  override get configurationTokens() {
    return CorePermissionsConfigurationProvider.getConfigurationTokens();
  }

  static getConfigurationTokens(): any[] {
    return [
      ROLE_SERVICE_CONFIG,
      MEMBERSHIP_SERVICE_CONFIG,
      CLAIM_SERVICE_CONFIG,
      CLAIM_SCHEMA_SERVICE_CONFIG,
      ...CoreConfigurationProvider.getConfigurationTokens()
    ];
  }

  static getConfigurationTokenProviders(): Provider[] {
    return [
      { provide: ROLE_SERVICE_CONFIG, useValue: new RoleServiceConfiguration() },
      { provide: MEMBERSHIP_SERVICE_CONFIG, useValue: new MembershipServiceConfiguration() },
      { provide: CLAIM_SERVICE_CONFIG, useValue: new ClaimServiceConfiguration() },
      { provide: CLAIM_SCHEMA_SERVICE_CONFIG, useValue: new ClaimSchemaServiceConfiguration() },
      ...CoreConfigurationProvider.getConfigurationTokenProviders()
    ];
  }
}
