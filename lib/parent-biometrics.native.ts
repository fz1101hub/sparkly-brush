import * as LocalAuthentication from "expo-local-authentication";

/** True when the phone has a fingerprint reader or Face ID with at least one enrolled. */
export async function biometricsAvailable(): Promise<boolean> {
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
  } catch {
    return false;
  }
}

/**
 * Asks for the fingerprint or Face ID. The phone's own passcode is not accepted, since children
 * often know it: the app's PIN stays the fallback.
 */
export async function authenticateParent(promptMessage: string, cancelLabel: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel, disableDeviceFallback: true });
    return result.success;
  } catch {
    return false;
  }
}
