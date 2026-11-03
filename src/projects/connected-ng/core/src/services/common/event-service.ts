import { inject, Injectable, InjectionToken, signal } from "@angular/core";
import * as signalR from '@microsoft/signalr';
import { catchError, defer, forkJoin, from, map, Observable, of, shareReplay, Subject, switchMap, throwError } from "rxjs";
import { configurationValue } from "../configuration/configuration-value";
import { UrlService } from "../url-service";
import { EventKey, EventSubscriptions } from "./event-subscriptions";

export enum ConnectionState {
  Disconnected,
  Connecting,
  Connected,
  Reconnecting
}

type ServiceDescriptor = {
  service: string;
  event: string;
}

const RETRY_DELAYS_MS = [0, 1000, 2000];
const RETRY_MAX_DELAY_MS = 5000;

/**
 * How long to wait before the given reconnect attempt (0 for the first). The first attempt is immediate: when the
 * server was replaced by a new generation, the new one is already there, and every second spent waiting is a second
 * of live events the screen misses. Later attempts back off to a fixed maximum and never give up.
 */
export function eventRetryDelay(previousRetryCount: number): number {
  return RETRY_DELAYS_MS[previousRetryCount] ?? RETRY_MAX_DELAY_MS;
}

// Event Service Configuration
export const EVENT_SERVICE_CONFIG = new InjectionToken<EventServiceConfiguration>('EVENT_SERVICE_CONFIG');

export class EventServiceConfiguration {
  baseUrl = configurationValue.required<string>('Event service base URL');
  accessTokenFactory = configurationValue<() => string>();
}

@Injectable({ providedIn: 'root' })
export class EventService {
  private static readonly _clientId: string = crypto.randomUUID();

  private configuration = inject(EVENT_SERVICE_CONFIG);
  private urlService = inject(UrlService);

  private connect$?: Observable<void>;

  private _state = signal<ConnectionState>(ConnectionState.Disconnected);
  private _lastError = signal<string | null>(null);
  private _messages = signal<string[]>([]);
  private _connection?: signalR.HubConnection;
  private _subscriptions: EventSubscriptions;
  private _handlersRegistered: boolean = false;
  private _isUnstable = signal<boolean>(false)
  private _reconnected = new Subject<void>();
  private _reopenTimer?: ReturnType<typeof setTimeout>;

  /**
   * Emits each time the connection is back after a drop and every subscription is made again. Events raised while it
   * was down are not replayed, so a screen showing live state should reload that state when this emits.
   */
  readonly reconnected$ = this._reconnected.asObservable();

  readonly state = this._state.asReadonly();
  readonly lastError = this._lastError.asReadonly();
  readonly messages = this._messages.asReadonly();
  readonly isUnstable = this._isUnstable.asReadonly();

  constructor() {
    this._subscriptions = new EventSubscriptions();

    this._subscriptions.onConnect((e) => {
      this.onSubscribe(e);
    });

    this._subscriptions.onDisconnect((e) => {
      this.onUnsubscribe(e);
    });
  }

  private connect(): Observable<void> {
    if (this.connect$)
      return this.connect$;

    this.ensureConnection();
    this.registerHandlers();

    this.connect$ = defer(async () => {
      if (!this._connection) throw new Error('Hub connection not created.');

      if (this._connection.state === signalR.HubConnectionState.Connected
        || this._connection.state === signalR.HubConnectionState.Connecting
        || this._connection.state === signalR.HubConnectionState.Reconnecting)
        return;

      this._state.set(ConnectionState.Connecting);

      await this._connection.start();

      this._state.set(ConnectionState.Connected);
      this._lastError.set(null);
    }).pipe(
      catchError((err) => {
        this._state.set(ConnectionState.Disconnected);
        this._lastError.set(err?.message ?? 'Fail to connect to the event server');
        this.connect$ = undefined;

        return throwError(() => err);
      }),
      shareReplay({
        bufferSize: 1, refCount: true
      }));

    return this.connect$;
  }

  on<T = any>(event: EventKey): Observable<T> {
    return this._subscriptions.on(event);
  }

  private _resubscribeAll(): void {
    const keys = this._subscriptions.keys();

    forkJoin(keys.length === 0 ? [of(void 0)] : keys.map(event => this.subscribeTo(event))).subscribe({
      next: () => this._reconnected.next(),
      error: (err) => this._lastError.set(err?.message ?? 'Fail to subscribe to events again')
    });
  }

  private onSubscribe(event: EventKey): void {
    this.subscribeTo(event).subscribe();
  }

  private subscribeTo(event: EventKey): Observable<void> {
    const descriptor = this.parseService(event);

    return this.connect().pipe(
      switchMap(() =>
        from(this._connection!.invoke('subscribe', [{
          service: descriptor.service,
          event: descriptor.event
        },]))),
      map(() => void 0)
    );
  }

  /**
   * Opens a connection again after the old one closed for good, for as long as anything is still subscribed. The
   * hub's own reconnect handles a drop; this covers a close the server announced, as when a generation is replaced.
   */
  private reopen(attempt = 0): void {
    if (this._reopenTimer || this._subscriptions.keys().length === 0)
      return;

    this._reopenTimer = setTimeout(() => {
      this._reopenTimer = undefined;

      this.connect().subscribe({
        next: () => this._resubscribeAll(),
        error: () => this.reopen(attempt + 1)
      });
    }, eventRetryDelay(attempt));
  }

  private onUnsubscribe(event: EventKey): void {
    const descriptor = this.parseService(event);

    this.connect().pipe(
      switchMap(() =>
        from(this._connection!.invoke('unsubscribe', [{
          service: descriptor.service,
          event: descriptor.event
        },]))),
      map(() => void 0)
    ).subscribe();
  }

  private ensureConnection() {
    if (this._connection)
      return;

    const accessTokenFactory = this.configuration.accessTokenFactory?.() || (() => '');
    const url = this.urlService.generateUrl(this.configuration.baseUrl(), `hubs/notifications/events?client=${EventService._clientId}`);

    const retryPolicy: signalR.IRetryPolicy = {
      nextRetryDelayInMilliseconds: (retryContext) => eventRetryDelay(retryContext.previousRetryCount)
    };

    this._connection = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: accessTokenFactory,
        withCredentials: false
      })
      .withAutomaticReconnect(retryPolicy)
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this._connection.onreconnecting(() => {
      this._state.set(ConnectionState.Reconnecting);
      this._isUnstable.set(true);
    });
    this._connection.onreconnected(() => {
      this._state.set(ConnectionState.Connected);
      this._isUnstable.set(false);
      this._resubscribeAll();
    });
    this._connection.onclose(() => {
      this._state.set(ConnectionState.Disconnected);

      // Only unstable if subscribers are still waiting — not a normal idle close
      this._isUnstable.set(this._subscriptions.keys().length > 0);

      this.connect$ = undefined;
      this._connection = undefined;
      this._handlersRegistered = false;

      this.reopen();
    });
  }

  private registerHandlers() {
    if (this._handlersRegistered)
      return;

    if (!this._connection)
      return;

    this._connection.on(
      'notify',
      async (acknowledge: { id: string }, service: string, event: string, dto: unknown) => {
        await this._connection!.invoke('acknowledge', { id: acknowledge.id });

        const key = `${service}/${event}`.toLowerCase();

        this._subscriptions.emit(key as EventKey, dto);
      }
    );
    this._handlersRegistered = true;
  }

  parseService(event: EventKey): ServiceDescriptor {
    const idx = event.lastIndexOf('/');

    return {
      service: event.slice(0, idx),
      event: event.slice(idx + 1)
    };
  }
}
