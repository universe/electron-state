/* eslint-disable no-use-before-define */
import { IpcMainEvent, IpcRendererEvent, ipcRenderer, ipcMain, app, BrowserWindow } from 'electron';

const IS_RENDERER = (process && process.type === 'renderer');
const INTERNAL = Symbol('state-store-state');
function * idGen(i = 0) { while (true) { i = (i + 1) % Number.MAX_SAFE_INTEGER; yield i; } }
const uuid = idGen();
type StateStoreKeys = keyof StateStore | typeof INTERNAL;
type FilterType<Base, Condition> = Pick<Base, { [Key in keyof Base]: Base[Key] extends Condition ? never : Key }[keyof Base]>;
type IPCMethodTypes = 'static' | 'instance';

export interface StaticProps<T extends StateStore> { new (): T }
export type State<T> = FilterType<Pick<T, Exclude<keyof T, StateStoreKeys>>, typeof StateStore>;
export type NewState<T extends StateStore> = Partial<State<T>>

/* eslint-disable  @typescript-eslint/no-explicit-any */
export type StateStoreMethod<T extends StateStore> = (this: T | StaticProps<T>, ...args: any[]) => Promise<any>;
export type StateCallback<T extends StateStore> = (state: State<T>) => any;
/* eslint-enable  @typescript-eslint/no-explicit-any */

interface InternalStateStoreState<T extends StateStore> {
  name: string;
  renderers: Set<StateCallback<T>>;
  timeout: NodeJS.Timeout | null;
  generation: number;
  initialized: boolean | NodeJS.Timer;
  animationFrameRef: number;
}

const notify = async(state: StateStore) => {
  for (const renderer of state[INTERNAL].renderers) {
    renderer.call(state, { ...state });
  }
};

const CACHE: Map<StaticProps<StateStore>, StateStore> = new Map();
function ensureInstance<T extends StateStore>(constructor: StaticProps<T>): T {
  const singleton = CACHE.get(constructor);
  if (singleton) { return singleton as T; }
  const inst = new constructor();
  CACHE.set(constructor, inst);
  return inst as T;
}

export default class StateStore {
  private static syncInterval: NodeJS.Timer | null;
  private static toSync: Set<StateStore> = new Set();

  private [INTERNAL]: InternalStateStoreState<this> = {
    name: '',
    renderers: new Set(),
    timeout: null,
    generation: 0,
    initialized: false,
    animationFrameRef: 0,
  }

  constructor() {
    // Enforce a process-wide singleton regardless of environment.
    const singleton = CACHE.get(this.constructor as typeof StateStore);
    if (singleton) { return singleton; }
    CACHE.set(this.constructor as typeof StateStore, this);
    const name = this[INTERNAL].name = this.constructor.name;

    // Make sure our internal state property is non enumerable and can't be written over.
    Object.defineProperty(this, INTERNAL, {
      writable: false,
      enumerable: false,
    });

    const init = `${name}-init`;
    /* eslint-disable @typescript-eslint/no-var-requires */
    if (IS_RENDERER) {
      // Don't clone "this" on first pass. We need the parent constructor to augment it with default values!
      // We replace it after initialization with a clone below.
      ipcRenderer.on(name, async(_e: IpcRendererEvent, generation: number, initialState: State<this>) => {
        this[INTERNAL].initialized = true;
        this[INTERNAL].generation = generation;
        Object.assign(this, initialState);
        notify(this);
      });

      ipcRenderer.on(`${this[INTERNAL].name}-call`, async(e: IpcRendererEvent, type: IPCMethodTypes, name: keyof this, nonce: string, ...args: unknown[]) => {
        try {
          /* eslint-disable-next-line */
          // @ts-ignore
          e.sender.send(`${name}-${nonce}`, await (type === 'static' ? this.constructor : this)[name](...args));
        }
        catch (err) {
          e.sender.send(`${name}-${nonce}`, null, err);
          console.error(err);
        }
      });

      // Request for initialization until we get it. Backend may be bootstrapping while our loading page is up.
      const requestInit = () => {
        if (this[INTERNAL].initialized === true) { return; }
        ipcRenderer.send(init);
        this[INTERNAL].initialized = setTimeout(() => {
          if (this[INTERNAL].initialized === true) { return; }
          this[INTERNAL].initialized = false;
          requestInit();
        }, 300);
      };
      requestInit();
    }
    else {
      // On renderer init, send the full state.
      ipcMain.on(init, async(e: IpcMainEvent) => {
        this[INTERNAL].generation = (this[INTERNAL].generation + 1) % Number.MAX_SAFE_INTEGER;
        e.sender.send(name, this[INTERNAL].generation, { ...this });
      });

      // On window focus, re-sync remote.
      app.on('browser-window-focus', async(_, win) => {
        this[INTERNAL].generation = (this[INTERNAL].generation + 1) % Number.MAX_SAFE_INTEGER;
        win.webContents.send(name, this[INTERNAL].generation, { ...this });
      });

      ipcMain.on(name, async(e: IpcMainEvent, generation: number, data: State<this>) => {
        /* eslint-disable-next-line */
        // @ts-ignore
        if (this[INTERNAL].generation !== generation) {
          e.sender.send(name, this[INTERNAL].generation, { ...this });
        }
        else {
          Object.assign(this, data);
          notify(this);
        }
      });

      ipcMain.on(`${this[INTERNAL].name}-call`, async(e: IpcMainEvent, type: IPCMethodTypes, name: keyof this, nonce: string, ...args: unknown[]) => {
        try {
          /* eslint-disable-next-line */
          // @ts-ignore
          e.sender.send(`${name}-${nonce}`, await (type === 'static' ? this.constructor : this)[name](...args));
        }
        catch (err) {
          e.sender.send(`${name}-${nonce}`, null, err);
          console.error(err);
        }
      });
    }

    // Kick off the sync interval if we haven't already.
    if (!StateStore.syncInterval) {
      StateStore.syncInterval = setInterval(StateStore.sync, 30);
    }

    /* eslint-enable @typescript-eslint/no-var-requires */
    return this;
  }

