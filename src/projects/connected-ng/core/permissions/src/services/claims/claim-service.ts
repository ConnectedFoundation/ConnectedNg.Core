import { inject, Injectable, InjectionToken } from '@angular/core';
import { configurationValue, ConnectedServiceBase, PrimaryKeyDto } from '@connected-ng/core';
import { Claim, InsertClaimDto, QueryClaimDto } from './dtos/claim-dtos';

@Injectable({ providedIn: 'root' })
export class ClaimService extends ConnectedServiceBase {
    override getBaseUrl(): string {
        return this.configuration.baseUrl();
    }

    serviceUrl = 'services/membership/claims';

    private configuration = inject(CLAIM_SERVICE_CONFIG);

    insert = this.createPostOperation<InsertClaimDto, number>('insert');
    delete = this.createDeleteOperation<PrimaryKeyDto<number>, void>('delete');
    select = this.createGetOperation<PrimaryKeyDto<number>, Claim>('select');
    query = this.createGetOperation<QueryClaimDto, Claim[]>('query');
}

export const CLAIM_SERVICE_CONFIG = new InjectionToken<ClaimServiceConfiguration>('CLAIM_SERVICE_CONFIG');

export class ClaimServiceConfiguration {
    baseUrl = configurationValue.required('Membership service url');
}
