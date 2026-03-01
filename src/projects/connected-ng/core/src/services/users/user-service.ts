import { inject, Injectable, InjectionToken } from "@angular/core";
import { PrimaryKeyDto } from "../common/dtos/primary-key-dto";
import { QueryDto } from "../common/dtos/query-dto";
import { queryParamsMapper } from "../common/utils/query-params-mapper";
import { InsertUserDto, User, UpdateUserDto, SelectUserDto } from "./dtos/user-dtos";
import { HttpClient } from "@angular/common/http";
import { UrlService } from "../url-service";
import { PrimaryKeyListDto } from "../common/dtos/primary-key-list-dto";
import { ValueDto } from "../common/dtos/value-dto";
import { configurationValue } from "../configuration/configuration-value";

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private urlService = inject(UrlService)

  private configuration = inject(USER_SERVICE_CONFIG);

  constructor() {
  }

  static baseUrl = 'services/identities/users';

  delete(dto: PrimaryKeyDto<number>) {
    return this.http.delete(this.urlService.generateUrl(this.configuration.baseUrl(), `${UserService.baseUrl}/delete`), {
      params: { id: dto.id }
    });
  }

  insert(dto: InsertUserDto) {
    return this.http.post<number>(this.urlService.generateUrl(this.configuration.baseUrl(), `${UserService.baseUrl}/insert`), dto);
  }

  query(dto?: QueryDto) {
    return this.http.get<User[]>(this.urlService.generateUrl(this.configuration.baseUrl(), `${UserService.baseUrl}/query`), {
      params: queryParamsMapper(dto)
    });
  }

  lookup(dto: PrimaryKeyListDto<number>) {
    return this.http.get<User[]>(this.urlService.generateUrl(this.configuration.baseUrl(), `${UserService.baseUrl}/lookup`), {
      params: queryParamsMapper(dto)
    });
  }

  select(dto: PrimaryKeyDto<number>) {
    return this.http.get<User>(this.urlService.generateUrl(this.configuration.baseUrl(), `${UserService.baseUrl}/select`), {
      params: { id: dto.id }
    });
  }

  update(dto: UpdateUserDto) {
    return this.http.put(this.urlService.generateUrl(this.configuration.baseUrl(), `${UserService.baseUrl}/update`), dto);
  }

  validate(dto: SelectUserDto) {
    return this.http.post<string>(this.urlService.generateUrl(this.configuration.baseUrl(), `${UserService.baseUrl}/validate`), dto);
  }

  selectByCredentials(dto: SelectUserDto) {
    return this.http.get<User>(this.urlService.generateUrl(this.configuration.baseUrl(), `${UserService.baseUrl}/select-by-credentials`), {
      params: { user: dto.user, password: dto.password }
    });
  }

  resolve(dto: ValueDto<string>) {
    return this.http.get<User>(this.urlService.generateUrl(this.configuration.baseUrl(), `${UserService.baseUrl}/resolve`), {
      params: { value: dto.value }
    });
  }
}

export const USER_SERVICE_CONFIG = new InjectionToken<UserServiceConfiguration>('USER_SERVICE_CONFIG');

export class UserServiceConfiguration {
  baseUrl = configurationValue.required('User service url');
}
