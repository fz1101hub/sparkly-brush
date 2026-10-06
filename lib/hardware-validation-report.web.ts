import {
  translateDynamic,
  type TranslationKey,
  type TranslationParams,
} from "@/lib/i18n";
import { DEFAULT_LOCALE } from "@/lib/locale-types";

type ReportTranslate = (
  key: TranslationKey,
  params?: TranslationParams,
) => string;

const defaultTranslate: ReportTranslate = (key, params) =>
  translateDynamic(DEFAULT_LOCALE, key, params);

export async function exportHardwareValidationReport(
  fileName: string,
  content: string,
  t: ReportTranslate = defaultTranslate,
): Promise<void> {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    throw new Error(t("hardware.report.downloadUnavailable"));
  }
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
