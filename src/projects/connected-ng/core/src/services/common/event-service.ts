import { inject, Injectable, InjectionToken, OnDestroy, signal } from "@angular/core";
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

/**
 * Delivers server events to subscribers over one hub connection.
 *
 * The connection keeps itself alive for as long as anything is subscribed: a drop is retried by the hub, and anything
 * else that leaves it unusable (a close, a start that failed, a subscribe the server refused) is retried from scratch
 * with the same delays. Events raised while it is down are not replayed; see {@link reconnected$}.
 */
@Injectable({ providedIn: 'root' })
export class EventService implements OnDestroy {
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
  private _recoverTimer?: ReturnType<typeof setTimeout>;
  private _attempt = 0;
  private _stopped = false;

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

  ngOnDestroy(): void {
    void this.disconnect();
  }

  /**
   * Closes the connection and stops retrying, for example when the user signs out. Subscribers stay registered, and
   * so do new ones, but nothing connects until {@link resume} is called.
   */
  async disconnect(): Promise<void> {
    this._stopped = true;
    this.cancelRecovery();

    const connection = this._connection;

    this.discardConnection();
    this._state.set(ConnectionState.Disconnected);
    this._isUnstable.set(false);

    try {
      await connection?.stop();
    } catch {
      // Closing a connection that is already broken is not worth reporting.
    }
  }

  /**
   * Connects again after {@link disconnect}, for example after the user signs in, and subscribes to everything
   * subscribers are waiting for, including what was subscribed while the service was stopped.
   */
  resume(): void {
    this._stopped = false;
    this.recover();
  }

