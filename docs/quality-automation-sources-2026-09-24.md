# Fonti verificate per automazione qualità

**Data:** 24 settembre 2026

## Maestro E2E

- Supporto React Native e selettori basati su `testID`: https://docs.maestro.dev/get-started/supported-platform/react-native
- `launchApp` e reset dello stato applicativo: https://docs.maestro.dev/reference/commands-available/launchapp
- Selettori core: https://docs.maestro.dev/reference/selectors/core-selectors
- Workspace, discovery e tag: https://docs.maestro.dev/maestro-flows/workspace-management/test-discovery-and-tags
- Flussi annidati e setup riusabile: https://docs.maestro.dev/maestro-flows/flow-control-and-logic/nested-flows
- Attese e preferenza per assertion polling rispetto agli sleep fissi: https://docs.maestro.dev/maestro-flows/flow-control-and-logic/wait-commands
- Report JUnit e artefatti: https://docs.maestro.dev/maestro-flows/workspace-management/test-reports-and-artifacts
- Installazione Maestro CLI e requisito Java 17+: https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli
- Release CI: https://github.com/mobile-dev-inc/Maestro/releases/tag/cli-2.10.0, asset `maestro.zip`, SHA-256 `29b675e10cc12080e445e9bfb2e2b4e4dfb9c0f2e30d5884120d258b5e1cd991`, verificato contro il digest pubblicato da GitHub Releases.
- Limiti noti, incluso `inputText` ASCII su Android: https://docs.maestro.dev/extra-materials/troubleshooting/known-issues
- Integrazione GitHub Actions/Cloud opzionale: https://docs.maestro.dev/maestro-cloud/ci-cd-integration/github-actions

## Accessibilità

- API accessibilità React Native e limiti per piattaforma: https://reactnative.dev/docs/accessibility
- Playwright accessibility testing con axe: https://playwright.dev/docs/accessibility-testing
- Expo SDK 57, React Native 0.86 e React 19.2: https://expo.dev/changelog/sdk-57
- React Native Testing Library quick start, consultato per confronto ma non adottato perché il progetto resta Vitest-only: https://oss.callstack.com/react-native-testing-library/docs/start/quick-start

## Decisioni derivate

- I test semantici component-level usano `test-renderer` 1.2 già allineato a React 19.2 e Vitest, senza introdurre Jest.
- Le scansioni browser usano `@playwright/test` 1.63.0 e `@axe-core/playwright` 4.13.0 con Node 22.
- I test Maestro non sostituiscono il collaudo BLE reale: onboarding, timer manuale e UI backup sono automatizzabili; Bluetooth, share sheet e DocumentPicker restano nel piano hardware/manuale.
