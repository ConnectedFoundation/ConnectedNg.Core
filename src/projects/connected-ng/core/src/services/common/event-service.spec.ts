import { TestBed } from '@angular/core/testing';
import * as signalR from '@microsoft/signalr';
import { ConnectionState, EVENT_SERVICE_CONFIG, EventService, EventServiceConfiguration, eventRetryDelay } from './event-service';
import { EventKey } from './event-subscriptions';

describe('eventRetryDelay', () => {
  it('retries at once the first time, so a replaced server is found straight away', () => {
    expect(eventRetryDelay(0)).toBe(0);
  });

  it('backs off after that', () => {
    expect([1, 2].map(eventRetryDelay)).toEqual([1000, 2000]);
  });

  it('settles on a fixed delay and never gives up', () => {
    expect([3, 4, 50, 5000].map(eventRetryDelay)).toEqual([5000, 5000, 5000, 5000]);
  });
});

/**
 * A hub connection the test controls: it records what the service asks of it and fails when told to.
 */
class FakeHub {
  state = signalR.HubConnectionState.Disconnected;
  startFails = false;
  finishesAfterStop = false;
  subscribeFailures = 0;
  stopped = false;
  invocations: string[] = [];

  /** Holds start() until it settles, to have the service act while a start is in flight. */
  startGate?: Promise<void>;
  /** Holds a subscribe until it settles, to have the service act while one is in flight. */
  subscribeGate?: Promise<void>;

  private closed?: () => void;
  private reconnecting?: () => void;
  private reconnected?: () => void;

  async start(): Promise<void> {
    await this.startGate;

    // A real hub refuses to finish a start it was stopped during; the service must not rely on that.
    if (this.startFails || (this.stopped && !this.finishesAfterStop))
      throw new Error(this.stopped ? 'The connection was stopped during start' : 'The server is down');

    this.state = signalR.HubConnectionState.Connected;
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this.state = signalR.HubConnectionState.Disconnected;
  }

  async invoke(method: string): Promise<void> {
    this.invocations.push(method);

    if (method === 'subscribe')
      await this.subscribeGate;

    if (method === 'subscribe' && this.subscribeFailures > 0) {
      this.subscribeFailures--;

      throw new Error('The server refused the subscription');
    }
  }

  on(): void { }
  onreconnecting(handler: () => void): void { this.reconnecting = handler; }
  onreconnected(handler: () => void): void { this.reconnected = handler; }
  onclose(handler: () => void): void { this.closed = handler; }

  /** The connection is lost and the hub is trying to get it back. */
  lose(): void {
    this.state = signalR.HubConnectionState.Reconnecting;
    this.reconnecting?.();
  }

  /** The connection is lost and the hub gives up on it. */
  close(): void {
    this.state = signalR.HubConnectionState.Disconnected;
    this.closed?.();
  }

  /** The hub's own retry found the server again. */
  reconnect(): void {
    this.state = signalR.HubConnectionState.Connected;
    this.reconnected?.();
  }
}

/** Lets promises and observables that are already resolved run. */
async function settle(): Promise<void> {
  for (let i = 0; i < 20; i++)
    await Promise.resolve();
}

