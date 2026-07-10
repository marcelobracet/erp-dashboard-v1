import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

/** True after hydration — avoids setState-in-effect for mount detection. */
export function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
