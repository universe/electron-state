import { ElectronState } from './index.js';
import { AbstractStateMethod } from './types.js';

export function main<T extends typeof ElectronState>(target: T, key: string, descriptor: TypedPropertyDescriptor<AbstractStateMethod<InstanceType<T>>>): void {
  if (typeof target[key] !== 'function' || !descriptor.value) {
    throw new Error(`[ElectronState] The @main decorator must be used on an async class method. Instead applied to ${key}.`);
  }
  descriptor.value = target.main(descriptor.value).bind(target);
}

export function renderer<T extends typeof ElectronState>(target: T, key: string, descriptor: TypedPropertyDescriptor<AbstractStateMethod<InstanceType<T>>>): void {
  if (typeof target[key] !== 'function' || !descriptor.value) {
    throw new Error(`[ElectronState] The @renderer decorator must be used on an async class method. Instead applied to ${key}.`);
  }
  descriptor.value = target.renderer(descriptor.value).bind(target);
}
