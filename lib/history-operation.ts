let operationQueue: Promise<void> = Promise.resolve();
let pendingRestoreOperations = 0;
const restoreListeners = new Set<() => void>();

function emitRestoreState(): void {
  restoreListeners.forEach((listener) => listener());
}

/**
 * Serializes logical operations that may replace or append to the real history.
 * A restore keeps the lock across SQLite and the related AsyncStorage records;
 * sessions arriving meanwhile resume only after the restored state is published.
 */
export function runHistoryOperation<T>(operation: () => Promise<T>): Promise<T> {
  const result = operationQueue.then(operation, operation);
  operationQueue = result.then(() => undefined, () => undefined);
  return result;
}

export function runRestoreOperation<T>(operation: () => Promise<T>): Promise<T> {
  pendingRestoreOperations += 1;
  emitRestoreState();
  return runHistoryOperation(operation).finally(() => {
    pendingRestoreOperations = Math.max(0, pendingRestoreOperations - 1);
    emitRestoreState();
  });
}

export function subscribeRestoreOperation(listener: () => void): () => void {
  restoreListeners.add(listener);
  return () => restoreListeners.delete(listener);
}

export function isRestoreOperationActive(): boolean {
  return pendingRestoreOperations > 0;
}
