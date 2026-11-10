// A tiny "please sync soon" signal. Saving data asks for a sync; the sync worker
// listens. Keeping it separate means the data layer never imports the sync code.

type Listener = () => void;

const listeners = new Set<Listener>();

export function onSyncRequested(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function requestSync(): void {
  listeners.forEach((listener) => listener());
}
