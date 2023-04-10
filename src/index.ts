/* eslint-disable no-use-before-define */
import { Transport, IPCMethodTypes, TransportSender } from './transports/types.js';
import AbstractState, { INTERNAL, StateConstructor, State, NewState, ensureInstance, AbstractStateAPI, AbstractStateMethod, AbstractStateMethods } from './types.js';

function * idGen(i = 0) { while (true) { i = (i + 1) % Number.MAX_SAFE_INTEGER; yield i; } }
const uuid = idGen();

export type { State, NewState, StateConstructor, AbstractState, AbstractStateAPI, AbstractStateMethod, AbstractStateMethods }

interface InternalStaticState {
  uid: string;
  transport: Transport | null;
}

interface InternalElectronState {
  timeout: NodeJS.Timeout | null;
  generation: number;
  initialized: boolean | NodeJS.Timer;
  animationFrameRef: number;
}

function getUid<T extends ElectronState | typeof Electron | InstanceType<typeof ElectronState> | StateConstructor<ElectronState>>(state: T): string {
  const klass = typeof state === 'function' ? state as unknown as typeof ElectronState : (state.constructor as unknown as typeof ElectronState);
  if (!klass[INTERNAL]) { throw new Error('Invalid state object. Did you forget to bind a SharedState method?'); }
  const uid = klass[INTERNAL].uid;
  if (uid) { return uid; }
  if (klass.name) { return klass[INTERNAL].uid = klass.name; }
  throw new Error(`No uid set for state object "${klass.constructor.name}"`)
}

function getTransport<T extends ElectronState | typeof Electron | StateConstructor<ElectronState>>(state: T): Transport {
  const klass = typeof state === 'function' ? state as unknown as typeof ElectronState : (state.constructor as unknown as typeof ElectronState);
  if (!klass[INTERNAL]) { throw new Error('Invalid state object. Did you forget to bind a SharedState method?'); }
  const transport =  klass[INTERNAL].transport;
  if (!transport) { throw new Error(`No transport for state object "${klass.constructor.name}"`)}
  return transport;
}

export class ElectronState extends AbstractState<InternalElectronState> {
  private static syncInterval: NodeJS.Timer | null;
  private static toSync: Set<ElectronState> = new Set();
  static [INTERNAL]?: InternalStaticState = {
    transport: null,
    uid: '',
  };

  [INTERNAL]?: InternalElectronState = {
    timeout: null,
    generation: 0,
    initialized: false,
    animationFrameRef: 0,
  }

  constructor(bare?: true) {
    super(bare)
    if (bare) { return this; }
  
    // Grab our instance's transport object
    const transport = getTransport(this);
    const name = getUid(this);
    const init = `${name}-init`;
    /* eslint-disable @typescript-eslint/no-var-requires */
    if (transport.isRenderer()) {
      // Don't clone "this" on first pass. We need the parent constructor to augment it with default values!
      // We replace it after initialization with a clone below.
      transport.on(name, async(_: TransportSender, generation: number, initialState: State<this>) => {
        if (!this[INTERNAL]) { return; }
        this[INTERNAL].initialized = true;
        this[INTERNAL].generation = generation;
        Object.assign(this, initialState);
        (this.constructor as StateConstructor<this>).trigger();
      });

      transport.on(`${name}-call`, async(sender: TransportSender, type: IPCMethodTypes, name: keyof this, nonce: string, ...args: unknown[]) => {
        try {
          /* eslint-disable-next-line */
          /* @ts-ignore-next-line */
          sender.send(`${name}-${nonce}`, await (type === 'static' ? this.constructor : this)[name](...args));
        }
        catch (err) {
          sender.send(`${String(name)}-${nonce}`, null, err);
          console.error(err);
        }
      });

      // Request for initialization until we get it. Backend may be bootstrapping while our loading page is up.
      const requestInit = () => {
        if (!this[INTERNAL]) { return; }
        if (this[INTERNAL].initialized === true) { return; }
        transport.send(init);
        this[INTERNAL].initialized = setTimeout(() => {
          if (!this[INTERNAL]) { return; }
          if (this[INTERNAL].initialized === true) { return; }
          this[INTERNAL].initialized = false;
          requestInit.bind(this)();
        }, 300);
      };
      requestInit.bind(this)();
    }
    else {
      // On renderer init, send the full state.
      transport.on(init, async(sender: TransportSender) => {
        if (!this[INTERNAL]) { return; }
        this[INTERNAL].generation = (this[INTERNAL].generation + 1) % Number.MAX_SAFE_INTEGER;
        sender.send(name, this[INTERNAL].generation, { ...this });
      });

      transport.on(name, async(sender: TransportSender, generation: number, data: State<this>) => {
        if (!this[INTERNAL]) { return; }
        if (this[INTERNAL].generation !== generation) {
          sender.send(name, this[INTERNAL].generation, { ...this });
        }
        else {
          Object.assign(this, data);
          (this.constructor as StateConstructor<this>).trigger();
        }
      });

      transport.on(`${name}-call`, async(sender: TransportSender, type: IPCMethodTypes, name: keyof this, nonce: string, ...args: unknown[]) => {
        try {
          /* eslint-disable-next-line */
          /* @ts-ignore-next-line */
          sender.send(`${name}-${nonce}`, await (type === 'static' ? this.constructor : this)[name](...args));
        }
        catch (err) {
          sender.send(`${String(name)}-${nonce}`, null, err);
          console.error(err);
        }
      });
    }

    // Kick off the sync interval if we haven't already.
    if (!ElectronState.syncInterval) {
      ElectronState.syncInterval = setInterval(ElectronState.sync.bind(this), 30);
    }

    /* eslint-enable @typescript-eslint/no-var-requires */
    return this;
  }

