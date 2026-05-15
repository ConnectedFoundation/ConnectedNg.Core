import { inject, Injectable, InjectionToken } from "@angular/core";
import { EventKey, EventService, PrimaryKeyDto } from "@connected-ng/core";
import { QueryDto } from "@connected-ng/core";
import { InsertUserDto, User, UpdateUserDto, SelectUserDto } from "./dtos/user-dtos";
import { PrimaryKeyListDto } from "@connected-ng/core";
import { ValueDto } from "@connected-ng/core";
import { configurationValue } from "@connected-ng/core";
import { ConnectedServiceBase } from "@connected-ng/core";
import { BehaviorSubject, Observable } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class UserService extends ConnectedServiceBase {
  override getBaseUrl(): string {
    return this.configuration.baseUrl();
  }

  serviceUrl = 'services/identities/users';

  private configuration = inject(USER_SERVICE_CONFIG);

  private events = inject(EventService);

  // Backend event observables (SignalR events from backend)
  $inserted?: Observable<PrimaryKeyDto<number>>;
  $updated?: Observable<PrimaryKeyDto<number>>;
  $deleted?: Observable<PrimaryKeyDto<number>>;

  constructor() {
    super();
    // Hook up backend events
    this.$inserted = this.events.on<PrimaryKeyDto<number>>(`${this.serviceUrl}/inserted` as EventKey);
    this.$updated = this.events.on<PrimaryKeyDto<number>>(`${this.serviceUrl}/updated` as EventKey);
    this.$deleted = this.events.on<PrimaryKeyDto<number>>(`${this.serviceUrl}/deleted` as EventKey);
  }

  insert = this.createPostOperation<InsertUserDto, number>('insert');
  delete = this.createDeleteOperation<PrimaryKeyDto<number>, void>('delete');
  query = this.createGetOperation<QueryDto | undefined, User[]>('query');
  lookup = this.createGetOperation<PrimaryKeyListDto<number>, User[]>('lookup');
  select = this.createGetOperation<PrimaryKeyDto<number>, User>('select');
  update = this.createPutOperation<UpdateUserDto, void>('update');
  validate = this.createPostOperation<SelectUserDto, string>('validate');
  selectByCredentials = this.createGetOperation<SelectUserDto, User>('select-by-credentials');
  resolve = this.createGetOperation<ValueDto<string>, User>('resolve');

  queryAndSubscribe$(queryDto?: QueryDto): Observable<User[]> {
    // Create a subject to hold the current items for this subscription
    const itemsSubject = new BehaviorSubject<User[]>([]);

    // Load initial data
    this.query(queryDto).subscribe(items => {
      itemsSubject.next(items);
    });

    // Subscribe to inserted events
    this.$inserted?.subscribe(dto => {
      this.select(dto).subscribe(entity => {
        if (entity) {
          const current = itemsSubject.value;
          // TODO: Apply query filter to determine if item should be included
          itemsSubject.next([...current, entity]);
        }
      });
    });

    // Subscribe to updated events
    this.$updated?.subscribe(dto => {
      this.select(dto).subscribe(entity => {
        if (entity) {
          const current = itemsSubject.value;
          const index = current.findIndex(v => v.id === entity.id);
          if (index !== -1) {
            // Item exists in list - update it
            const updated = [...current];
            updated[index] = entity;
            itemsSubject.next(updated);
          } else {
            // TODO: Apply query filter to determine if item should be added
          }
        }
      });
    });

    // Subscribe to deleted events
    this.$deleted?.subscribe(dto => {
      const current = itemsSubject.value;
      itemsSubject.next(current.filter(v => v.id !== dto.id));
    });

    return itemsSubject.asObservable();
  }
}

export const USER_SERVICE_CONFIG = new InjectionToken<UserServiceConfiguration>('USER_SERVICE_CONFIG');

export class UserServiceConfiguration {
  baseUrl = configurationValue.required('User service url');
}
