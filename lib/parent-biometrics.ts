/** Web and tests: no fingerprint or Face ID, the PIN is the only way in. */
export async function biometricsAvailable(): Promise<boolean> {
  return false;
}

export async function authenticateParent(_promptMessage: string, _cancelLabel: string): Promise<boolean> {
  return false;
}
