import { itCore } from "@/locales/it/core";
import { itDevice } from "@/locales/it/device";
import { itFamily } from "@/locales/it/family";
import { itGame } from "@/locales/it/game";
import { itUnified } from "@/locales/it/unified";

export const it = {
  ...itCore,
  ...itDevice,
  ...itGame,
  ...itFamily,
  ...itUnified,
} as const;

export type TranslationKey = keyof typeof it;
export type TranslationCatalog = Record<TranslationKey, string>;
