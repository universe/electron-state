export type IPCMethodTypes = 'static' | 'instance';
export type TransportEventCallback = (sender: TransportSender, ...args: any[]) => void | Promise<void>
export type TransportSender = {
  send(name: string, ...args: any[]): void;
}

export abstract class Transport {
  abstract isRenderer(): boolean;
  abstract on(name: string, cb: TransportEventCallback): void;
  abstract once(name: string, cb: TransportEventCallback): void;
  abstract send(name: string, ...args: any[]): void;
}
