import { inject, Injectable, InjectionToken } from "@angular/core";
import { EventKey, EventService, PrimaryKeyDto, QueryDto, configurationValue, ConnectedServiceBase } from "@connected-ng/core";
import { InsertRoleDto, Role, UpdateRoleDto } from "./dtos/role-dtos";
import { BehaviorSubject, Observable } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class RoleService extends ConnectedServiceBase {
  override getBaseUrl(): string {
    return this.configuration.baseUrl();
  }

  serviceUrl = 'services/membership/roles';

  private configuration = inject(ROLE_SERVICE_CONFIG);
  private events = inject(EventService);

  $inserted?: Observable<PrimaryKeyDto<number>>;
  $updated?: Observable<PrimaryKeyDto<number>>;
  $deleted?: Observable<PrimaryKeyDto<number>>;

  constructor() {
    super();
    this.$inserted = this.events.on<PrimaryKeyDto<number>>(`${this.serviceUrl}/inserted` as EventKey);
    this.$updated = this.events.on<PrimaryKeyDto<number>>(`${this.serviceUrl}/updated` as EventKey);
    this.$deleted = this.events.on<PrimaryKeyDto<number>>(`${this.serviceUrl}/deleted` as EventKey);
  }

  insert = this.createPostOperation<InsertRoleDto, number>('insert');
  delete = this.createDeleteOperation<PrimaryKeyDto<number>, void>('delete');
  query = this.createGetOperation<QueryDto | undefined, Role[]>('query');
  select = this.createGetOperation<PrimaryKeyDto<number>, Role>('select');
  update = this.createPutOperation<UpdateRoleDto, void>('update');

  queryAndSubscribe$(queryDto?: QueryDto): Observable<Role[]> {
    const itemsSubject = new BehaviorSubject<Role[]>([]);

    this.query(queryDto).subscribe(items => {
      itemsSubject.next(items);
    });

    this.$inserted?.subscribe(dto => {
      this.select(dto).subscribe(entity => {
        if (entity) {
          itemsSubject.next([...itemsSubject.value, entity]);
        }
      });
    });

    this.$updated?.subscribe(dto => {
      this.select(dto).subscribe(entity => {
        if (entity) {
          const current = itemsSubject.value;
          const index = current.findIndex(v => v.id === entity.id);
          if (index !== -1) {
            const updated = [...current];
            updated[index] = entity;
            itemsSubject.next(updated);
          }
        }
      });
    });

    this.$deleted?.subscribe(dto => {
      itemsSubject.next(itemsSubject.value.filter(v => v.id !== dto.id));
    });

    return itemsSubject.asObservable();
  }
}

export const ROLE_SERVICE_CONFIG = new InjectionToken<RoleServiceConfiguration>('ROLE_SERVICE_CONFIG');

export class RoleServiceConfiguration {
  baseUrl = configurationValue.required('Role service url');
}
