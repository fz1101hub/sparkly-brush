import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

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
  const file = new File(Paths.cache, fileName);
  let handedToShareSheet = false;
  try {
    file.create({ overwrite: true, intermediates: true });
    file.write(content);
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error(t("hardware.report.shareUnavailable"));
    }
    await Sharing.shareAsync(file.uri, {
      dialogTitle: t("hardware.report.shareDialogTitle"),
      mimeType: "text/markdown",
      UTI: "net.daringfireball.markdown",
    });
    handedToShareSheet = true;
  } finally {
    if (!handedToShareSheet && file.exists) file.delete();
  }
}
