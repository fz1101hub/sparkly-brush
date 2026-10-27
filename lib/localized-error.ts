import type { TranslationKey, TranslationParams } from "@/lib/i18n";

/**
 * An error whose message the user reads. It carries a catalog key instead of text, so the screen
 * that shows it translates it in the active language; `message` keeps the key for logs.
 */
export class LocalizedError extends Error {
  readonly key: TranslationKey;
  readonly params?: TranslationParams;

  constructor(key: TranslationKey, params?: TranslationParams) {
    super(key);
    this.name = "LocalizedError";
    this.key = key;
    this.params = params;
  }
}

type Translate = (key: TranslationKey, params?: TranslationParams) => string;

/** Text to show for any caught value: translated when known, otherwise the generic fallback. */
export function errorText(error: unknown, t: Translate, fallback: TranslationKey = "common.actionFailedMessage"): string {
  if (error instanceof LocalizedError) return t(error.key, error.params);
  return t(fallback);
}