  private connect(): Observable<void> {
    if (this.connect$)
      return this.connect$;

    this.ensureConnection();
    this.registerHandlers();

    const connection = this._connection;

    this.connect$ = defer(async () => {
      if (!connection) throw new Error('Hub connection not created.');

      if (connection.state === signalR.HubConnectionState.Connected
        || connection.state === signalR.HubConnectionState.Connecting
        || connection.state === signalR.HubConnectionState.Reconnecting)
        return;

      this._state.set(ConnectionState.Connecting);

      await connection.start();

      // Closed or replaced while it was starting: it is not the current connection any more, and whoever replaced it
      // reports on the one that is.
      if (this._connection !== connection)
        return;

      this._state.set(ConnectionState.Connected);
      this._isUnstable.set(false);
      this._lastError.set(null);
    }).pipe(
      catchError((err) => {
        if (this._connection === connection) {
          this._state.set(ConnectionState.Disconnected);
          this._lastError.set(err?.message ?? 'Fail to connect to the event server');
          this.connect$ = undefined;
        }

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

  /**
   * Subscribes again to everything subscribers are waiting for, on a new connection or after a drop, and announces it.
   * A subscribe the server refuses leaves the connection useless, so it is retried from scratch.
   */
  private resubscribe(): void {
    const keys = this._subscriptions.keys();

    if (keys.length === 0)
      return;

    forkJoin(keys.map(event => this.subscribeTo(event))).subscribe({
      next: () => {
        // Only the connection that is current and up has been subscribed on; a stopped service has none.
        if (this._connection?.state !== signalR.HubConnectionState.Connected)
          return;

        this._attempt = 0;

        if (this._subscriptions.keys().length > 0)
          this._reconnected.next();
      },
      error: (err) => {
        this._lastError.set(err?.message ?? 'Fail to subscribe to events again');
        this.recover();
      }
    });
  }

  private onSubscribe(event: EventKey): void {
    // After disconnect() there is no session to connect for, and the token would be empty; resume() subscribes it.
    if (this._stopped)
      return;

    this.subscribeTo(event).subscribe({
      // A subscribe made while the server is down, or one it refuses, is made again by the recovery.
      error: () => this.recover()
    });
  }

  private subscribeTo(event: EventKey): Observable<void> {
    const descriptor = this.parseService(event);

    return this.connect().pipe(
      switchMap(() => {
        const connection = this._connection;

        // Closed or replaced since: whoever did that subscribes everything again on the connection that follows.
        // A hub that is retrying does the same once it is back, and this subscription is already registered.
        if (!connection || connection.state === signalR.HubConnectionState.Reconnecting)
          return of(void 0);

        return from(connection.invoke('subscribe', [{
          service: descriptor.service,
          event: descriptor.event
        },])).pipe(map(() => void 0));
      })
    );
  }

  private onUnsubscribe(event: EventKey): void {
    const descriptor = this.parseService(event);

    // The channel is removed after this runs, so it is still among the keys.
    if (this._subscriptions.keys().every(key => key === event))
      this.cancelRecovery();

    // Only a live connection has anything to unsubscribe from; one that is down has dropped its subscriptions.
    if (this._connection?.state !== signalR.HubConnectionState.Connected)
      return;

    from(this._connection.invoke('unsubscribe', [{
      service: descriptor.service,
      event: descriptor.event
    },])).subscribe({ error: () => { } });
  }

  /**
   * Makes the connection good again from scratch after it failed, while anything is still subscribed: waits, then
   * replaces the connection and subscribes again. If that fails too it waits longer, and so on.
   */
  private recover(): void {
    if (this._stopped || this._recoverTimer || this._subscriptions.keys().length === 0)
      return;

    this._recoverTimer = setTimeout(() => {
      this._recoverTimer = undefined;

      if (this._stopped || this._subscriptions.keys().length === 0) {
        this._attempt = 0;

        return;
      }

      const connection = this._connection;

      this.discardConnection();
      connection?.stop().catch(() => { });

      this.connect().subscribe({
        next: () => this.resubscribe(),
        error: () => this.recover()
      });
    }, eventRetryDelay(this._attempt++));
  }

  private cancelRecovery(): void {
    clearTimeout(this._recoverTimer);

    this._recoverTimer = undefined;
    this._attempt = 0;
  }

  /**
   * Forgets the current connection, so the next connect makes a new one. Events from the old one are ignored.
   */
  private discardConnection(): void {
    this.connect$ = undefined;
    this._connection = undefined;
    this._handlersRegistered = false;
  }

  /**
   * Creates the hub connection. The access token is read each time the hub asks for one, so a token that changed
   * since the connection was made is used by the next attempt.
   */
  protected createHub(url: string): signalR.HubConnection {
    const retryPolicy: signalR.IRetryPolicy = {
      nextRetryDelayInMilliseconds: (retryContext) => eventRetryDelay(retryContext.previousRetryCount)
    };

    return new signalR.HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: () => this.configuration.accessTokenFactory?.()?.() ?? '',
        withCredentials: false
      })
      .withAutomaticReconnect(retryPolicy)
      .configureLogging(signalR.LogLevel.Information)
      .build();
  }

  private ensureConnection() {
    if (this._connection)
      return;

    const url = this.urlService.generateUrl(this.configuration.baseUrl(), `hubs/notifications/events?client=${EventService._clientId}`);
    const connection = this.createHub(url);

    this._connection = connection;

    // A connection that was replaced can still report; only the current one counts.
    connection.onreconnecting(() => {
      if (this._connection !== connection)
        return;

      this._state.set(ConnectionState.Reconnecting);
      this._isUnstable.set(true);
    });
    connection.onreconnected(() => {
      if (this._connection !== connection)
        return;

      this._state.set(ConnectionState.Connected);
      this._isUnstable.set(false);
      this.resubscribe();
    });
    connection.onclose(() => {
      if (this._connection !== connection)
        return;

      this._state.set(ConnectionState.Disconnected);

      // Only unstable if subscribers are still waiting — not a normal idle close
      this._isUnstable.set(this._subscriptions.keys().length > 0);

      this.discardConnection();
      this.recover();
    });
  }

  private registerHandlers() {
    if (this._handlersRegistered)
      return;

    const connection = this._connection;

    if (!connection)
      return;

    connection.on(
      'notify',
      async (acknowledge: { id: string }, service: string, event: string, dto: unknown) => {
        await connection.invoke('acknowledge', { id: acknowledge.id });

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