describe('EventService connection', () => {
  const key = 'spike/widgets/inserted' as EventKey;
  const other = 'spike/widgets/updated' as EventKey;

  let service: EventService;
  let configuration: EventServiceConfiguration;
  let createHub: jasmine.Spy;
  let hubs: FakeHub[];
  let setup: (hub: FakeHub, index: number) => void;
  let reconnected: jasmine.Spy;

  beforeEach(() => {
    jasmine.clock().install();

    configuration = new EventServiceConfiguration();

    configuration.baseUrl.set('http://localhost/');

    TestBed.configureTestingModule({ providers: [{ provide: EVENT_SERVICE_CONFIG, useValue: configuration }] });

    hubs = [];
    setup = () => { };
    service = TestBed.inject(EventService);

    createHub = spyOn<any>(service, 'createHub').and.callFake(() => {
      const hub = new FakeHub();

      setup(hub, hubs.length);
      hubs.push(hub);

      return hub;
    });

    reconnected = jasmine.createSpy('reconnected$');
    service.reconnected$.subscribe(reconnected);
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('connects and subscribes the first time without announcing a reconnect', async () => {
    service.on(key).subscribe();
    await settle();

    expect(hubs.length).toBe(1);
    expect(hubs[0].invocations).toEqual(['subscribe']);
    expect(service.state()).toBe(ConnectionState.Connected);
    expect(reconnected).not.toHaveBeenCalled();
  });

  it('opens a new connection after a close and subscribes again', async () => {
    service.on(key).subscribe();
    await settle();

    hubs[0].close();
    jasmine.clock().tick(0);
    await settle();

    expect(hubs.length).toBe(2);
    expect(hubs[1].invocations).toEqual(['subscribe']);
    expect(reconnected).toHaveBeenCalledTimes(1);
  });

  it('announces a reconnect once every subscription is made again after a drop the hub retried', async () => {
    service.on(key).subscribe();
    service.on(other).subscribe();
    await settle();

    hubs[0].reconnect();
    await settle();

    expect(hubs.length).toBe(1);
    expect(hubs[0].invocations).toEqual(['subscribe', 'subscribe', 'subscribe', 'subscribe']);
    expect(reconnected).toHaveBeenCalledTimes(1);
  });

  it('retries from scratch when the server refuses the subscribe after a reconnect', async () => {
    service.on(key).subscribe();
    await settle();

    hubs[0].subscribeFailures = 1;
    hubs[0].reconnect();
    await settle();

    expect(reconnected).not.toHaveBeenCalled();

    jasmine.clock().tick(0);
    await settle();

    expect(hubs.length).toBe(2);
    expect(hubs[0].stopped).toBeTrue();
    expect(hubs[1].invocations).toEqual(['subscribe']);
    expect(reconnected).toHaveBeenCalledTimes(1);
  });

  it('retries a first subscribe that was made while the server was down', async () => {
    setup = (hub, index) => hub.startFails = index === 0;

    service.on(key).subscribe();
    await settle();

    expect(service.state()).toBe(ConnectionState.Disconnected);
    expect(hubs.length).toBe(1);

    jasmine.clock().tick(0);
    await settle();

    expect(hubs.length).toBe(2);
    expect(hubs[1].invocations).toEqual(['subscribe']);
    expect(service.state()).toBe(ConnectionState.Connected);
    expect(reconnected).toHaveBeenCalledTimes(1);
  });

  it('backs off while the server stays down', async () => {
    setup = (hub) => hub.startFails = true;

    service.on(key).subscribe();
    await settle();

    jasmine.clock().tick(0);
    await settle();
    expect(hubs.length).toBe(2);

    jasmine.clock().tick(999);
    await settle();
    expect(hubs.length).toBe(2);

    jasmine.clock().tick(1);
    await settle();
    expect(hubs.length).toBe(3);
  });

  it('does not reconnect once nothing is subscribed any more', async () => {
    const subscription = service.on(key).subscribe();
    await settle();

    hubs[0].close();
    subscription.unsubscribe();

    jasmine.clock().tick(10000);
    await settle();

    expect(hubs.length).toBe(1);
    expect(reconnected).not.toHaveBeenCalled();
  });

  it('does not open a connection just to unsubscribe from one that is down', async () => {
    const subscription = service.on(key).subscribe();
    await settle();

    hubs[0].close();
    jasmine.clock().tick(0);
    await settle();
    hubs[1].close();
    subscription.unsubscribe();
    jasmine.clock().tick(10000);
    await settle();

    expect(hubs.length).toBe(2);
  });

  it('stops retrying on disconnect and starts again on resume', async () => {
    service.on(key).subscribe();
    await settle();

    await service.disconnect();

    expect(hubs[0].stopped).toBeTrue();
    expect(service.state()).toBe(ConnectionState.Disconnected);

    jasmine.clock().tick(10000);
    await settle();
    expect(hubs.length).toBe(1);

    service.resume();
    jasmine.clock().tick(0);
    await settle();

    expect(hubs.length).toBe(2);
    expect(reconnected).toHaveBeenCalledTimes(1);
  });

  it('is stable again once a recovery has connected', async () => {
    service.on(key).subscribe();
    await settle();

    hubs[0].close();
    expect(service.isUnstable()).toBeTrue();

    jasmine.clock().tick(0);
    await settle();

    expect(service.isUnstable()).toBeFalse();
    expect(service.state()).toBe(ConnectionState.Connected);
  });

  it('is stable again once the hub got the connection back', async () => {
    service.on(key).subscribe();
    await settle();

    hubs[0].lose();
    expect(service.isUnstable()).toBeTrue();
    expect(service.state()).toBe(ConnectionState.Reconnecting);

    hubs[0].reconnect();
    await settle();

    expect(service.isUnstable()).toBeFalse();
  });

  it('leaves a subscribe made while the hub is reconnecting to the hub', async () => {
    service.on(key).subscribe();
    await settle();

    hubs[0].lose();
    service.on(other).subscribe();
    await settle();

    jasmine.clock().tick(10000);
    await settle();

    expect(hubs.length).toBe(1);
    expect(hubs[0].invocations).toEqual(['subscribe']);

    hubs[0].reconnect();
    await settle();

    expect(hubs[0].invocations).toEqual(['subscribe', 'subscribe', 'subscribe']);
    expect(reconnected).toHaveBeenCalledTimes(1);
  });

  it('does not connect for a subscribe made after disconnect until resume', async () => {
    service.on(key).subscribe();
    await settle();
    await service.disconnect();

    service.on(other).subscribe();
    jasmine.clock().tick(10000);
    await settle();

    expect(hubs.length).toBe(1);

    service.resume();
    jasmine.clock().tick(0);
    await settle();

    expect(hubs.length).toBe(2);
    expect(hubs[1].invocations).toEqual(['subscribe', 'subscribe']);
    expect(reconnected).toHaveBeenCalledTimes(1);
  });

  it('does not come back when disconnect happens while a start is in flight', async () => {
    let release!: () => void;

    setup = (hub) => hub.startGate = new Promise<void>(resolve => release = resolve);

    service.on(key).subscribe();
    await settle();

    const disconnected = service.disconnect();

    release();
    await disconnected;
    await settle();
    jasmine.clock().tick(10000);
    await settle();

    expect(hubs.length).toBe(1);
    expect(hubs[0].invocations).toEqual([]);
    expect(service.state()).toBe(ConnectionState.Disconnected);
    expect(reconnected).not.toHaveBeenCalled();
  });

  it('does not report a connection that was stopped during its start as connected', async () => {
    let release!: () => void;

    setup = (hub) => {
      hub.startGate = new Promise<void>(resolve => release = resolve);
      hub.finishesAfterStop = true;
    };

    service.on(key).subscribe();
    await settle();

    const disconnected = service.disconnect();

    release();
    await disconnected;
    await settle();

    expect(service.state()).toBe(ConnectionState.Disconnected);
    expect(hubs[0].invocations).toEqual([]);
    expect(reconnected).not.toHaveBeenCalled();
  });

  it('does not come back when disconnect happens while a subscribe is in flight', async () => {
    let fail!: (error: Error) => void;

    setup = (hub) => hub.subscribeGate = new Promise<void>((_, reject) => fail = reject);

    service.on(key).subscribe();
    await settle();

    const disconnected = service.disconnect();

    fail(new Error('The invocation was canceled because the connection closed'));
    await disconnected;
    await settle();
    jasmine.clock().tick(10000);
    await settle();

    expect(hubs.length).toBe(1);
    expect(service.state()).toBe(ConnectionState.Disconnected);
    expect(reconnected).not.toHaveBeenCalled();
  });

  it('reads the access token each time the hub asks for one', () => {
    const withUrl = spyOn(signalR.HubConnectionBuilder.prototype, 'withUrl').and.callThrough();
    let token = 'first';

    configuration.accessTokenFactory.set(() => token);
    createHub.and.callThrough();

    (service as any).createHub('http://localhost/hubs/notifications/events');

    const factory = (withUrl.calls.mostRecent().args[1] as signalR.IHttpConnectionOptions).accessTokenFactory!;

    expect(factory()).toBe('first');

    token = 'second';
    expect(factory()).toBe('second');

    configuration.accessTokenFactory.set(() => 'signed in again');
    expect(factory()).toBe('signed in again');

    configuration.accessTokenFactory.set(undefined);
    expect(factory()).toBe('');
  });

  it('does not retry after a close that disconnect caused', async () => {
    service.on(key).subscribe();
    await settle();

    const disconnected = service.disconnect();

    hubs[0].close();
    await disconnected;
    jasmine.clock().tick(10000);
    await settle();

    expect(hubs.length).toBe(1);
  });
});