  private static async sync<T extends StateStore>(this: StaticProps<T>) {
    if (IS_RENDERER) {
      for (const store of StateStore.toSync) {
        ipcRenderer.send(store.constructor.name, store[INTERNAL].generation, { ...store });
        StateStore.toSync.delete(store);
      }
    }
    else {
      for (const store of StateStore.toSync) {
        store[INTERNAL].generation = (store[INTERNAL].generation + 1) % Number.MAX_SAFE_INTEGER;
        for (const window of BrowserWindow.getAllWindows()) {
          window.webContents.send(store.constructor.name, store[INTERNAL].generation, { ...store });
        }
        StateStore.toSync.delete(store);
      }
    }
  }

  toJSON(): State<this> {
    if (IS_RENDERER && !this[INTERNAL].initialized) {
      ipcRenderer.send(`${this[INTERNAL].name}-init`);
    }
    return { ...this };
  }

  async data(): Promise<State<this>> {
    if (IS_RENDERER && !this[INTERNAL].initialized) {
      ipcRenderer.send(`${this[INTERNAL].name}-init`);
    }
    return { ...this };
  }

  static async setState<T extends StateStore>(this: Function & StaticProps<T>, patch: NewState<T>, immediate = false): Promise<void> {
    const instance = ensureInstance<T>(this);
    if (IS_RENDERER) {
      Object.assign(instance, patch);
      if (immediate) { ipcRenderer.send(instance.constructor.name, instance[INTERNAL].generation, instance); }
      else { StateStore.toSync.add(instance); }
      await notify(instance);
    }
    else {
      Object.assign(instance, patch);
      instance[INTERNAL].generation = (instance[INTERNAL].generation + 1) % Number.MAX_SAFE_INTEGER;
      StateStore.toSync.add(instance);
      if (immediate) { await StateStore.sync(); }
      await notify(instance);
    }
  }

  static onChange<T extends StateStore>(this: StaticProps<T>, cb: StateCallback<T>): void {
    ensureInstance<T>(this)[INTERNAL].renderers.add(cb);
  }

  static off<T extends StateStore>(this: StaticProps<T>, cb: StateCallback<T>): void {
    ensureInstance<T>(this)[INTERNAL].renderers.delete(cb);
  }

  static toJSON<T extends StateStore>(this: StaticProps<T>): State<T> {
    return ensureInstance<T>(this).toJSON();
  }

  static data<T extends StateStore>(this: StaticProps<T>): Promise<State<T>> {
    return ensureInstance<T>(this).data();
  }

  static main<T extends StateStore>(this: StaticProps<StateStore>, func: StateStoreMethod<T>): typeof func {
    if (!IS_RENDERER) { return func; }
    const funcName = `${func.name}MainProxy`;
    // Jump through a couple hoops here to have a sensible function name in dev tools.
    return ({
      [funcName](this: ThisParameterType<typeof func>, ...args: Parameters<typeof func>) {
        const storeName = typeof this === 'function' ? this.name : this[INTERNAL].name;
        const methodType = typeof this === 'function' ? 'static' : 'instance';
        const methodName = func.name;
        const nonce = uuid.next().value;
        return new Promise<ReturnType<typeof func>>((resolve, reject) => {
          ipcRenderer.once(`${methodName}-${nonce}`, (_: IpcRendererEvent, res: ReturnType<typeof func>, err: Error | null = null) => {
            err ? reject(err) : resolve(res);
          });
          ipcRenderer.send(`${storeName}-call`, methodType, methodName, nonce, ...args);
        });
      },
    })[funcName];
  }

  static renderer<T extends StateStore>(this: StaticProps<StateStore>, func: StateStoreMethod<T>): typeof func {
    if (IS_RENDERER) { return func; }
    // Jump through a couple hoops here to have a sensible function name in dev tools.
    const funcName = `${func.name}RendererProxy`;
    return ({
      [funcName](this: ThisParameterType<typeof func>, ...args: Parameters<typeof func>) {
        const storeName = typeof this === 'function' ? this.name : this[INTERNAL].name;
        const methodType = typeof this === 'function' ? 'static' : 'instance';
        const methodName = func.name;
        const nonce = uuid.next().value;
        return new Promise<ReturnType<typeof func>>((resolve, reject) => {
          ipcMain.once(`${methodName}-${nonce}`, (_: IpcMainEvent, res: ReturnType<typeof func>, err: Error | null = null) => {
            err ? reject(err) : resolve(res);
          });
          for (const window of BrowserWindow.getAllWindows()) {
            window.webContents.send(`${storeName}-call`, methodType, methodName, nonce, ...args);
          }
        });
      },
    })[funcName];
  }
}

export { main, renderer } from './decorators';
