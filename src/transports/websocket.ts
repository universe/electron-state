import { Transport, TransportEventCallback } from './types.js';
import { WebSocket, WebSocketServer, ServerOptions, ClientOptions } from 'ws';

const instances: SocketTransport[] = [];
let wss: WebSocketServer;
let ws: WebSocket;

const DEFAULT_SERVER_OPTIONS: ServerOptions = {
  port: 8080,
  perMessageDeflate: {
    zlibDeflateOptions: {
      // See zlib defaults.
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    // Other options settable:
    clientNoContextTakeover: true, // Defaults to negotiated value.
    serverNoContextTakeover: true, // Defaults to negotiated value.
    serverMaxWindowBits: 10, // Defaults to negotiated value.
    // Below options specified as default values.
    concurrencyLimit: 10, // Limits zlib concurrency for perf.
    threshold: 1024 // Size (in bytes) below which messages
    // should not be compressed if context takeover is disabled.
  }
};

export default class SocketTransport extends Transport {
  constructor(address: string = 'ws://localhost:8080', serverOptions: Partial<ServerOptions> = {}, clientOptions?: ClientOptions) {
    super();

    if (!address.startsWith('ws://') && !address.startsWith('wss://')) {
      throw new Error('Valid websocket address is required.')
    }

    let port: number = parseInt(address.split(':')[2]);
    port = isNaN(port) ? (address.startsWith('ws://') ? 80 : 443) : port;
    serverOptions.port = port;

    instances.push(this);

    if (this.isRenderer()) {
      if (ws) { return; }
      ws = new WebSocket(address, Object.assign({ perMessageDeflate: false }, clientOptions));
      ws.on('message', (data: string) => {
        const [name, ...args] = JSON.parse(data);
        for (const instance of instances) {
          const callbacks = instance.listeners.get(name);
          for (const tuple of callbacks || []) {
            const [type, cb] = tuple;
            cb({ send(name: string, ...args: any[]) {
              ws.send(JSON.stringify([ name, ...args ]));
            }}, ...args);
            (type === 'once') && callbacks?.delete(tuple);
          }
        }
      });
    } else {
      if (wss) { return; }
      wss = new WebSocketServer(Object.assign(DEFAULT_SERVER_OPTIONS, serverOptions));
      wss.on('connection', (ws) => {
        ws.on('message', (data: string) => {
          const [name, ...args] = JSON.parse(data);
          for (const instance of instances) {
            const callbacks = instance.listeners.get(name);
            for (const tuple of callbacks || []) {
              const [type, cb] = tuple;
              cb({ send(name: string, ...args: any[]) {
                ws.send(JSON.stringify([ name, ...args ]));
              }}, ...args);
              if (type === 'once') {
                callbacks?.delete(tuple);
              }
            }
          }
        });      
      });
    }
  }

  isRenderer(): boolean {
    return Object.hasOwnProperty.call(globalThis, 'window');
  }

  private listeners: Map<string, Set<['on' | 'once', TransportEventCallback]>> = new Map();
  async on(name: string, cb: TransportEventCallback): Promise<void> {
    const set = this.listeners.get(name) || new Set();
    set.add(['on', cb]);
    this.listeners.set(name, set);
  }

  async once(name: string, cb: TransportEventCallback): Promise<void> {
    const set = this.listeners.get(name) || new Set();
    set.add(['once', cb]);
    this.listeners.set(name, set);
  }

  async send(channel: string, ...args: any[]): Promise<void> {
    if (this.isRenderer()) {
      ws.send(JSON.stringify([channel, ...args]));
    }
    else {
      for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify([channel, ...args]));
        }
      }
    }
  }
}