  private static async sync<T extends ElectronState>(this: StateConstructor<T>) {
    const transport = getTransport(this);

    if (transport.isRenderer()) {
      for (const store of ElectronState.toSync) {
        if (!store[INTERNAL]) { continue; }
        transport.send(store.constructor.name, store[INTERNAL].generation, { ...store });
        ElectronState.toSync.delete(store);
      }
    }
    else {
      for (const store of ElectronState.toSync) {
        if (!store[INTERNAL]) { continue; }
        store[INTERNAL].generation = (store[INTERNAL].generation + 1) % Number.MAX_SAFE_INTEGER;
        transport.send(store.constructor.name, store[INTERNAL].generation, { ...store });
        // for (const window of BrowserWindow.getAllWindows()) {
        //   window.webContents.send(store.constructor.name, store[INTERNAL].generation, { ...store });
        // }
        ElectronState.toSync.delete(store);
      }
    }
  }

  static async setState<T extends ElectronState>(this: StateConstructor<T>, patch: NewState<T>): Promise<void> {
    const transport = getTransport(this);
    const instance = ensureInstance<T>(this);
    if (!instance[INTERNAL]) { return; }
    if (transport.isRenderer()) {
      Object.assign(instance, patch);
      ElectronState.toSync.add(instance);
      this.trigger();
    }
    else {
      Object.assign(instance, patch);
      instance[INTERNAL].generation = ((instance[INTERNAL].generation || 0) + 1) % Number.MAX_SAFE_INTEGER;
      ElectronState.toSync.add(instance);
      this.trigger();
    }
  }

  static main<T extends typeof ElectronState>(this: T, func: AbstractStateMethod<InstanceType<T>>): typeof func {
    const transport = getTransport(this);
    if (!transport.isRenderer()) { return func; }
    const funcName = `${func.name}MainProxy`;
    // Jump through a couple hoops here to have a sensible function name in dev tools.
    return ({
      [funcName](this: ThisParameterType<typeof func>, ...args: Parameters<typeof func>) {
        const storeName = getUid(this as InstanceType<T>);
        const methodType = typeof this === 'function' ? 'static' : 'instance';
        const methodName = func.name;
        const nonce = uuid.next().value;
        return new Promise<ReturnType<typeof func>>((resolve, reject) => {
          transport.once(`${methodName}-${nonce}`, (_: TransportSender, res: ReturnType<typeof func>, err: Error | null = null) => {
            err ? reject(err) : resolve(res);
          });
          transport.send(`${storeName}-call`, methodType, methodName, nonce, ...args);
        });
      },
    })[funcName];
  }

  static renderer<T extends typeof ElectronState>(this: T, func: AbstractStateMethod<InstanceType<T>>): typeof func {
    const transport = getTransport(this);
    if (transport.isRenderer()) { return func; }

    // Jump through a couple hoops here to have a sensible function name in dev tools.
    const funcName = `${func.name}RendererProxy`;
    return ({
      [funcName](this: ThisParameterType<typeof func>, ...args: Parameters<typeof func>) {
        const storeName = getUid(this as InstanceType<T>);
        const methodType = typeof this === 'function' ? 'static' : 'instance';
        const methodName = func.name;
        const nonce = uuid.next().value;
        return new Promise<ReturnType<typeof func>>((resolve, reject) => {
          transport.once(`${methodName}-${nonce}`, (_: TransportSender, res: ReturnType<typeof func>, err: Error | null = null) => {
            err ? reject(err) : resolve(res);
          });
          transport.send(`${storeName}-call`, methodType, methodName, nonce, ...args);
        });
      },
    })[funcName];
  }
}

export function SharedState<T extends Transport>(transport: T, uid?: string): typeof ElectronState {
  class TransportState extends ElectronState {}
  TransportState[INTERNAL] = {
    transport,
    uid: uid || '',
  };
  return TransportState;
}

export { main, renderer } from './decorators.js';

export class NoopState extends AbstractState<any> {
  [INTERNAL]?: any = {}

  /* eslint-disable-next-line */
  static async setState<T extends NoopState>(this: StateConstructor<T>, patch: Partial<State<T>>): Promise<void> {
    const instance = ensureInstance(this);
    Object.assign(instance, patch);
    this.trigger();
    return;
  }
}

// Typecheck Assertions
NoopState as StateConstructor<NoopState>;
ElectronState as StateConstructor<ElectronState>;
