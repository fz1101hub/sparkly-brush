import type { TranslationCatalog } from "@/locales/it";

export const de = {
  "common.back": "Zurück",
  "common.cancel": "Abbrechen",
  "common.continue": "Weiter",
  "common.loading": "Laden…",
  "common.retry": "Erneut versuchen",
  "common.unknown": "Unbekannt",
  "common.sessions": "Sitzungen",
  "common.complete": "abgeschlossen",
  "language.title": "Sprache",
  "language.description":
    "Wähle die Sprache der App. Mit der Option System wird die Sprache deines Geräts verwendet.",
  "language.system": "System",
  "language.it": "Italiano",
  "language.en": "English",
  "language.de": "Deutsch",
  "language.fr": "Français",
  "language.es": "Español",
  "recovery.failed": "Die Datenwiederherstellung ist fehlgeschlagen",
  "recovery.retry": "Erneut versuchen",
  "recovery.protectedTitle": "Geschützte Daten",
  "recovery.restart":
    "{error}. Starte die App neu, ohne ihre Daten zu löschen.",
  "recovery.inProgressLabel": "Daten werden gerade wiederhergestellt",
  "recovery.inProgressTitle": "Sichere Wiederherstellung läuft",
  "notFound.title": "Seite nicht gefunden",
  "notFound.message": "Der geöffnete Link führt zu keiner Ansicht von Sparkly Brush.",
  "notFound.action": "Zurück zu Heute",
  "notFound.actionLabel": "Zurück zur Ansicht Heute",
  "error.title": "Etwas ist schiefgelaufen",
  "error.message": "Die App ist auf ein unerwartetes Problem gestoßen. Deine Daten sind sicher: Versuch es erneut oder schließe die App und öffne sie wieder.",
  "error.retry": "Erneut versuchen",
  "error.detailsLabel": "Technisches Detail",
  "common.actionFailedTitle": "Aktion fehlgeschlagen",
  "common.actionFailedMessage": "Versuch es gleich noch einmal. Bleibt das Problem, schließe die App und öffne sie erneut.",
  "recovery.inProgressMessage":
    "Schließe die App nicht. Die Änderungen sind gleich wieder verfügbar.",
  "app.brand": "Brushlings",
  "tabs.today": "Heute",
  "tabs.creatures": "Kreaturen",
  "tabs.explore": "Erkunden",
  "tabs.history": "Verlauf",
  "tabs.toothbrush": "Zahnbürste",
  "header.toothbrushConnected": "Zahnbürste angeschlossen",
  "header.toothbrushDisconnected": "Zahnbürste nicht angeschlossen",
  "home.loading.headerTitle": "Ich bereite dein Abenteuer vor…",
  "home.loading.title": "Deine Welt wird geladen",
  "home.loading.description":
    "Einen Moment: Ich bereite die auf diesem Telefon gespeicherten Kreaturen und Fortschritte vor.",
  "home.starter.headerTitle": "Dein Abenteuer beginnt hier",
  "home.starter.privacyNote":
    "Die Wahl deines Begleiters wird nur auf diesem Telefon gespeichert.",
  "home.greeting": "Hallo, {name} ist bereit!",
  "home.demo.eyebrow": "DEMO-LABOR",
  "home.demo.title": "Simulierte Daten aktiv",
  "home.demo.description":
    "Echter Verlauf und Backup bleiben getrennt und intakt.",
  "home.demo.exitLabel": "Demo-Modus verlassen",
  "home.demo.exit": "Beenden",
  "home.companion.eyebrow": "DEIN BEGLEITER",
  "home.companion.evolutionNotice":
    "Auf Level {level} kann er sich zu {name} entwickeln.",
  "home.companion.levelProgressLabel": "Fortschritt zu Level {level}",
  "home.companion.stats": "Level {level} · {xp} XP · {coins} {coins|Lächeln-Münze|Lächeln-Münzen}",
  "home.companion.speechAttribution": "{name} sagt:",
  "home.familyReward.eyebrow": "FAMILIENBELOHNUNG",
  "home.familyReward.progressLabel":
    "Fortschritt der Familienbelohnung: {title}",
  "home.familyReward.unlockedMessage":
    "Ziel erreicht! Sprich mit einem Elternteil darüber.",
  "home.familyReward.lockedMessage":
    "Mach mit deiner Routine weiter, um sie freizuschalten.",
  "home.device.demoMode": "Demo-Modus",
  "home.device.searching": "Sonicare wird gesucht…",
  "home.device.defaultModel": "HX6322/04",
  "home.device.demoDescription":
    "Die simulierten Sitzungen ändern nichts am tatsächlichen Verlauf.",
  "home.device.connectLabel": "Zahnbürste verbinden",
  "home.device.wait": "Bitte warten",
  "home.device.connect": "Verbinden",
  "home.device.modeKids": "Kids",
  "home.device.modeClean": "Clean",
  "home.timer.eyebrow": "GEFÜHRTE SITZUNG",
  "home.timer.activeTitle": "{name} feuert dich an!",
  "home.timer.inactiveTitle": "Bereit zum Zähneputzen?",
  "home.timer.activeZonePrompt": "Putze: {zone}",
  "home.timer.inactiveZonePrompt":
    "Jeder Bereich erhält die gleiche Aufmerksamkeit",
  "home.timer.stopManualLabel": "Manuellen Timer beenden",
  "home.timer.startManualLabel": "Manuellen Zwei-Minuten-Timer starten",
  "home.timer.stopSession": "Sitzung beenden",
  "home.timer.saving": "Wird gespeichert…",
  "home.timer.savePrevious": "Speichere zuerst die vorherige Sitzung",
  "home.timer.fromToothbrush": "Sitzung von der Zahnbürste",
  "home.timer.startWithoutBluetooth": "Auch ohne Bluetooth starten",
  "home.saveError.title": "Sitzung noch nicht gespeichert",
  "home.saveError.fallback":
    "Wir behalten die Sitzung im Speicher, bis sie gespeichert ist.",
  "home.saveError.retryLabel": "Speichern der Sitzung erneut versuchen",
  "home.saveError.retry": "Erneut versuchen",
  "home.stats.sessionsToday": "Sitzungen heute",
  "home.stats.minutesToday": "heute geputzt",
  "home.stats.minutesValue": "{minutes} min",
  "home.missions.label":
    "Heutige Missionen öffnen, {completed} von {total} abgeschlossen",
  "home.missions.eyebrow": "HEUTIGE MISSIONEN",
  "home.missions.progress": "{completed}/{total} abgeschlossen",
  "home.missions.completedMessage": "Truhe des Lächelns geöffnet!",
  "home.missions.incompleteMessage":
    "Morgens, abends und ein doppeltes Lächeln: Schließe die Routine für den Bonus ab.",
  "home.rewards.currentStreak": "Tage in Folge (aktuelle Serie)",
  "home.rewards.completedToday": "vollständige Sitzungen heute",
  "home.privacyNote":
    "Kein Konto: Verlauf und Fortschritte bleiben auf diesem Telefon.",
  "onboarding.dialogLabel":
    "Sparkly Brush-Einführung, Seite {current} von {total}",
  "onboarding.slide1.eyebrow": "WILLKOMMEN",
  "onboarding.slide1.title": "Ein kleiner Freund, der mit einem Lächeln wächst",
  "onboarding.slide1.body":
    "Jede Sitzung hilft deinem Brushling, XP zu sammeln, die Insel zu erkunden und neue Freunde zu finden.",
  "onboarding.slide2.eyebrow": "WIE ES FUNKTIONIERT",
  "onboarding.slide2.title": "Zwei Minuten werden zum Abenteuer",
  "onboarding.slide2.body":
    "Morgens und abends warten Missionen, Eier, Entwicklungen, Gegenstände und Belohnungen auf dich. Das Spiel folgt deinem echten Sitzungsverlauf.",
  "onboarding.slide3.eyebrow": "FÜR DIE GROSSEN",
  "onboarding.slide3.title": "Eltern sehen Routine, keine Note",
  "onboarding.slide3.body":
    "Die Übersicht zeigt, was die App aufgezeichnet hat, und erlaubt Familienbelohnungen. Es werden keine Daten an ein Konto gesendet.",
  "onboarding.slide4.eyebrow": "DEINE WELT",
  "onboarding.slide4.title":
    "Dein Brushling kann dich auch auf ein neues Telefon begleiten",
  "onboarding.slide4.body":
    "Backups, ein separater Demo-Modus und lokale Einstellungen schützen deine Fortschritte, ohne dass du ein Online-Profil erstellen musst.",
  "onboarding.pageCount": "{current} von {total}",
  "onboarding.backLabel": "Zur vorherigen Seite",
  "onboarding.back": "Zurück",
  "onboarding.nextLabel": "Zur nächsten Seite",
  "onboarding.completeLabel": "Einführung abschließen und Abenteuer beginnen",
  "onboarding.start": "Abenteuer beginnen",
  "starter.eyebrow": "DAS ABENTEUER BEGINNT",
  "starter.title": "Wähle deinen ersten Brushling!",
  "starter.description":
    "Jedes große Abenteuer beginnt mit einem kleinen Begleiter. Dein Team kannst du später noch ändern.",
  "starter.groupLabel": "Wähle deinen ersten Brushling",
  "starter.optionLabel": "{name}, Typ {element}",
  "starter.confirmLabel": "{name} als ersten Brushling bestätigen",
  "starter.saving": "Wird gespeichert…",
  "starter.confirm": "Mit {name} loslegen",
  "sessionReward.completedLabel": "Sitzung abgeschlossen",
  "sessionReward.interruptedLabel": "Sitzung abgebrochen",
  "sessionReward.doubleSurpriseEyebrow": "DOPPELTE ÜBERRASCHUNG!",
  "sessionReward.evolutionEyebrow": "ENTWICKLUNG!",
  "sessionReward.hatchedEyebrow": "DAS EI IST GESCHLÜPFT!",
  "sessionReward.completedEyebrow": "SITZUNG ABGESCHLOSSEN",
  "sessionReward.interruptedEyebrow": "SCHÖNER VERSUCH",
  "sessionReward.doubleSurpriseTitle":
    "Aus {from} ist {to} geworden und {name} ist dem Team beigetreten!",
  "sessionReward.evolutionTitle": "{from} hat sich zu {to} entwickelt!",
  "sessionReward.encounterTitle": "Du hast {name} kennengelernt!",
  "sessionReward.completedTitle": "Fantastische Arbeit!",
  "sessionReward.interruptedTitle": "Jede Sekunde zählt!",
  "sessionReward.xpEarned": "+{xp} XP",
  "sessionReward.coinsEarned": "+{coins}",
  "sessionReward.discoveryEyebrow": "DU HAST GEFUNDEN",
  "sessionReward.eggFound": "+ {name}: Putze weiter, damit es schlüpft!",
  "sessionReward.eggHatched":
    "{name} ist geschlüpft: ein neuer Brushling für dein Team.",
  "sessionReward.adventureBonus": "ABENTEUERBONUS +{coins}",
  "sessionReward.chestUnlocked": "Truhe des Lächelns geöffnet!",
  "sessionReward.newBadge": "Neues Abzeichen freigeschaltet!",
  "sessionReward.missionCompleted": "Mission abgeschlossen!",
  "sessionReward.newLevel": "Neues Level: {level}",
  "sessionReward.doubleSurpriseMessage":
    "{evolvedName} ist stärker und {hatchedName} wartet im Bereich Kreaturen auf dich.",
  "sessionReward.hatchedMessage":
    "{name} ist jetzt im Bereich Kreaturen verfügbar. Setze dein Abenteuer fort, um weitere Belohnungen zu entdecken.",
  "sessionReward.completedMessage":
    "Du hast deinem Lächeln zwei Minuten Superkraft geschenkt. Dein Brushling ist stärker geworden!",
  "sessionReward.interruptedMessage":
    "Versuche beim nächsten Mal bis zum Ende zu putzen: Dein Brushling wartet auf dich.",
  "sessionReward.dismissLabel": "Belohnung schließen und fortfahren",
  "sessionReward.doubleSurpriseAction": "Überraschungen entdecken",
  "sessionReward.hatchedAction": "Neuen Freund kennenlernen",
  "sessionReward.evolutionAction": "Abenteuer fortsetzen",
  "sessionReward.defaultAction": "Fantastisch!",
  "timerRing.label": "Putztimer: {elapsed} von {target}",
  "timerRing.objective": "Ziel {time}",
  "timer.zone.upperRight": "Oben rechts",
  "timer.zone.upperLeft": "Oben links",
  "timer.zone.lowerLeft": "Unten links",
  "timer.zone.lowerRight": "Unten rechts",
  "mouthZones.progressLabel": "Fortschritt der Putzbereiche",
  "mouthZones.activeHint": "Aktive Zone: {zone}",
  "mouthZones.inactiveHint": "Die Sitzung hat noch nicht begonnen",
  "mouthZones.progressText": "{completed} von {total} Bereichen abgeschlossen",
  "mouthZones.completedZone": "Fertig · {zone}",
  "mouthZones.activeZone": "Jetzt · {zone}",
  "mouthZones.duration": "{seconds} {seconds|Sekunde|Sekunden}",
  "avatar.label": "{name}, Kreatur {element}, Evolution {stage}",
  "avatar.levelBadge": "Lv {level}",
  "context.brushling.missingProvider":
    "useBrushling muss innerhalb von BrushlingProvider verwendet werden",
  "device.eyebrow": "Bluetooth Low Energy",
  "device.title": "Zahnbürste",
  "device.defaultModel": "Philips Sonicare for Kids",
  "device.protocol": "HX63xx · offenes GATT",
  "device.forgetAlertTitle": "Diesen Handgriff entfernen?",
  "device.forgetAlertMessage":
    "Nutze dies nur, nachdem genau dieser Handgriff auf die Werkseinstellungen zurückgesetzt wurde. Ist der Zähler nicht zurückgesetzt, lehnt die App den Verlauf ab, damit keine doppelten Gutschriften entstehen. Verlauf, Brushling, XP, Münzen und Backups werden nicht gelöscht.",
  "device.forgetAction": "Handgriff entfernen",
  "device.forgetFailureTitle": "Handgriff kann nicht entfernt werden",
  "device.retryLater": "Versuche es gleich noch einmal.",
  "device.disconnectLabel": "Zahnbürste trennen",
  "device.connectLabel": "Zahnbürste verbinden",
  "device.syncLabel": "Sitzungen von der Zahnbürste synchronisieren",
  "device.demoActive": "Demo aktiv",
  "device.disconnect": "Trennen",
  "device.searching": "Suche läuft…",
  "device.searchConnect": "Suchen und verbinden",
  "device.syncLatest": "Letzte Sitzung synchronisieren",
  "device.adapter": "Adapter",
  "device.adapterState.unknown": "Unbekannt",
  "device.adapterState.resetting": "Wird neu gestartet",
  "device.adapterState.unsupported": "Nicht unterstützt",
  "device.adapterState.unauthorized": "Nicht autorisiert",
  "device.adapterState.poweredOff": "Aus",
  "device.adapterState.poweredOn": "Ein",
  "device.handleState": "Handgriffstatus",
  "device.unknown": "unbekannt",
  "device.handleState.off": "aus",
  "device.handleState.idle": "bereit",
  "device.handleState.brushing": "putzt",
  "device.handleState.charging": "wird geladen",
  "device.handleState.shuttingDown": "wird ausgeschaltet",
  "device.handleState.verifying": "wird geprüft",
  "device.handleState.background": "Hintergrund",
  "device.intensity.low": "niedrig",
  "device.intensity.medium": "mittel",
  "device.intensity.high": "hoch",
  "device.intensity": "Intensität",
  "device.firmware": "Firmware",
  "device.firmwareToRead": "zu lesen",
  "device.forgetResetLabel": "Zurückgesetzten Handgriff entfernen",
  "device.forgetResetHint":
    "Nur nach dem Zurücksetzen dieses Handgriffs auf die Werkseinstellungen verwenden; alle Fortschritte bleiben erhalten",
  "device.forgetting": "Wird entfernt…",
  "device.forgetResetDescription":
    "Nur nach Zurücksetzen auf die Werkseinstellungen; löscht keinen Verlauf, Fortschritt oder Backups.",
  "device.pairedHandle": "Gekoppelter Handgriff: {name}",
  "device.noPairedHandle": "Kein gekoppelter Handgriff: Der erste, den du verbindest, wird gemerkt",
  "device.changeHandle": "Handgriff wechseln",
  "device.changeHandleLabel": "Einen anderen Handgriff koppeln",
  "device.changeHandleHint": "Sucht einen anderen als den gekoppelten Handgriff und merkt sich stattdessen diesen",
  "device.changeHandleDescription": "Für Geschwister oder einen neuen Handgriff; Verlauf und Fortschritt bleiben.",
  "device.changeHandleTitle": "Handgriff wechseln?",
  "device.changeHandleMessage": "Die App sucht einen anderen als den gekoppelten Handgriff und verbindet sich ab jetzt nur mit diesem. Verlauf, Fortschritt und Backups bleiben erhalten.",
  "device.changeHandleAction": "Anderen Handgriff suchen",
  "device.hint.permission": "Die Bluetooth-Berechtigung wurde verweigert: Ohne sie kann die Zahnbürste nicht gefunden werden. Du kannst sie in den App-Einstellungen erteilen.",
  "device.hint.bluetoothOff": "Bluetooth am Telefon ist aus: Schalte es ein, um die Zahnbürste zu suchen.",
  "device.hint.locationOff": "Auf dieser Android-Version braucht die Bluetooth-Suche den eingeschalteten Standort in den Systemeinstellungen.",
  "device.openAppSettings": "App-Einstellungen öffnen",
  "device.openBluetoothSettings": "Bluetooth-Einstellungen öffnen",
  "device.openLocationSettings": "Standort-Einstellungen öffnen",
  "device.gap.message": "Der Handgriff speichert mehr Sitzungen, als die App auf einmal abrufen kann. Du kannst mit den neuesten fortfahren: Ältere Sitzungen werden nicht importiert.",
  "device.gap.action": "Mit den neuesten Sitzungen fortfahren",
  "device.gap.confirmTitle": "Mit den neuesten Sitzungen fortfahren?",
  "device.gap.confirmMessage": "Die App importiert nur die neuesten Sitzungen, die der Handgriff noch speichert, und markiert die früheren als verloren. Bereits gespeicherter Verlauf und Fortschritt bleiben.",
  "device.demoEyebrow": "WERKSTATT OHNE ZAHNBÜRSTE",
  "device.demoTitle": "Demo-Modus",
  "device.demoSummary":
    "{count} {count|simulierte Sitzung|simulierte Sitzungen} · echte Daten bleiben unverändert",
  "device.demoDescription":
    "Probiere Entwicklungen, Eier, Missionen und die Übersicht aus, ohne den echten Verlauf zu verändern.",
  "device.demoSwitchLabel": "Demo-Modus",
  "device.demoMorningLabel": "Demo-Sitzung für morgens erfassen",
  "device.demoMorning": "Morgen",
  "device.demoEveningLabel": "Demo-Sitzung für abends erfassen",
  "device.demoEvening": "Abend",
  "device.demoWeekLabel": "Eine Woche Demo-Daten erzeugen",
  "device.demoWeek": "7 Tage",
  "device.demoClearLabel": "Demodaten löschen",
  "device.demoClear": "Zurücksetzen",
  "device.hardwareOpenLabel": "Hardware-Test öffnen",
  "device.hardwareEyebrow": "HX6322/04-TEST",
  "device.hardwareTitle": "Geführter Test und Bericht",
  "device.hardwareDescription":
    "Dauerhafte iOS/Android-Matrix mit bereinigter Diagnose.",
  "device.backupOpenLabel": "Backup und Wiederherstellung öffnen",
  "device.backupEyebrow": "DATEN & ÜBERTRAGUNG",
  "device.backupTitle": "Deinen Brushling schützen",
  "device.backupDescription":
    "Ein tragbares Backup, damit du Fortschritte und Begleiter auf einem neuen Telefon wiederfindest.",
  "device.diagnosticsTitle": "BLE-Diagnose",
  "device.diagnosticsDescription":
    "Hilfreich, um deinen echten HX6322/04 zu prüfen",
  "device.live": "LIVE",
  "device.emptyLogs": "Hier werden Bluetooth-Nachrichten angezeigt.",
  "backup.bytes": "{value} B",
  "backup.kilobytes": "{value} KB",
  "backup.megabytes": "{value} MB",
  "backup.exportSuccess": "Vollständiges Backup erstellt: {sessions} {sessions|Sitzung|Sitzungen}, {size}. Bitte prüfen, ob es über das Teilen-Menü gespeichert wurde.",
  "backup.exportFailed": "Die Sicherung ist fehlgeschlagen",
  "backup.shareDialogTitle": "Vollständige Sicherung von Sparkly Brush speichern",
  "backup.invalidFile": "Ungültige Sicherungsdatei",
  "backup.invalidBackup": "Ungültige Sicherung",
  "backup.legacyRestoreSuccess":
    "Altes Backup wiederhergestellt. Alle verfügbaren Sitzungen und der gesamte Fortschritt wurden importiert.",
  "backup.restoreSuccess":
    "Wiederherstellung abgeschlossen: Alle Sitzungen und Fortschritte sind wieder da.",
  "backup.restoreFailed": "Wiederherstellung fehlgeschlagen",
  "backup.backLabel": "Zurück",
  "backup.eyebrow": "Schütze deinen Begleiter",
  "backup.title": "Backup und Übertragung",
  "backup.heroTitle": "Jeder Fortschritt folgt dem Brushling",
  "backup.heroDescription":
    "Eine einzige Datei enthält alle Sitzungen mit Datum und Dauer sowie Fortschritte, Begleiter, Höhle, Belohnungen und Einstellungen. Die Bluetooth-Kennungen des Handgriffs werden durch unlesbare Aliasse ersetzt.",
  "backup.demoTitle": "Demomodus aktiv",
  "backup.demoDescription":
    "Backups verwenden nur echte Daten. Beende den Demo-Modus, bevor du exportierst oder wiederherstellst.",
  "backup.exitDemo": "Demo beenden",
  "backup.loading": "Daten werden geladen…",
  "backup.createTitle": "1. Backup erstellen",
  "backup.createDescription":
    "Speichere es in Mail, Nachrichten, Drive oder an einem anderen Ort, auf den du nach dem Telefonwechsel noch zugreifen kannst.",
  "backup.summaryBrushling": "Brushling",
  "backup.summarySessions": "Archivierte Sitzungen",
  "backup.summaryDenItems": "Gegenstände für die Höhle",
  "backup.summaryFamilyRewards": "Familienbelohnungen",
  "backup.exportLabel": "Vollständige Backup-Datei speichern",
  "backup.nativeOnly": "Verfügbar für iOS und Android",
  "backup.preparing": "Vorbereitung…",
  "backup.saveComplete": "Vollständige Datei speichern",
  "backup.fingerprint": "Sicherungs-ID · {id}",
  "backup.restoreTitle": "2. Auf einem neuen Telefon wiederherstellen",
  "backup.restoreDescription":
    "Wähle die gespeicherte .brushlings-Datei. Die App prüft vor der Wiederherstellung ihre Integrität und die Anzahl der Sitzungen.",
  "backup.pickFileLabel": ".brushlings-Datei zur Wiederherstellung auswählen",
  "backup.pickFile": "Backup-Datei auswählen",
  "backup.verifiedComplete": "VOLLSTÄNDIGE DATEI GEPRÜFT",
  "backup.verifiedLegacy": "LEGACY-BACKUP GEPRÜFT",
  "backup.previewTitle": "{name} · {sessions} {sessions|Sitzung|Sitzungen}",
  "backup.createdAt": "{size} · erstellt am {date}.",
  "backup.legacyOrigin":
    "Legacy-Quelle: Alle Fortschritte bleiben erhalten, aber der alte Code enthielt nur {sessions} {sessions|einsehbaren Eintrag|einsehbare Einträge}.",
  "backup.replaceCompleteWarning":
    "Durch die Wiederherstellung wird das echte Archiv dieses Telefons vollständig ersetzt.",
  "backup.restoreFileLabel":
    "Komplettes Archiv aus ausgewählter Datei wiederherstellen",
  "backup.restoreFileHint":
    "Ersetzt den gesamten echten Verlauf, Fortschritt und die Einstellungen auf diesem Telefon",
  "backup.restoreComplete": "Komplettes Archiv wiederherstellen",
  "backup.confirmTitle": "Wiederherstellung bestätigen?",
  "backup.confirmFile": "Ja, Archiv ersetzen",
  "backup.confirmLegacy": "Ja, Fortschritt ersetzen",
  "backup.compareTitle": "Vor der Wiederherstellung vergleichen",
  "backup.compareCurrent": "Auf diesem Telefon",
  "backup.compareIncoming": "Im Backup",
  "backup.compareLifetime": "Sitzungen insgesamt",
  "backup.compareCompleted": "Abgeschlossen",
  "backup.compareCompleteRows": "Geprüfte Sitzungen in der Datei: {count}.",
  "backup.comparePartialRows":
    "Einsehbare Sitzungen: {count}. Der gesamte Fortschritt kann weitere umfassen.",
  "backup.compareOlder":
    "Das Backup enthält weniger Sitzungen insgesamt oder weniger abgeschlossene Sitzungen als dieses Telefon.",
  "backup.compareNoMerge":
    "Beim Wiederherstellen werden Daten nicht zusammengeführt: Auch bei gleicher Anzahl werden die Sitzungen auf diesem Telefon ersetzt.",
  "backup.legacyTitle": "Hast du einen alten Backup-Code?",
  "backup.legacyDescription":
    "Die Codes v1 und v2 können weiterhin importiert werden, damit Daten aus früheren Versionen nicht verloren gehen.",
  "backup.legacyCodeLabel": "Legacy-Backup-Code",
  "backup.legacyCodePlaceholder": "BRUSHLINGS-BACKUP-1/2:… hier einfügen",
  "backup.inspectCodeLabel": "Backup-Code prüfen",
  "backup.inspectCode": "Alten Code prüfen",
  "backup.validBackup": "GÜLTIGES BACKUP",
  "backup.createdOn": "Erstellt am {date}.",
  "backup.replaceWarning":
    "Durch die Wiederherstellung werden die echten Fortschritte auf diesem Telefon ersetzt.",
  "backup.restoreLegacyLabel":
    "Archiv aus überprüftem Backup-Code wiederherstellen",
  "backup.restoreLegacyHint":
    "Ersetzt die echten Fortschritte auf diesem Telefon",
  "backup.restoreBrushling": "Diesen Brushling wiederherstellen",
  "backup.privacy":
    "Die Datei enthält Datum und Dauer aller Sitzungen. Veröffentliche sie nicht online, sondern bewahre sie als privates Familiendokument auf.",
  "hardware.status.passed": "Bestanden",
  "hardware.status.failed": "Fehlgeschlagen",
  "hardware.status.blocked": "Blockiert",
  "hardware.status.pending": "Zu tun",
  "hardware.unknownVersion": "unbekannt",
  "hardware.saveFailed": "Die lokale Speicherung ist fehlgeschlagen",
  "hardware.loadFailed": "Gespeicherter Test kann nicht geladen werden",
  "hardware.reportReady": "Bereinigter Bericht wurde erfolgreich vorbereitet.",
  "hardware.exportFailed": "Der Export des Berichts ist fehlgeschlagen",
  "hardware.resetConfirmWeb":
    "Neuen Test erstellen? Die aktuellen Ergebnisse und Notizen werden gelöscht.",
  "hardware.resetAlertTitle": "Neuer Test?",
  "hardware.resetAlertMessage":
    "Die Ergebnisse und Notizen der aktuellen Sitzung werden gelöscht.",
  "hardware.resetAction": "Neu beginnen",
  "hardware.resultLabel": "Ergebnis: {title}",
  "hardware.resultOptionLabel": "{title}: {status}",
  "hardware.notePlaceholder":
    "Hinweis, beobachteter Fehler oder Screenshot-Referenz …",
  "hardware.noteLabel": "Hinweise für {title}",
  "hardware.backLabel": "Zurück",
  "hardware.eyebrow": "HX6322/04 · iOS und Android",
  "hardware.title": "Hardware-Test",
  "hardware.heroTitle": "Eine überprüfbare Matrix, keine verstreuten Notizen",
  "hardware.heroDescription":
    "Die Ergebnisse bleiben auf dem Telefon, und der Bericht schwärzt UUIDs, MAC-Adressen und dauerhafte IDs.",
  "hardware.demoWarning":
    "Beende den Demo-Modus, bevor du den echten Handgriff testest.",
  "hardware.progressTitle": "Fortschritt",
  "hardware.progressSummary":
    "{completed}/{total} ausgefüllt · {passed} bestanden{saving}",
  "hardware.progressSaving": " · wird gespeichert…",
  "hardware.progressLoading": "Laden…",
  "hardware.snapshotBle": "BLE",
  "hardware.snapshotStatus": "Zustand",
  "hardware.snapshotFirmware": "Firmware",
  "hardware.unsavedMessage":
    "Die Daten sind sichtbar, aber noch nicht gespeichert: {error}",
  "hardware.retrySaveLabel": "Versuche erneut, den Test zu speichern",
  "hardware.shareReportLabel": "Bereinigten Hardware-Testbericht teilen",
  "hardware.shareReport": "Bericht teilen",
  "hardware.newRunLabel": "Neuen Hardware-Test erstellen",
  "hardware.newRun": "Neu",
  "hardware.matrixTitle": "Testmatrix",
  "hardware.matrixDescription":
    "Trage jedes Ergebnis auf dem Gerät ein, das du testest. Die Notizen werden in den Bericht aufgenommen.",
  "hardware.connection.idle": "Inaktiv",
  "hardware.connection.scanning": "Suche läuft",
  "hardware.connection.connecting": "Verbindung wird hergestellt",
  "hardware.connection.connected": "Verbunden",
  "hardware.connection.unsupported": "Nicht unterstützt",
  "hardware.connection.error": "Fehler",
  "hardware.test.scanConnect.title": "Scannen und verbinden",
  "hardware.test.scanConnect.instruction":
    "Starte die Suche, während der Handgriff in der Nähe ist und nicht mit anderen Apps verbunden ist.",
  "hardware.test.scanConnect.success":
    "Der Handgriff erscheint als Sonicare4Kids und der Status wird zu Verbunden.",
  "hardware.test.metadata.title": "Metadaten und Batterie",
  "hardware.test.metadata.instruction":
    "Überprüfe Modell, Firmware und Akku und warte dann auf mindestens ein Update.",
  "hardware.test.metadata.success":
    "Die Felder bleiben nach der Akkuaktualisierung vorhanden und stimmig.",
  "hardware.test.liveTimer.title": "Live-Timer und Mundbereiche",
  "hardware.test.liveTimer.instruction":
    "Führe eine Zwei-Minuten-Sitzung durch und beobachte Timer und Bereichswechsel.",
  "hardware.test.liveTimer.success":
    "Start, Stopp, Sekunden und die vier Bereiche folgen dem Handgriff ohne Sprünge.",
  "hardware.test.sessionSync.title": "Sitzungssynchronisierung",
  "hardware.test.sessionSync.instruction":
    "Stoppe den Handgriff und warte auf die automatische Synchronisierung.",
  "hardware.test.sessionSync.success":
    "Im Verlauf erscheint genau eine neue Sitzung mit der richtigen Dauer.",
  "hardware.test.rapidStops.title": "Zwei schnelle Stopps",
  "hardware.test.rapidStops.instruction":
    "Schließe zwei Sitzungen ab, ohne das Ende der ersten Synchronisierung abzuwarten.",
  "hardware.test.rapidStops.success":
    "Beide werden gespeichert und nur einmal gutgeschrieben.",
  "hardware.test.offlineGap.title": "Offline-Sitzungen, Uhrzeit und ID-Sprung",
  "hardware.test.offlineGap.instruction":
    "Schließe zwei Sitzungen bei geschlossener App ab, verbinde sie wieder und schließe dann eine Sitzung bei geöffneter App ab.",
  "hardware.test.offlineGap.success":
    "Die Offline-Sitzungen treffen geordnet ein, mit rekonstruierter oder als ungefähr gekennzeichneter Uhrzeit; der Live-Fallback wird nicht erneut gutgeschrieben.",
  "hardware.test.deduplication.title": "Manuelle Deduplizierung",
  "hardware.test.deduplication.instruction":
    "Tippe nach derselben Sitzung zweimal auf Letzte Sitzung synchronisieren.",
  "hardware.test.deduplication.success":
    "Verlauf, XP, Münzen und Belohnungsprotokoll ändern sich beim zweiten Versuch nicht.",
  "hardware.test.demoCancel.title": "Demo während des Scans",
  "hardware.test.demoCancel.instruction":
    "Starte die Suche und aktiviere sofort den Demo-Modus.",
  "hardware.test.demoCancel.success":
    "Die Suche wird abgebrochen und kein echter Handgriff bleibt verbunden.",
  "hardware.test.reconnect.title": "Drei Wiederverbindungen",
  "hardware.test.reconnect.instruction":
    "Trenne die Verbindung dreimal und stelle sie wieder her; starte den Handgriff jedes Mal kurz.",
  "hardware.test.reconnect.success":
    "Es erscheinen keine doppelten Callbacks oder Timer, und die App stürzt nicht ab.",
  "hardware.test.factoryReset.title":
    "Handgriff auf Werkseinstellungen zurücksetzen",
  "hardware.test.factoryReset.instruction":
    "Setze den Handgriff nach einem Backup zurück, verbinde ihn erneut und verwende vor der ersten neuen Sitzung Zurückgesetzten Handgriff entfernen.",
  "hardware.test.factoryReset.success":
    "Die neue Sitzung wird einmal erfasst; vorhandener Verlauf, XP, Münzen und Brushling bleiben unverändert.",
  "hardware.test.background.title": "App im Hintergrund",
  "hardware.test.background.instruction":
    "Starte eine Sitzung, schicke die App in den Hintergrund und kehre dann zurück.",
  "hardware.test.background.success":
    "Der Status ist wieder stimmig und es wird keine Geistersitzung erstellt.",
  "hardware.test.restart.title": "App neu starten",
  "hardware.test.restart.instruction":
    "Schließe die App nach einer synchronisierten Sitzung vollständig und öffne sie erneut.",
  "hardware.test.restart.success":
    "Verlauf, Fortschritt und letztes Gerät bleiben konsistent.",
  "hardware.test.backupRestore.title": "Sichern und Wiederherstellen",
  "hardware.test.backupRestore.instruction":
    "Exportiere die .brushlings-Datei und stelle sie auf einem zweiten Gerät oder in einer sauberen Installation wieder her.",
  "hardware.test.backupRestore.success":
    "Vollständiger Verlauf, Fortschritt und Protokoll stimmen nach der Wiederherstellung überein.",
  "hardware.report.title": "Hardware-Testbericht – Sparkly Brush",
  "hardware.report.intro":
    "Der Bericht enthält nicht die dauerhafte Bluetooth-ID des Handgriffs. UUIDs oder MAC-Adressen in den Protokollen werden automatisch geschwärzt.",
  "hardware.report.environment": "Umgebung",
  "hardware.report.technicalSnapshot": "Technische Momentaufnahme",
  "hardware.report.matrix": "Matrixergebnis",
  "hardware.report.diagnostics": "Bereinigte BLE-Diagnose",
  "hardware.report.field": "Feld",
  "hardware.report.value": "Wert",
  "hardware.report.run": "Durchlauf",
  "hardware.report.platform": "Plattform",
  "hardware.report.osVersion": "OS-Version",
  "hardware.report.appVersion": "App-Version",
  "hardware.report.started": "Begonnen",
  "hardware.report.generated": "Generiert",
  "hardware.report.connectionStatus": "Verbindungsstatus",
  "hardware.report.adapter": "BLE-Adapter",
  "hardware.report.name": "Name",
  "hardware.report.model": "Modell",
  "hardware.report.firmware": "Firmware",
  "hardware.report.battery": "Akku",
  "hardware.report.handleState": "Zustand des Griffs",
  "hardware.report.brushingActive": "Aktives Zähneputzen",
  "hardware.report.liveTime": "Live-Zeit",
  "hardware.report.intensity": "Intensität",
  "hardware.report.recentSessions": "Letzte Sitzungen in UI",
  "hardware.report.attemptedSessions": "Versuchte Sitzungen insgesamt",
  "hardware.report.completedSessions": "Vollständige Sitzungen insgesamt",
  "hardware.report.test": "Prüfung",
  "hardware.report.result": "Ergebnis",
  "hardware.report.note": "Notiz",
  "hardware.report.summary":
    "{completed}/{total} Prüfungen abgeschlossen · {passed} bestanden · {failed} fehlgeschlagen · {blocked} blockiert",
  "hardware.report.noLogs": "Keine Protokolle verfügbar",
  "hardware.report.log.info": "INFO",
  "hardware.report.log.success": "ERFOLG",
  "hardware.report.log.warning": "WARNUNG",
  "hardware.report.log.error": "FEHLER",
  "hardware.report.unavailable": "nicht verfügbar",
  "hardware.report.yes": "Ja",
  "hardware.report.no": "Nein",
  "hardware.report.status.passed": "BESTANDEN",
  "hardware.report.status.failed": "FEHLGESCHLAGEN",
  "hardware.report.status.blocked": "GESPERRT",
  "hardware.report.status.pending": "AUSZUFÜHREN",
  "hardware.report.redactedDevice": "device id: [redacted]",
  "hardware.report.deviceId": "[device-id]",
  "hardware.report.emptyCell": "—",
  "hardware.report.downloadUnavailable":
    "Das Herunterladen von Berichten ist in dieser Umgebung nicht verfügbar",
  "hardware.report.shareUnavailable":
    "Die Dateifreigabe ist auf diesem Gerät nicht verfügbar",
  "hardware.report.shareDialogTitle":
    "Sparkly Brush-Hardware-Testbericht teilen",
  "brush.status.ready": "Bereit, nach der Zahnbürste zu suchen",
  "brush.status.pairedReady": "Handgriff gekoppelt: Tippe auf „Suchen und verbinden“",
  "brush.error.identityUnavailable": "Zahnbürstenidentität nicht verfügbar",
  "brush.log.liveFallback":
    "Sitzung aus Live-Daten gespeichert, weil kein Datensatz vom Handgriff verfügbar war",
  "brush.error.bleRecordUnavailable": "BLE-Datensatz nicht verfügbar",
  "brush.error.bleSessionNotSaved": "BLE-Sitzung nicht gespeichert",
  "brush.error.bleSessionNoIdentity": "BLE-Sitzung ohne Geräteidentität",
  "brush.log.manualSessionSaved": "{type} gespeichert ({duration}s)",
  "brush.log.demoSessionSaved": "Demo-Sitzung gespeichert ({duration}s)",
  "brush.log.realSessionSaved": "Manuelle Sitzung gespeichert ({duration}s)",
  "brush.session.demo": "Demo-Sitzung",
  "brush.session.manual": "Manuelle Sitzung",
  "brush.error.guidedSessionNotSaved": "Geführte Sitzung nicht gespeichert",
  "brush.error.pendingManualSession":
    "Eine vorherige Sitzung muss noch gespeichert werden",
  "brush.log.waitForForget":
    "Warte, bis der Handgriff vollständig entfernt wurde",
  "brush.log.disableDemoToConnect":
    "Schalte den Demo-Modus aus, um die echte Zahnbürste zu verbinden",
  "brush.error.forgettingInProgress":
    "Der Ausbau des Griffs ist bereits im Gange",
  "brush.error.connectHandleToReset":
    "Verbinde den Handgriff, der zurückgesetzt werden soll",
  "brush.log.handleForgotten":
    "Handgriff entfernt: Der nächste BLE-Zähler beginnt mit einer neuen Generation",
  "brush.error.handleRemovalFailed":
    "Das Entfernen des Griffs ist fehlgeschlagen",
  "brush.error.noCounterToReset": "Für diesen Handgriff gibt es noch keinen Bluetooth-Zähler zum Zurücksetzen.",
  "brush.log.syncDisabledInDemo":
    "Die BLE-Synchronisierung ist im Demomodus deaktiviert",
  "brush.error.connectFirst": "Verbinde zuerst deine Zahnbürste",
  "brush.log.sessionsSynced": "{count} {count|synchronisierte Sitzung|synchronisierte Sitzungen}",
  "brush.log.manualSuperseded": "{count} {count|Aufzeichnung des Handgriffs stimmt mit einer bereits gespeicherten Sitzung des geführten Timers überein und wurde nicht erneut gezählt|Aufzeichnungen des Handgriffs stimmen mit bereits gespeicherten Sitzungen des geführten Timers überein und wurden nicht erneut gezählt}",
  "brush.log.noNewSessions": "Keine neuen Sitzungen verfügbar",
  "brush.error.syncFailed": "Die Synchronisierung ist fehlgeschlagen",
  "brush.log.retryPreviousSave":
    "Versuche zuerst erneut, die vorherige Sitzung zu speichern",
  "brush.log.demoTimerStarted": "Demo-Timer gestartet",
  "brush.log.guidedTimerStarted": "Geführter Timer gestartet",
  "brush.log.manualReplacedByHandle": "Die Zahnbürste wurde gestartet: Der manuelle Timer wurde ohne doppelte Gutschrift abgebrochen.",
  "brush.log.liveSessionInProgress": "Eine Sitzung läuft bereits: Verwende die Zahnbürste oder beende den aktiven Timer.",
  "brush.log.demoModeEnabled": "Demomodus aktiviert",
  "brush.log.demoModeDisabled": "Demomodus deaktiviert",
  "brush.log.demoSessionAdded": "{period} Demositzung hinzugefügt",
  "brush.log.demoSessionMorningAdded": "Morgendliche Demositzung hinzugefügt",
  "brush.log.demoSessionEveningAdded": "Abendliche Demositzung hinzugefügt",
  "brush.log.demoSessionNowAdded": "Vollständige Demositzung hinzugefügt",
  "brush.period.morning": "Morgen",
  "brush.period.evening": "Abend",
  "brush.period.now": "vollständig",
  "brush.log.demoWeekGenerated": "Vollständige Demowoche generiert",
  "brush.log.demoDataDeleted": "Demodaten gelöscht",
  "brush.log.historyRestored":
    "Der Verlauf wurde aus der Sicherung wiederhergestellt",
  "brush.log.archiveRestored": "Komplettes Archiv aus Backup wiederhergestellt",
  "brush.log.demoHistoryDeleted": "Demoverlauf gelöscht",
  "brush.log.localHistoryDeleted": "Lokaler Verlauf gelöscht",
  "game.collection.eyebrow": "Brushlings",
  "game.collection.title": "Dein Team",
  "game.collection.level": "Lv {level}",
  "game.collection.totalXp": "{xp} XP insgesamt",
  "game.collection.availableCoins": "Münzen verfügbar",
  "game.collection.currentStreak": "aktuelle Serie",
  "game.collection.habitatEyebrow": "DIE HÖHLE",
  "game.collection.habitatTitle": "Gestalte das Zuhause",
  "game.collection.habitatSummary":
    "{items} {items|Gegenstand|Gegenstände} · {coins} {coins|Münze|Münzen} zum Ausgeben",
  "game.collection.openHabitat": "Höhle öffnen",
  "game.collection.starterFamilies": "Die drei Starterfamilien",
  "game.collection.starterFamiliesDescription":
    "Bloopi, Spriggo und Flarello ändern auf Level 3 und 6 ihre Form. Die Entwicklungen hängen von deinen echten Putzfortschritten ab.",
  "game.collection.formProgress": "Form {current}/3",
  "game.collection.unlocked": "Entsperrt",
  "game.collection.chooseCompanion": "Begleiter auswählen",
  "game.collection.chooseCompanionDescription":
    "Die ersten drei Kreaturen sind gleich verfügbar. Die anderen werden durch vollständige Zwei-Minuten-Sitzungen freigeschaltet.",
  "game.collection.nextEvolution":
    "Nächste Entwicklung: {name} auf Level {level}.",
  "game.collection.inTeam": "Im Team",
  "game.collection.choose": "Auswählen",
  "game.collection.afterSessions": "Nach {sessions} {sessions|Sitzung|Sitzungen}",
  "game.collection.selectCreature": "{name} auswählen",
  "game.collection.lockedCreature": "{name} bis {sessions} {sessions|Sitzung|Sitzungen} gesperrt",
  "game.collection.tip":
    "Jede vollständige Sitzung bringt 60 XP. Auf Level 3 erreicht dein Starter die zweite Form, auf Level 6 die letzte Form.",
  "game.explore.eyebrow": "Abenteuer",
  "game.explore.title": "Lächelnde Insel",
  "game.explore.heroEyebrow": "JEDES PUTZEN BRINGT DICH WEITER",
  "game.explore.exploresWithYou": "{name} erkundet mit dir",
  "game.explore.chooseCompanionFirst": "Wähle zuerst deinen Begleiter",
  "game.explore.sessionsUntilZone":
    "Noch {sessions} {sessions|vollständige Sitzung|vollständige Sitzungen} bis {zone}.",
  "game.explore.allZonesUnlocked":
    "Du hast alle Bereiche geöffnet, die in dieser ersten Inselversion verfügbar sind!",
  "game.explore.currentZone": "AKTUELLES GEBIET",
  "game.explore.sessionCount": "{count} {count|Sitzung|Sitzungen}",
  "game.explore.openRewards": "Belohnungen und Eier öffnen",
  "game.explore.inventoryEyebrow": "DEIN RUCKSACK",
  "game.explore.inventoryTitle": "Belohnungen und Eier",
  "game.explore.inventorySummary":
    "{eggs} Eier gefunden · {brushlings} neue Brushlings geschlüpft",
  "game.explore.islandMap": "Karte der Insel",
  "game.explore.islandMapDescription":
    "Schließe Zwei-Minuten-Sitzungen ab, um neue Orte zu öffnen und künftige Begegnungen, Eier und Belohnungen vorzubereiten.",
  "game.explore.youAreHere": "DU BIST HIER",
  "game.explore.zoneUnlocked": "Bereich freigeschaltet",
  "game.explore.zoneOpensIn": "Öffnet in {count} {count|Sitzung|Sitzungen}",
  "game.explore.islandEncounters": "Begegnungen auf der Insel",
  "game.explore.islandEncountersDescription":
    "Einige Brushlings stammen aus speziellen Eiern, die bei der Erkundung gefunden wurden.",
  "game.explore.newBrushling": "NEUER BRUSHLING",
  "game.explore.eggFound": "EI GEFUNDEN",
  "game.explore.secretEncounter": "GEHEIME BEGEGNUNG",
  "game.explore.unknown": "???",
  "game.explore.brushlingAvailable":
    "{name} ist jetzt in deinem Team verfügbar.",
  "game.explore.sessionsUntilHatch":
    "Noch {count} {count|Sitzung|Sitzungen} bis zum Schlüpfen.",
  "game.explore.continueUntilEgg":
    "Setze dein Abenteuer bis zur Sitzung {session} fort, um dieses Ei zu finden.",
  "game.explore.nextStepTitle": "Weiter erkunden",
  "game.explore.nextStepDescription":
    "Putzsitzungen schalten Eier, Gegenstände und seltene Brushlings auf der Karte frei.",
  "game.missions.backLabel": "Zurück",
  "game.missions.eyebrow": "Tägliches Abenteuer",
  "game.missions.title": "Missionen",
  "game.missions.today": "HEUTE",
  "game.missions.completeCount": "{completed}/3 Missionen abgeschlossen",
  "game.missions.heroDescription":
    "Schließe morgens und abends eine Sitzung ab, um die Truhe des Lächelns zu öffnen.",
  "game.missions.completed": "Abgeschlossen!",
  "game.missions.smileChest": "TRUHE DES LÄCHELNS",
  "game.missions.chestOpen": "Truhe geöffnet!",
  "game.missions.completeAll": "Alle Missionen abschließen",
  "game.missions.chestBonus": "Tagesbonus: +{coins} Lächeln-Münzen.",
  "game.missions.achievements": "Ziele",
  "game.missions.achievementsDescription":
    "Permanente Abzeichen, die Beständigkeit und Routine belohnen.",
  "game.missions.badgeUnlocked": "Abzeichen freigeschaltet",
  "game.missions.openHabitat": "Höhle öffnen",
  "game.missions.walletTitle": "{coins} {coins|Münze|Münzen} verfügbar",
  "game.missions.walletDescription":
    "Missionsboni und Ziele: bisher +{coins} verdient.",
  "game.rewards.backLabel": "Zur Karte zurück",
  "game.rewards.eyebrow": "Sammlung",
  "game.rewards.title": "Deine Belohnungen",
  "game.rewards.completedAdventures": "{count} Abenteuer abgeschlossen",
  "game.rewards.heroDescription":
    "Jede vollständige Sitzung hinterlässt eine Erinnerung an den erkundeten Bereich. Eier brauchen weitere Sitzungen, um zu schlüpfen.",
  "game.rewards.foundItems": "Gefundene Gegenstände",
  "game.rewards.foundItemsDescription":
    "Deine kleine Sammlung wächst mit deinen guten Gewohnheiten.",
  "game.rewards.unknownItem": "???",
  "game.rewards.continueToDiscoverItem":
    "Erkunde weiter, um diesen Gegenstand zu entdecken.",
  "game.rewards.mysteryEggs": "Geheimnisvolle Eier",
  "game.rewards.mysteryEggsDescription":
    "Wenn ein Ei schlüpft, kommt der neue Brushling in deine Sammlung.",
  "game.rewards.hatched": "AUSGEBRÜTET",
  "game.rewards.incubating": "WIRD AUSGEBRÜTET",
  "game.rewards.notFound": "NOCH NICHT GEFUNDEN",
  "game.rewards.mysteryEgg": "Geheimnisvolles Ei",
  "game.rewards.brushlingJoined": "{name} ist deinem Team beigetreten!",
  "game.rewards.eggFoundAfter":
    "Kann nach {count} {count|vollständigen Sitzung|vollständigen Sitzungen} gefunden werden.",
  "game.rewards.sessionsUntilHatch":
    "Noch {count} {count|Sitzung|Sitzungen} bis zum Schlüpfen",
  "game.rewards.goToHabitat": "Zur Höhle",
  "game.rewards.goToHabitatLabel": "Zur Höhle",
  "game.rewards.habitatCoins":
    "Du hast {coins} {coins|Lächeln-Münze|Lächeln-Münzen} für Lebensräume, Zubehör und Dekorationen.",
  "game.habitat.backLabel": "Zurück",
  "game.habitat.eyebrow": "BRUSHLING-ZUHAUSE",
  "game.habitat.title": "Die Höhle",
  "game.habitat.wallet": "GELDBEUTEL",
  "game.habitat.walletValue": "{coins} {coins|Lächeln-Münze|Lächeln-Münzen}",
  "game.habitat.walletDescription":
    "Du verdienst sie beim Putzen; was du kaufst, bleibt auf diesem Telefon gespeichert.",
  "game.habitat.customizeSpace":
    "Gestalte den Platz deines Brushlings mit einem Lebensraum, einem Accessoire und einer Dekoration.",
  "game.habitat.equipped": "{name} ausgestattet!",
  "game.habitat.equipFailed":
    "Dieser Gegenstand kann nicht ausgerüstet werden.",
  "game.habitat.needMoreCoins": "Du brauchst noch {coins} {coins|Lächeln-Münze|Lächeln-Münzen}.",
  "game.habitat.purchased": "{name} gekauft und ausgestattet!",
  "game.habitat.category.habitat": "Lebensraum",
  "game.habitat.category.accessory": "Accessoires",
  "game.habitat.category.decor": "Dekorationen",
  "game.habitat.categoryDescription.habitat":
    "Ändere die Umgebung, in der dein Brushling lebt.",
  "game.habitat.categoryDescription.accessory":
    "Gib deinem Begleiter ein besonderes Detail.",
  "game.habitat.categoryDescription.decor":
    "Mach die Höhle persönlicher und gemütlicher.",
  "game.habitat.included": "Inklusive",
  "game.habitat.equippedButton": "Ausgestattet",
  "game.habitat.equip": "Ausrüsten",
  "game.habitat.use": "Benutzen",
  "game.habitat.buy": "Kaufen",
  "game.habitat.needCoins": "Münzen werden benötigt",
  "game.habitat.customizationAction": "{action}: {name}",
  "game.habitat.currentConfiguration": "Aktuelle Konfiguration",
  "game.habitat.defaultHome": "Deine Höhle",
  "game.habitat.sceneLabel": "Lebensraum von {name}: {habitat}",
  "game.brushling.bloopi.element": "Wasser",
  "game.brushling.bloopi.tagline":
    "Verwandelt jeden Bereich in einen Wasserfall aus sauberen Blasen.",
  "game.brushling.bloopi.evolution.1.title": "Neugieriger Tropfen",
  "game.brushling.bloopi.evolution.3.title": "Hüter der Blasen",
  "game.brushling.bloopi.evolution.6.title": "Meister der Gezeiten",
  "game.brushling.spriggo.element": "Natur",
  "game.brushling.spriggo.tagline": "Wächst mit deinen guten Gewohnheiten.",
  "game.brushling.spriggo.evolution.1.title": "Fröhlicher Spross",
  "game.brushling.spriggo.evolution.3.title": "Hüter des Gartens",
  "game.brushling.spriggo.evolution.6.title": "Geist des Waldes",
  "game.brushling.flarello.element": "Feuer",
  "game.brushling.flarello.tagline":
    "Bringt Energie, wenn nur noch wenige Sekunden fehlen.",
  "game.brushling.flarello.evolution.1.title": "Mutiger Funke",
  "game.brushling.flarello.evolution.3.title": "Glut-Champion",
  "game.brushling.flarello.evolution.6.title": "Herz der Sonne",
  "game.brushling.voltuff.element": "Energie",
  "game.brushling.voltuff.tagline":
    "Lädt sich mit vollständigen Sitzungen und guten Serien auf.",
  "game.brushling.voltuff.evolution.1.title": "Elektrischer Flauschball",
  "game.brushling.moonbit.element": "Nacht",
  "game.brushling.moonbit.tagline":
    "Der Begleiter beim Zähneputzen vor dem Schlafengehen.",
  "game.brushling.moonbit.evolution.1.title": "Mondträumer",
  "game.adventure.bubble-bay.name": "Blasenbucht",
  "game.adventure.bubble-bay.subtitle":
    "Der erste Anlegeplatz, voller glitzerndem Schaum.",
  "game.adventure.fresh-forest.name": "Frischer Wald",
  "game.adventure.fresh-forest.subtitle": "Duftende Blätter und grüne Wege.",
  "game.adventure.spark-mountain.name": "Leuchtender Berg",
  "game.adventure.spark-mountain.subtitle":
    "Ein strahlender Gipfel, der Ausdauer belohnt.",
  "game.adventure.crystal-lake.name": "Kristallsee",
  "game.adventure.crystal-lake.subtitle":
    "Klares Wasser, Edelsteine und neue Begegnungen.",
  "game.adventure.smile-valley.name": "Tal des Lächelns",
  "game.adventure.smile-valley.subtitle":
    "Das geheime Tal der seltensten Brushlings.",
  "game.customization.bubble-room.name": "Blasenraum",
  "game.customization.bubble-room.description":
    "Das erste kleine Zuhause, hell und voller Bläschen.",
  "game.customization.fresh-garden.name": "Frischer Garten",
  "game.customization.fresh-garden.description":
    "Eine grüne Ecke mit Blättern, Gras und Minzduft.",
  "game.customization.sunset-camp.name": "Sonnenuntergangslager",
  "game.customization.sunset-camp.description":
    "Ein warmer Zufluchtsort zum Ausruhen nach einem großen Abenteuer.",
  "game.customization.moon-cove.name": "Mondbucht",
  "game.customization.moon-cove.description":
    "Ein ruhiger Lebensraum, der unter den Sternen leuchtet.",
  "game.customization.blue-scarf.name": "Spritz-Schal",
  "game.customization.blue-scarf.description": "Ein kleiner Entdeckerschal.",
  "game.customization.leaf-crown.name": "Krone aus Blättern",
  "game.customization.leaf-crown.description":
    "Für Brushlings, die es lieben, sich wie Könige des Waldes zu fühlen.",
  "game.customization.star-glasses.name": "Sternenbrille",
  "game.customization.star-glasses.description":
    "Sie leuchten, wenn eine Mission abgeschlossen ist.",
  "game.customization.smile-cushion.name": "Lächeln-Kissen",
  "game.customization.smile-cushion.description":
    "Ein weiches Kissen für die Höhle.",
  "game.customization.mint-plant.name": "Minzpflanze",
  "game.customization.mint-plant.description":
    "Eine immer frische Pflanze in der Nähe des Beetes.",
  "game.customization.star-mobile.name": "Sternen-Mobile",
  "game.customization.star-mobile.description":
    "Kleine schwebende Sterne für die gute Nacht.",
  "game.inventory.bubble-pearl.name": "Blasenperle",
  "game.inventory.bubble-pearl.description":
    "Eine leichte Perle aus der Blasenbucht.",
  "game.inventory.fresh-leaf.name": "Frisches Blatt",
  "game.inventory.fresh-leaf.description":
    "Duftet nach Minze und kommt aus dem Frischen Wald.",
  "game.inventory.spark-crystal.name": "Lächeln-Kristall",
  "game.inventory.spark-crystal.description":
    "Ein erstarrter Funke vom Leuchtenden Berg.",
  "game.inventory.moon-shard.name": "Mondsplitter",
  "game.inventory.moon-shard.description":
    "Leuchtet im Dunkeln nahe dem Kristallsee.",
  "game.inventory.smile-star.name": "Lächeln-Stern",
  "game.inventory.smile-star.description":
    "Eine seltene Belohnung aus dem Tal des Lächelns.",
  "game.egg.spark-egg.name": "Funken-Ei",
  "game.egg.spark-egg.description":
    "Im Inneren der Hülle pulsiert eine kleine Entladung.",
  "game.egg.moon-egg.name": "Mondei",
  "game.egg.moon-egg.description": "Die Schale glitzert, wenn der Abend kommt.",
  "game.mission.morning.title": "Guten Morgen, lächle!",
  "game.mission.morning.description": "Schließe morgens eine Sitzung ab.",
  "game.mission.evening.title": "Gute Nacht, Mission",
  "game.mission.evening.description": "Schließe ab 18 Uhr eine Sitzung ab.",
  "game.mission.double.title": "Doppeltes Lächeln",
  "game.mission.double.description":
    "Schließe zwei Sitzungen am selben Tag ab.",
  "game.achievement.first-smile.title": "Erstes Lächeln",
  "game.achievement.first-smile.description":
    "Schließe deine erste Sitzung ab.",
  "game.achievement.five-adventures.title": "Kleiner Entdecker",
  "game.achievement.five-adventures.description": "Schließe 5 Sitzungen ab.",
  "game.achievement.ten-adventures.title": "Brushlings-Champion",
  "game.achievement.ten-adventures.description": "Schließe 10 Sitzungen ab.",
  "game.achievement.three-perfect-days.title": "Drei perfekte Tage",
  "game.achievement.three-perfect-days.description":
    "Schließe morgens und abends drei Tage lang Sitzungen ab.",
  "game.achievement.seven-day-streak.title": "Feuerwoche",
  "game.achievement.seven-day-streak.description":
    "Erreiche eine Rekordserie von 7 aufeinanderfolgenden Tagen.",
  "game.dialogue.bloopi.idle.0":
    "Ich glaube, wir finden heute etwas Glitzerndes.",
  "game.dialogue.bloopi.idle.1":
    "Die besten Blasen kommen nach einer guten Putzrunde.",
  "game.dialogue.bloopi.morning.0":
    "Splash! Lass uns dein Lächeln vor dem Abenteuer strahlen lassen.",
  "game.dialogue.bloopi.morning.1":
    "Guten Morgen! Ich habe die Blasen bereits vorbereitet.",
  "game.dialogue.bloopi.evening.0":
    "Eine Putzrunde, dann träumen wir vom Meer.",
  "game.dialogue.bloopi.evening.1":
    "Lasst uns alles reinigen, bevor der Mond kommt.",
  "game.dialogue.bloopi.brushing.0": "Weiter so! Ein Bereich nach dem anderen.",
  "game.dialogue.bloopi.brushing.1":
    "Platsch, Platsch, das machst du großartig!",
  "game.dialogue.bloopi.reward.0":
    "Ich wusste es! Da war eine Belohnung versteckt.",
  "game.dialogue.bloopi.reward.1":
    "Jedes saubere Lächeln lässt unsere Insel wachsen.",
  "game.dialogue.spriggo.idle.0":
    "Aus jeder kleinen Angewohnheit entsteht etwas Großes.",
  "game.dialogue.spriggo.idle.1":
    "Heute können wir einen neuen Spross sprießen lassen.",
  "game.dialogue.spriggo.morning.0":
    "Guten Morgen! Lass uns dein Lächeln wachsen lassen.",
  "game.dialogue.spriggo.morning.1": "Blätter hoch, Zahnbürste fertig!",
  "game.dialogue.spriggo.evening.0":
    "Bei sauberen Zähnen ruhen die Wurzeln besser.",
  "game.dialogue.spriggo.evening.1":
    "Letzte Mission und dann im Garten schlafen.",
  "game.dialogue.spriggo.brushing.0": "Gleichmäßig und sanft, genau so.",
  "game.dialogue.spriggo.brushing.1": "Du kultivierst ein super Lächeln!",
  "game.dialogue.spriggo.reward.0":
    "Was für ein Wachstum! Ich bin stolz auf uns.",
  "game.dialogue.spriggo.reward.1":
    "Noch ein Schritt und der Garten wird größer.",
  "game.dialogue.flarello.idle.0": "Sollen wir eine neue Mission starten?",
  "game.dialogue.flarello.idle.1":
    "Ich habe jede Menge Energie. Hast du deine Zahnbürste?",
  "game.dialogue.flarello.morning.0": "Morgenfunken! Los geht’s!",
  "game.dialogue.flarello.morning.1":
    "Ein strahlendes Lächeln, bevor du losgehst.",
  "game.dialogue.flarello.evening.0": "Letzter Brand des Tages!",
  "game.dialogue.flarello.evening.1":
    "Lasst uns alles erstrahlen lassen und uns dann ausruhen.",
  "game.dialogue.flarello.brushing.0": "Los! Nur noch ein paar Funken fehlen.",
  "game.dialogue.flarello.brushing.1": "Konstante Flamme, kraftvolles Lächeln!",
  "game.dialogue.flarello.reward.0": "Boom! Belohnung erhalten.",
  "game.dialogue.flarello.reward.1": "Was für ein Feuer! Wir haben gerockt.",
  "game.dialogue.voltuff.idle.0":
    "Bzzzt! Ich habe eine Mission in der Nähe aufgegriffen.",
  "game.dialogue.voltuff.idle.1": "Batterien geladen. Bereit zum Lächeln?",
  "game.dialogue.voltuff.morning.0": "Morgenladung bis zum Maximum!",
  "game.dialogue.voltuff.morning.1": "Zap! Zwei Minuten und es geht los.",
  "game.dialogue.voltuff.evening.0": "Letztes Aufladen vor der Nacht.",
  "game.dialogue.voltuff.evening.1":
    "Lasst uns die letzten Krümel aus unseren Zähnen entfernen.",
  "game.dialogue.voltuff.brushing.0": "Bzzzt! Perfektes Tempo.",
  "game.dialogue.voltuff.brushing.1": "Stabile Energie: Weiter so!",
  "game.dialogue.voltuff.reward.0": "ZAP! Belohnung freigeschaltet.",
  "game.dialogue.voltuff.reward.1": "Sehr starkes Signal: Mission erfolgreich!",
  "game.dialogue.moonbit.idle.0": "Auch ruhige Abenteuer lassen dich wachsen.",
  "game.dialogue.moonbit.idle.1":
    "Der Mond sagt, dass wir heute einen kleinen Schritt machen können.",
  "game.dialogue.moonbit.morning.0":
    "Ein sanfter guten Morgen und ein sauberes Lächeln.",
  "game.dialogue.moonbit.morning.1":
    "Nach und nach starten wir gut in den Tag.",
  "game.dialogue.moonbit.evening.0":
    "Der Mond ist bereit. Machen wir die letzte Mission.",
  "game.dialogue.moonbit.evening.1":
    "Saubere Zähne, leichte Gedanken, gute Nacht.",
  "game.dialogue.moonbit.brushing.0":
    "Atme tief durch und mach weiter, du machst das großartig.",
  "game.dialogue.moonbit.brushing.1":
    "Ruhe und Ausdauer: Es fehlt nicht mehr viel.",
  "game.dialogue.moonbit.reward.0": "Ein wenig neues Licht in der Nacht.",
  "game.dialogue.moonbit.reward.1":
    "Wie schön: Wir haben eine weitere Erinnerung gewonnen.",
  "game.reward.doubleEyebrow": "DOPPELTE ÜBERRASCHUNG!",
  "game.reward.evolutionEyebrow": "ENTWICKLUNG!",
  "game.reward.hatchEyebrow": "DAS EI IST GESCHLÜPFT!",
  "game.reward.completedEyebrow": "SITZUNG ABGESCHLOSSEN",
  "game.reward.attemptEyebrow": "SCHÖNER VERSUCH",
  "game.reward.doubleTitle":
    "Aus {from} ist {to} geworden und {hatched} ist dem Team beigetreten!",
  "game.reward.evolutionTitle": "{from} hat sich zu {to} entwickelt!",
  "game.reward.hatchTitle": "Du hast {name} kennengelernt!",
  "game.reward.completedTitle": "Fantastische Arbeit!",
  "game.reward.attemptTitle": "Jede Sekunde zählt!",
  "game.reward.found": "DU HAST GEFUNDEN",
  "game.reward.eggFound": "+ {name}: Putze weiter, damit es schlüpft!",
  "game.reward.eggHatched":
    "{name} ist geschlüpft: ein neuer Brushling für dein Team.",
  "game.reward.adventureBonus": "ABENTEUERBONUS +{coins}",
  "game.reward.chestOpened": "Truhe des Lächelns geöffnet!",
  "game.reward.newBadge": "Neues Abzeichen freigeschaltet!",
  "game.reward.missionCompleted": "Mission abgeschlossen!",
  "game.reward.newLevel": "Neues Level: {level}",
  "game.reward.doubleMessage":
    "{evolved} ist stärker und {hatched} wartet im Bereich Kreaturen auf dich.",
  "game.reward.hatchMessage":
    "{name} ist jetzt im Bereich Kreaturen verfügbar. Setze dein Abenteuer fort, um weitere Belohnungen zu entdecken.",
  "game.reward.completedMessage":
    "Du hast deinem Lächeln zwei Minuten Superkraft geschenkt. Dein Brushling ist stärker geworden!",
  "game.reward.attemptMessage":
    "Versuche beim nächsten Mal bis zum Ende zu putzen: Dein Brushling wartet auf dich.",
  "game.reward.dismissLabel": "Belohnung schließen und fortfahren",
  "game.reward.discoverSurprises": "Überraschungen entdecken",
  "game.reward.meetFriend": "Neuen Freund kennenlernen",
  "game.reward.continueAdventure": "Abenteuer fortsetzen",
  "game.reward.fantastic": "Fantastisch!",
  "family.history.clearTitle": "Verlauf löschen?",
  "family.history.clearMessage":
    "Auf diesem Telefon gespeicherte Sitzungen werden entfernt: Level, XP, Münzen, Missionen und freigeschaltete Kreaturen beginnen wieder bei null. Bereits gekaufte Gegenstände bleiben erhalten. Bereits vom Handgriff gelesene Sitzungen kommen nicht zurück.",
  "family.history.clearAction": "Löschen",
  "family.history.clearButtonLabel": "Verlauf leeren",
  "family.history.sessionComplete": "Vollständige Sitzung",
  "family.history.sessionIncomplete": "Unvollständige Sitzung",
  "family.history.sessionAccessibility": "{status}, {duration}, {date}",
  "family.history.duration": "{minutes}:{seconds}",
  "family.history.deviceSource": "Von der Zahnbürste synchronisiert",
  "family.history.manualSource": "Geführter Timer",
  "family.history.demoSource": "Demo-Sitzung",
  "family.history.durationOf": "auf {duration}",
  "family.history.progressEyebrow": "Dein Fortschritt",
  "family.history.title": "Verlauf",
  "family.history.parentCardLabel": "Elternbereich öffnen",
  "family.history.parentArea": "ELTERNBEREICH",
  "family.history.parentSummary": "Wöchentliche Zusammenfassung",
  "family.history.parentDescription":
    "Morgen/Abend, Dauer, Versuche und synchronisierte Sitzungen.",
  "family.history.average": "Durchschnitt",
  "family.history.lastSessions": "Letzte Sitzungen",
  "family.history.emptyTitle": "Die Reise beginnt hier",
  "family.history.emptyDescription":
    "Schließe eine geführte Sitzung ab oder synchronisiere die Zahnbürste, um deine Fortschritte zu sehen.",
  "family.history.minutes": "{minutes} min",
  "family.parent.localOnly": "Nur auf diesem Telefon",
  "family.parent.title": "Elternbereich",
  "family.parent.privacy":
    "Diese Übersicht verwendet nur den lokalen Verlauf der App. Sie sendet keine Daten an ein Konto oder einen Server.",
  "family.parent.routine": "Morgen-/Abendroutine",
  "family.parent.completedSessions": "vollständige Sitzungen",
  "family.parent.recordedTime": "aufgezeichnete Zeit",
  "family.parent.completeDays": "vollständige Tage",
  "family.parent.recentDays": "Letzte 7 Tage",
  "family.parent.routineDescription":
    "Ein Häkchen zeigt eine vollständige Sitzung im Zeitraum morgens oder abends.",
  "family.parent.day": "Tag",
  "family.parent.morning": "Morgen",
  "family.parent.evening": "Abend",
  "family.parent.total": "Gesamt",
  "family.parent.completedAttempts": "abgeschlossene Versuche",
  "family.parent.averageCompletedDuration":
    "durchschnittliche Dauer vollständiger Sitzungen",
  "family.parent.fromToothbrush": "von der Zahnbürste",
  "family.parent.manualTimer": "manueller Timer",
  "family.parent.approximateSessions":
    "{count} gespeicherte {count|BLE-Sitzung|BLE-Sitzungen} mit ungefährer Uhrzeit {count|wird|werden} nicht für Wochenübersicht, Kalender, Serien und tägliche Missionen gezählt, {count|zählt|zählen} aber für XP und Münzen.",
  "family.parent.gameProgress": "Spielfortschritt",
  "family.parent.gameProgressDescription":
    "Level {level} · {sessions} {sessions|vollständige Sitzung|vollständige Sitzungen} · {badges} Abzeichen freigeschaltet.",
  "family.parent.rewardsTitle": "Familienbelohnungen",
  "family.parent.rewardsDescription":
    "Erstelle echte Belohnungen, die ein Elternteil auswählt. Die App hält nur den Fortschritt fest; das Versprechen bleibt Familiensache.",
  "family.parent.rewardsLifetimeNote":
    "Ziele zählen den gesamten bisherigen Verlauf (bei Serien den bisherigen Rekord). Eine neu angelegte Belohnung kann sofort freigeschaltet sein.",
  "family.parent.newReward": "NEUE BELOHNUNG",
  "family.parent.rewardNameLabel": "Name der Belohnung",
  "family.parent.rewardNamePlaceholder":
    "Zum Beispiel: Film für heute Abend auswählen",
  "family.parent.rewardRequirementLabel": "Voraussetzung für die Belohnung",
  "family.parent.requirementSessions": "Sitzungen",
  "family.parent.requirementPerfectDays": "Perfekte Tage",
  "family.parent.requirementStreak": "Beste Serie",
  "family.parent.target": "Ziel",
  "family.parent.targetAccessibilityLabel": "Ziel der Belohnung",
  "family.parent.addReward": "Belohnung hinzufügen",
  "family.parent.rewardDelivered": "Überreicht",
  "family.parent.rewardDemoUnlocked":
    "Im Demo-Modus freigeschaltet · nicht überreichbar",
  "family.parent.rewardUnlocked": "Freigeschaltet · bereit zum Überreichen",
  "family.parent.rewardInProgress": "Im Gange",
  "family.parent.rewardProgress": "{progress}/{target}",
  "family.parent.deliverReward": "Belohnung {title} überreichen",
  "family.parent.removeReward": "Belohnung {title} entfernen",
  "family.parent.removeRewardTitle": "Belohnung entfernen?",
  "family.parent.removeRewardMessage": "„{title}“ wird aus den Familienbelohnungen entfernt.",
  "family.parent.removeRewardAction": "Entfernen",
  "family.parent.deliverConfirmTitle": "Als übergeben markieren?",
  "family.parent.deliverConfirmMessage": "Hast du „{title}“ wirklich übergeben? Die Belohnung bleibt als übergeben in der Liste.",
  "family.parent.deliverConfirmAction": "Als übergeben markieren",
  "family.parent.rewardLimit": "Höchstzahl von {max} Belohnungen erreicht. Zum Hinzufügen zuerst eine Belohnung entfernen.",
  "family.parent.noRewards": "Noch keine Familienbelohnungen eingerichtet.",
  "family.parent.settingsCardLabel": "Einstellungen öffnen",
  "family.parent.settingsTitle": "Geräusche, Musik und Vibration",
  "family.parent.settingsDescription":
    "Passe das App-Feedback an, ohne Fortschritt oder Verlauf zu ändern.",
  "family.parent.clinicalNote":
    "Die Daten zeigen nur, was die App aufgezeichnet hat, und sind keine zahnärztliche oder klinische Beurteilung.",
  "family.parent.percentage": "{value}%",
  "family.parent.minutes": "{minutes} min",
  "family.parent.duration": "{minutes}:{seconds}",
  "family.rewardRequirement.completedSessions":
    "{target} {target|vollständige Sitzung|vollständige Sitzungen}",
  "family.rewardRequirement.perfectDays": "{target} {target|Tag|Tage} morgens + abends",
  "family.rewardRequirement.streak": "Beste Serie: {target} {target|Tag|Tage} in Folge",
  "family.rewards.contextError":
    "useParentRewards muss innerhalb von ParentRewardsProvider verwendet werden",
  "family.settings.eyebrow": "Komfort und Feedback",
  "family.settings.title": "Einstellungen",
  "family.settings.heroTitle": "Das Spiel muss sich an die Familie anpassen",
  "family.settings.heroDescription":
    "Alle diese Einstellungen bleiben auf diesem Telefon erhalten und können jederzeit geändert werden.",
  "family.settings.soundsTitle": "Töne",
  "family.settings.soundsDescription":
    "Effekte für Belohnungen, Missionen und Interaktionen.",
  "family.settings.musicTitle": "Musik",
  "family.settings.musicDescription":
    "Musikalische Atmosphäre beim Spielen und in der Höhle.",
  "family.settings.hapticsTitle": "Vibration",
  "family.settings.hapticsDescription":
    "Haptisches Feedback zu Tippvorgängen, Sitzungsende und Belohnungen.",
  "family.settings.audioNote":
    "Töne dürfen nie nötig sein, um zu verstehen, was passiert: Die App zeigt immer auch Text, Symbole und visuelles Feedback.",
  "brush.client.bluetoothState": "Bluetooth: {state}",
  "brush.client.scanPrompt":
    "Schalte die Zahnbürste ein und halte sie in der Nähe",
  "brush.client.scanStarted": "BLE-Suche gestartet (Sonicare4Kids)",
  "brush.client.connecting":
    "Verbindung wird hergestellt und Dienste werden gelesen",
  "brush.client.found": "{name} gefunden",
  "brush.client.servicesFound": "{count} {count|GATT-Dienst|GATT-Dienste} gefunden",
  "brush.client.ready": "Sonicare ist bereit",
  "brush.client.connected": "Verbunden: Sonicare-GATT geöffnet",
  "brush.client.handleState": "Status des Handgriffs: {state}",
  "brush.client.notificationUnavailable":
    "Benachrichtigung nicht verfügbar: {code}",
  "brush.client.disconnected": "Zahnbürste getrennt",
  "brush.client.connectionEnded": "Bluetooth-Verbindung beendet",
  "brush.client.optionalReadUnavailable":
    "Optionales Lesen nicht verfügbar: {code}",
  "brush.client.historyCountUnavailable":
    "BLE-Verlaufsanzahl nicht verfügbar; vorsichtige Synchronisierung wird verwendet",
  "brush.client.firstSyncLimited":
    "Erste Verbindung: höchstens die letzte Sitzung vom Handgriff übernommen; frühere Sitzungen lassen sich nicht prüfen.",
  "brush.client.invalidCountPayload":
    "Ungültige Bluetooth-Sitzungsanzahl: Synchronisierung gestoppt, Zähler unverändert.",
  "brush.client.clockUnavailable":
    "Uhr des Handgriffs nicht verfügbar: Sitzungsdatum ist ungefähr",
  "brush.client.sessionRead": "Sitzung {id} gelesen ({duration}s)",
  "brush.client.sessionsReady":
    "{count} {count|BLE-Sitzung|BLE-Sitzungen} bereit zum atomaren Speichern",
  "brush.client.disconnectedShort": "Getrennt",
  "brush.client.unsupported":
    "Bluetooth ist nur in der installierten App verfügbar",
  "brush.client.webPreview":
    "Web-Vorschau: manueller Timer verfügbar; BLE ist iOS und Android vorbehalten",
  "brush.client.openDevelopmentBuild":
    "Öffne einen Development Build auf iPhone oder Android",
  "brush.client.nativeProtocolRequired":
    "Das Bluetooth-Protokoll erfordert die native iOS- oder Android-App",
  "brush.client.syncNativeOnly":
    "Synchronisierung ist nur unter iOS und Android verfügbar",
  "brush.client.connectionFailed": "Bluetooth-Verbindung fehlgeschlagen",
  "brush.client.diagnostic": "Bluetooth-Diagnose aktualisiert",
  "brush.client.permissionDenied": "Bluetooth-Berechtigung wurde nicht erteilt",
  "brush.client.poweredOff": "Bluetooth ist aus: Schalte es ein und versuche es erneut",
  "brush.client.bluetoothUnsupported": "Dieses Gerät unterstützt kein Bluetooth",
  "brush.client.adapterNotReady": "Bluetooth ist nicht bereit: Prüfe, ob es eingeschaltet und erlaubt ist",
  "brush.client.pairedNotFound": "Gekoppelter Handgriff nicht gefunden. Schalte ihn ein und halte ihn in der Nähe, oder wechsle den Handgriff.",
  "brush.client.otherNotFound": "Kein anderer Handgriff gefunden. Schalte den neuen Handgriff ein und halte ihn in der Nähe.",
  "brush.client.scanPromptReplace": "Schalte den neuen Handgriff ein und halte ihn in der Nähe",
  "brush.client.scanStartedPaired": "BLE-Suche gestartet: Suche den gekoppelten Handgriff",
  "brush.client.scanStartedReplace": "BLE-Suche gestartet: Suche einen anderen Handgriff",
  "brush.client.otherHandleIgnored": "Anderer Handgriff gefunden: ignoriert, bis du den Handgriff wechselst",
  "brush.client.pairedHandleIgnored": "Bereits gekoppelter Handgriff ignoriert: Schalte den neuen Handgriff ein",
  "brush.client.operationTimedOut": "Bluetooth-Vorgang abgelaufen: Versuch es erneut",
  "brush.client.connectionFailedRetry": "Verbindung zur Zahnbürste fehlgeschlagen: Versuch es erneut",
  "brush.client.scanStartFailed": "Bluetooth-Suche konnte nicht gestartet werden: Versuch es gleich noch einmal",
  "brush.client.locationServicesDisabled": "Schalte den Standort in den Android-Einstellungen ein: Er ist für die Bluetooth-Suche nötig",
  "brush.client.gapSkipped": "Neuabgleich: {count} nicht wiederherstellbare {count|Sitzung|Sitzungen} des Handgriffs übersprungen",
  "brush.client.locationPermissionRequired":
    "Für die Bluetooth-Suche ist die Standortberechtigung erforderlich",
  "brush.client.connectionInProgress":
    "Eine Bluetooth-Verbindung wird bereits hergestellt",
  "brush.client.unavailable": "Bluetooth-Client nicht verfügbar",
  "brush.client.cancelled": "Bluetooth-Vorgang abgebrochen",
  "brush.client.unknownError": "Unbekannter Bluetooth-Fehler",
  "brush.client.notFound":
    "Zahnbürste nicht gefunden. Schalte sie ein und versuche es erneut.",
  "brush.client.syncLimit":
    "Der Handgriff meldet {count} Sitzungen: Die Synchronisierung überschreitet die Sicherheitsgrenze",
  "brush.client.resetDetected":
    "Der Zähler des Handgriffs scheint zurückgesetzt worden zu sein: Wähle „Zurückgesetzten Handgriff entfernen“.",
  "brush.client.unsafeGap":
    "Unsicheres Bluetooth-Intervall ({count} Sitzungen): Synchronisierung angehalten",
  "brush.client.incompleteHistory":
    "Der Verlauf des Handgriffs enthält nicht mehr alle fehlenden Sitzungen",
  "brush.client.missingRecord":
    "Bluetooth-Datensatz {id} fehlt oder wurde nicht erkannt; Synchronisierung angehalten",
} as const satisfies TranslationCatalog;
