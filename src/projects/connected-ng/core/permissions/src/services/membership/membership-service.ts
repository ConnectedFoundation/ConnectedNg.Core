import { inject, Injectable, InjectionToken } from "@angular/core";
import { PrimaryKeyDto, configurationValue, ConnectedServiceBase } from "@connected-ng/core";
import { InsertMembershipDto, Membership, QueryMembershipDto } from "./dtos/membership-dtos";

@Injectable({
  providedIn: 'root'
})
export class MembershipService extends ConnectedServiceBase {
  override getBaseUrl(): string {
    return this.configuration.baseUrl();
  }

  serviceUrl = 'services/membership/membership';

  private configuration = inject(MEMBERSHIP_SERVICE_CONFIG);

  insert = this.createPostOperation<InsertMembershipDto, number>('insert');
  delete = this.createDeleteOperation<PrimaryKeyDto<number>, void>('delete');
  select = this.createGetOperation<PrimaryKeyDto<number>, Membership>('select');
  query = this.createGetOperation<QueryMembershipDto, Membership[]>('query');
}

export const MEMBERSHIP_SERVICE_CONFIG = new InjectionToken<MembershipServiceConfiguration>('MEMBERSHIP_SERVICE_CONFIG');

export class MembershipServiceConfiguration {
  baseUrl = configurationValue.required('Membership service url');
}
