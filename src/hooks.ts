import { Dispatch, SetStateAction, useLayoutEffect, useState } from 'react';

import { State } from './index';

type StateUpdater<S> = Dispatch<SetStateAction<S>>;
/* eslint-disable  @typescript-eslint/no-explicit-any */
interface IElectronState {
  new(): any;
  toJSON: () => any;
  onChange: (cb: (state: any) => void) => void;
  off: (cb: (state: any) => void) => void;
  setState: (state: any) => Promise<void>;
}
/* eslint-enable  @typescript-eslint/no-explicit-any */

export function useElectronState<Store extends IElectronState>(store: Store): [State<InstanceType<Store>>, (patch: Partial<InstanceType<Store>>) => Promise<void>] {
  let setStore: StateUpdater<Partial<State<InstanceType<Store>>>> | null = null;
  let storeState: State<InstanceType<Store>> | null = null;

  // Keep a local function reference so we can unsubscribe on `useLayoutEffect` cleanup below.
  const onChange = (state: State<InstanceType<Store>>) => setStore && setStore(state);

  // We need to listen for onChange events before calling `toJSON` in case this is the first invocation.
  // On first invocation, an instance is created and we emit an init event. The listener must be bound to catch any particularly fast responses.
  // However, useState does not have a teardown method. To stop listening to change events. We handle that with useLayoutEffect below.
  [ storeState, setStore ] = useState(() => {
    store.onChange(onChange);
    return store.toJSON();
  });

  // For the reasons described above, we can't use useLayoutEffect to bind change events. However, we do
  // need to use it for its teardown method to stop listening to events and prevent memory leaks!
  useLayoutEffect(() => () => store.off(onChange), []);

  return [ storeState as State<InstanceType<Store>>, store.setState.bind(store) as (patch: Partial<InstanceType<Store>>) => Promise<void> ];
}
