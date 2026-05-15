import { inject, Injectable, InjectionToken } from '@angular/core';
import { configurationValue, ConnectedServiceBase } from '@connected-ng/core';
import { ClaimDescriptor, ClaimSchema, QueryClaimDescriptorsDto, QueryClaimSchemaDto } from './dtos/claim-dtos';

@Injectable({ providedIn: 'root' })
export class ClaimSchemaService extends ConnectedServiceBase {
    override getBaseUrl(): string {
        return this.configuration.baseUrl();
    }

    serviceUrl = 'services/membership/claims/schema';

    private configuration = inject(CLAIM_SCHEMA_SERVICE_CONFIG);

    query = this.createGetOperation<QueryClaimSchemaDto, ClaimSchema[]>('query');
    queryDescriptors = this.createGetOperation<QueryClaimDescriptorsDto, ClaimDescriptor[]>('query-claims');
}

export const CLAIM_SCHEMA_SERVICE_CONFIG = new InjectionToken<ClaimSchemaServiceConfiguration>('CLAIM_SCHEMA_SERVICE_CONFIG');

export class ClaimSchemaServiceConfiguration {
    baseUrl = configurationValue.required('Membership service url');
}
