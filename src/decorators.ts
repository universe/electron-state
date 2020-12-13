import { ElectronState, ElectronStateMethod, StaticProps } from './index';

export function main<T extends ElectronState>(target: T | StaticProps<T>, key: string, descriptor: TypedPropertyDescriptor<ElectronStateMethod<T>>): void {
  if (typeof target[key] !== 'function' || !descriptor.value) {
    throw new Error(`[ElectronState] The @main decorator must be used on an async class method. Instead applied to ${key}.`);
  }
  descriptor.value = ElectronState.main(descriptor.value);
}

export function renderer<T extends ElectronState>(target: T | StaticProps<T>, key: string, descriptor: TypedPropertyDescriptor<ElectronStateMethod<T>>): void {
  if (typeof target[key] !== 'function' || !descriptor.value) {
    throw new Error(`[ElectronState] The @renderer decorator must be used on an async class method. Instead applied to ${key}.`);
  }
  descriptor.value = ElectronState.renderer(descriptor.value);
}
