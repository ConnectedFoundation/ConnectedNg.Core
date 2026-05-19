import { Observable, Subject } from "rxjs";

export type EventKey = Lowercase<string>;

type Channel<T = any> = {
  subject: Subject<T>;
  subs: number;
  obs: Observable<T>;
};

export class EventSubscriptions {
  private readonly _items = new Map<EventKey, Channel<any>>();

  private _onConnect?: (event: EventKey) => void;
  private _onDisconnect?: (event: EventKey) => void;

  onConnect(handler: (event: EventKey) => void): void {
    this._onConnect = handler;
  }

  onDisconnect(handler: (event: EventKey) => void): void {
    this._onDisconnect = handler;
  }

  on<T = any>(event: EventKey): Observable<T> {
    if (this._items.has(event))
      return this._items.get(event)!.obs;

    const subject = new Subject<T>();
    const channel: Channel<T> = {
      subject,
      subs: 0,
      obs: new Observable<T>((observer) => {
        channel!.subs++;

        if (channel.subs === 1)
          this._onConnect?.(event);

        const sub = subject.subscribe(observer);

        return () => {
          sub.unsubscribe();
          channel!.subs--;

          if (channel!.subs === 0) {
            this._onDisconnect?.(event);
            this._items.delete(event);

            subject.complete();
          }
        };
      })
    };

    this._items.set(event, channel);

    return channel.obs;
  }

  keys(): EventKey[] {
    return Array.from(this._items.keys());
  }

  emit<T = any>(event: EventKey, dto: T): void {
    const channel = this._items.get(event);

    if (!channel)
      return;

    channel.subject.next(dto);
  }
}
