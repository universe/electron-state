import StateStore, { StateStoreMethod, StaticProps } from './index';

export function main<T extends StateStore>(target: T | StaticProps<T>, key: string, descriptor: TypedPropertyDescriptor<StateStoreMethod<T>>): void {
  if (typeof target[key] !== 'function' || !descriptor.value) {
    throw new Error(`[StateStore] The @main decorator must be used on an async class method. Instead applied to ${key}.`);
  }
  descriptor.value = StateStore.main(descriptor.value);
}

export function renderer<T extends StateStore>(target: T | StaticProps<T>, key: string, descriptor: TypedPropertyDescriptor<StateStoreMethod<T>>): void {
  if (typeof target[key] !== 'function' || !descriptor.value) {
    throw new Error(`[StateStore] The @renderer decorator must be used on an async class method. Instead applied to ${key}.`);
  }
  descriptor.value = StateStore.renderer(descriptor.value);
}
