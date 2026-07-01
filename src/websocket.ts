import { Token } from '@lumino/coreutils';

export interface IWebSocket {
  binaryType: BinaryType;
  onclose: ((event: CloseEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onopen: ((event: Event) => void) | null;
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;
  close(): void;
}

export type IWebSocketFactory = (url: string) => Promise<IWebSocket>;

export const IWebSocketFactory = new Token<IWebSocketFactory>(
  'jupyter-webrtc-provider:websocket-factory'
);

export class AsyncEvent {
  private resolved = false;
  private promise: Promise<void> | null = null;
  private resolve: (() => void) | null = null;

  wait(): Promise<void> {
    if (this.resolved) {
      return Promise.resolve();
    }
    if (this.promise === null) {
      this.promise = new Promise<void>(resolve => {
        this.resolve = resolve;
      });
    }
    return this.promise;
  }

  set(): void {
    if (this.resolved) {
      return;
    }
    this.resolved = true;
    this.resolve?.();
    this.promise = null;
    this.resolve = null;
  }

  is_set(): boolean {
    return this.resolved;
  }
}

class AsyncLock {
  private locked = false;
  private queue: Array<
    (value: (() => void) | PromiseLike<() => void>) => void
  > = [];

  async acquire(): Promise<() => void> {
    return new Promise(resolve => {
      if (!this.locked) {
        this.locked = true;
        resolve(() => {
          this.locked = false;
          this.next();
        });
      } else {
        this.queue.push(resolve);
      }
    });
  }

  private next() {
    if (this.queue.length > 0) {
      const nextResolve = this.queue.shift()!;
      this.locked = true;
      nextResolve(() => {
        this.locked = false;
        this.next();
      });
    }
  }
}

type EventHandler = (...args: any[]) => void;

class EventEmitter {
  private _listeners: Map<string, Set<EventHandler>> = new Map();

  on(event: string, handler: EventHandler): void {
    let handlers = this._listeners.get(event);
    if (!handlers) {
      handlers = new Set();
      this._listeners.set(event, handlers);
    }
    handlers.add(handler);
  }

  off(event: string, handler: EventHandler): void {
    this._listeners.get(event)?.delete(handler);
  }

  emit(event: string, args: any[]): void {
    this._listeners.get(event)?.forEach(handler => handler(...args));
  }

  destroy(): void {
    this._listeners.clear();
  }
}

const reconnectTimeoutBase = 1200;
const maxReconnectTimeout = 2500;
const messageReconnectTimeout = 30000;

export class WebsocketClient extends EventEmitter {
  url: string;
  ws: IWebSocket | null = null;
  binaryType: BinaryType | null;
  connected = false;
  connecting = false;
  unsuccessfulReconnects = 0;
  lastMessageReceived = 0;
  shouldConnect = true;
  private _checkInterval: any;
  private _webSocketFactory: IWebSocketFactory | undefined;
  private _lock: AsyncLock;
  private _ready: AsyncEvent;
  private _messagesToSend: string[];

  constructor(
    url: string,
    {
      binaryType,
      webSocketFactory
    }: {
      binaryType?: 'arraybuffer' | 'blob' | null;
      webSocketFactory?: IWebSocketFactory;
    } = {}
  ) {
    super();
    this.url = url;
    this.binaryType = binaryType || null;
    this._webSocketFactory = webSocketFactory;
    this._checkInterval = setInterval(() => {
      if (
        this.connected &&
        messageReconnectTimeout < Date.now() - this.lastMessageReceived
      ) {
        this.ws?.close();
      }
    }, messageReconnectTimeout / 2);
    this._lock = new AsyncLock();
    this._ready = new AsyncEvent();
    this._messagesToSend = [];
    this._bufferizeMessages();
    this._setupWS();
  }

  private async _bufferizeMessages(): Promise<void> {
    await this._ready.wait();
    for (const message of this._messagesToSend) {
      await this.ws!.send(message);
    }
    this._messagesToSend = [];
  }

  private async _setupWS(): Promise<void> {
    const release = await this._lock.acquire();
    try {
      if (!this.shouldConnect || this.ws !== null) {
        return;
      }

      const websocket = await this.createWebSocket(this.url);
      if (this.binaryType) {
        websocket.binaryType = this.binaryType;
      }
      this.ws = websocket;
      this.connecting = true;
      this.connected = false;

      let pingTimeout: any = null;

      websocket.onmessage = (event: MessageEvent) => {
        this.lastMessageReceived = Date.now();
        const data = event.data;
        const message = typeof data === 'string' ? JSON.parse(data) : data;
        if (message) {
          if (message.type === 'pong') {
            clearTimeout(pingTimeout);
            pingTimeout = setTimeout(
              () => this.send({ type: 'ping' }),
              messageReconnectTimeout / 2
            );
          } else if (message.type === 'ping') {
            this.send({ type: 'pong' });
          }
        }
        this.emit('message', [message, this]);
      };

      const onclose = (error?: any) => {
        if (this.ws !== null) {
          this.ws = null;
          this.connecting = false;
          if (this.connected) {
            this.connected = false;
            this.emit('disconnect', [{ type: 'disconnect', error }, this]);
          } else {
            this.unsuccessfulReconnects++;
          }
          setTimeout(
            () => this._setupWS(),
            Math.min(
              Math.log10(this.unsuccessfulReconnects + 1) *
                reconnectTimeoutBase,
              maxReconnectTimeout
            )
          );
        }
        clearTimeout(pingTimeout);
      };

      websocket.onclose = () => onclose();
      websocket.onerror = error => onclose(error);
      websocket.onopen = () => {
        this.lastMessageReceived = Date.now();
        this.connecting = false;
        this.connected = true;
        this.unsuccessfulReconnects = 0;
        this.emit('connect', [{ type: 'connect' }, this]);
        pingTimeout = setTimeout(
          () => this.send({ type: 'ping' }),
          messageReconnectTimeout / 2
        );
      };
    } finally {
      this._ready.set();
      release();
    }
  }

  protected createWebSocket(url: string): Promise<IWebSocket> {
    if (!this._webSocketFactory) {
      throw new Error(
        'No webSocketFactory provided and createWebSocket not overridden'
      );
    }
    return this._webSocketFactory(url);
  }

  async send(message: any): Promise<void> {
    const messageString = JSON.stringify(message);
    if (this._ready.is_set()) {
      this.ws!.send(messageString);
    } else {
      this._messagesToSend.push(messageString);
    }
  }

  disconnect(): void {
    this.shouldConnect = false;
    this.ws?.close();
  }

  async connect(): Promise<void> {
    this.shouldConnect = true;
    const release = await this._lock.acquire();
    if (!this.connected && this.ws === null) {
      release();
      await this._setupWS();
    } else {
      release();
    }
  }

  destroy(): void {
    clearInterval(this._checkInterval);
    this.disconnect();
    super.destroy();
  }
}
