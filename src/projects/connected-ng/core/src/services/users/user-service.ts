import { inject, Injectable, InjectionToken } from "@angular/core";
import { PrimaryKeyDto } from "../common/dtos/primary-key-dto";
import { QueryDto } from "../common/dtos/query-dto";
import { InsertUserDto, User, UpdateUserDto, SelectUserDto } from "./dtos/user-dtos";
import { PrimaryKeyListDto } from "../common/dtos/primary-key-list-dto";
import { ValueDto } from "../common/dtos/value-dto";
import { configurationValue } from "../configuration/configuration-value";
import { ConnectedServiceBase } from "../common/service-base";
@Injectable({
  providedIn: 'root'
})
export class UserService extends ConnectedServiceBase {
  override getBaseUrl(): string {
    return this.configuration.baseUrl();
  }

  serviceUrl = 'services/identities/users';

  private configuration = inject(USER_SERVICE_CONFIG);

  insert = this.createPostOperation<InsertUserDto, number>('insert');
  delete = this.createDeleteOperation<PrimaryKeyDto<number>, void>('delete');
  query = this.createGetOperation<QueryDto | undefined, User[]>('query');
  lookup = this.createGetOperation<PrimaryKeyListDto<number>, User[]>('lookup');
  select = this.createGetOperation<PrimaryKeyDto<number>, User>('select');
  update = this.createPutOperation<UpdateUserDto, void>('update');
  validate = this.createPostOperation<SelectUserDto, string>('validate');
  selectByCredentials = this.createGetOperation<SelectUserDto, User>('select-by-credentials');
  resolve = this.createGetOperation<ValueDto<string>, User>('resolve');
}

export const USER_SERVICE_CONFIG = new InjectionToken<UserServiceConfiguration>('USER_SERVICE_CONFIG');

export class UserServiceConfiguration {
  baseUrl = configurationValue.required('User service url');
}
