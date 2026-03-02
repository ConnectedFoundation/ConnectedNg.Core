import { Injectable, signal, inject, InjectionToken } from "@angular/core";
import * as signalR from '@microsoft/signalr';
import { EventKey, EventSubscriptions } from "./event-subscriptions";
import { catchError, defer, from, map, Observable, shareReplay, switchMap, throwError } from "rxjs";
import { configurationValue } from "../configuration/configuration-value";
import { UrlService } from "../url-service";

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

  readonly state = this._state.asReadonly();
  readonly lastError = this._lastError.asReadonly();
  readonly messages = this._messages.asReadonly();

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

  private onSubscribe(event: EventKey): void {
    const descriptor = this.parseService(event);

    this.connect().pipe(
      switchMap(() =>
        from(this._connection!.invoke('subscribe', [{
          service: descriptor.service,
          event: descriptor.event
        },]))),
      map(() => void 0)
    ).subscribe();
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

    this._connection = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: accessTokenFactory,
        withCredentials: false
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this._connection.onreconnecting(() =>
      this._state.set(ConnectionState.Reconnecting)
    );
    this._connection.onreconnected(() =>
      this._state.set(ConnectionState.Connected)
    );
    this._connection.onclose(() => {
      this._state.set(ConnectionState.Disconnected);
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
