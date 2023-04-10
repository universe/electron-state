const INTERNAL = Symbol('state-store-state');
const LISTENERS = Symbol('state-store-listeners');
export { INTERNAL }

const CACHE: Map<StaticProps<AbstractState>, AbstractState> = new Map();

export function ensureInstance<T extends AbstractState>(constructor: StaticProps<T>): T {
  const singleton = CACHE.get(constructor);
  if (singleton) { return singleton as T; }
  const inst = new constructor();
  CACHE.set(constructor, inst);
  return inst as T;
}

export function toJSON<T extends AbstractState>(obj: T): State<T> {
  const data: State<T> = { ...obj };
  delete data[LISTENERS];
  delete data[INTERNAL];
  return data;
}

export interface AbstractStateMethods<T extends AbstractState> {
  new (): T;
  toJSON(): State<T>;
  onChange<T extends AbstractState>(this: StaticProps<T>, cb: StateCallback<T>): void;
  off<T extends AbstractState>(this: StaticProps<T>, cb: StateCallback<T>): void;
  setState(this: StaticProps<T>, state: Partial<T>): Promise<void>;
  trigger(this: StaticProps<T>): void;
  reset(this: StaticProps<T>): Promise<void>;
}

export type AbstractStateAPI<T extends typeof AbstractState> = AbstractStateMethods<InstanceType<T>> & Pick<T, Exclude<keyof T, 'prototype'>>

export interface PrivateState<T extends AbstractState> {
  name: string;
  listeners: Set<StateCallback<T>>;
}

abstract class AbstractState<InheritedState extends {} = any> {
  abstract [INTERNAL]?: InheritedState;
  [LISTENERS]: PrivateState<AbstractState> = { name: '', listeners: new Set() };
  constructor(bare?: true) {
    // If we request a bare instance (properties only) do nothing here.
    if (bare) { return this; }

    // Enforce a process-wide singleton regardless of environment.
    const singleton = CACHE.get(this.constructor as StaticProps<this>);
    if (singleton) { return singleton; }
    CACHE.set(this.constructor as StaticProps<this>, this);
    this[LISTENERS].name = this.constructor.name;
    // Make sure our internal state property is non enumerable and can't be written over.
    !!this[LISTENERS] && Object.defineProperty(this, LISTENERS, { writable: false, enumerable: false, configurable: true });
    !this[INTERNAL] && Object.defineProperty(this, INTERNAL, { writable: true, enumerable: false, configurable: true });
  }

  static toJSON<T extends AbstractState>(this: StaticProps<T>): State<T> { 
    return toJSON(ensureInstance(this));
  }

  static onChange<T extends AbstractState>(this: StaticProps<T>, cb: StateCallback<T>): void {
    ensureInstance(this)[LISTENERS].listeners.add(cb as any);
  }

  static off<T extends AbstractState>(this: StaticProps<T>, cb: StateCallback<T>): void {
    ensureInstance(this)[LISTENERS].listeners.delete(cb as any);
  }

  static async reset<T extends AbstractState>(this: StateConstructor<T>): Promise<void> {
    const data: AbstractState = new this(true);
    return this.setState(toJSON(data));
  }

  static trigger<T extends AbstractState>(this: StaticProps<T>): void {
    const instance = ensureInstance(this);
    for (const callback of ensureInstance<T>(this)[LISTENERS].listeners) { callback(toJSON(instance)); }
  }
}


type AbstractStateKeys = keyof AbstractState | typeof INTERNAL;
type FilterType<Base, Condition> = Pick<Base, { [Key in keyof Base]: Base[Key] extends Condition ? never : Key }[keyof Base]>;
type StaticProps<T extends AbstractState> = { new (bare?: true): T; };
export type AbstractStateMethod<T extends AbstractState> = (this: T | StaticProps<T>, ...args: any[]) => Promise<any>;
export type State<T extends AbstractState> = FilterType<Pick<T, Exclude<keyof T, AbstractStateKeys>>, typeof AbstractState>;
export type NewState<T extends AbstractState> = Partial<State<T>>
export type StateCallback<T extends AbstractState> = (state: State<T>) => any;
export type StateConstructor<T extends AbstractState> = Function & { new (bare?: true): T; } & AbstractStateMethods<T>
export default AbstractState;
