#!/usr/bin/env python3
"""Verify permissions in an APK's decoded Android manifest, not app.config.ts.

Usage: apkanalyzer manifest print app-debug.apk > /tmp/AndroidManifest.xml
       python3 scripts/validate_android_manifest.py /tmp/AndroidManifest.xml
"""

from __future__ import annotations

import sys
from pathlib import Path
from xml.etree import ElementTree as ET

ANDROID = "{http://schemas.android.com/apk/res/android}"
LOCATION = {
    "android.permission.ACCESS_COARSE_LOCATION",
    "android.permission.ACCESS_FINE_LOCATION",
}
NO_BACKGROUND_SERVICE = {
    "android.permission.FOREGROUND_SERVICE",
    "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
}


def validate_manifest(path: Path) -> list[str]:
    """Return violations; missing, malformed or unexpected permissions fail closed."""
    if not path.is_file():
        return [f"Manifest dell'APK non trovato: {path}"]
    try:
        root = ET.parse(path).getroot()
    except (ET.ParseError, OSError) as exc:
        return [f"Impossibile leggere il manifest dell'APK: {exc}"]
    if root.tag != "manifest":
        return [f"Root inattesa del manifest: {root.tag}"]

    errors: list[str] = []
    permissions: dict[str, list[ET.Element]] = {}
    for element in root:
        if element.tag not in {"uses-permission", "uses-permission-sdk-23"}:
            continue
        name = element.get(f"{ANDROID}name")
        if not name:
            errors.append("Permesso privo di android:name")
            continue
        permissions.setdefault(name, []).append(element)

    for name in sorted(LOCATION):
        for element in permissions.get(name, []):
            limit = element.get(f"{ANDROID}maxSdkVersion")
            if limit is None or not limit.isdecimal() or int(limit) > 30:
                errors.append(f"{name}: deve avere maxSdkVersion <= 30, trovato {limit!r}")
    if "android.permission.ACCESS_BACKGROUND_LOCATION" in permissions:
        errors.append("ACCESS_BACKGROUND_LOCATION non utilizzato dall'app")

    scan = permissions.get("android.permission.BLUETOOTH_SCAN", [])
    if len(scan) != 1 or scan[0].get(f"{ANDROID}usesPermissionFlags") != "neverForLocation":
        errors.append("BLUETOOTH_SCAN deve essere unico e dichiarare neverForLocation")
    if "android.permission.BLUETOOTH_CONNECT" not in permissions:
        errors.append("BLUETOOTH_CONNECT mancante")

    for name in sorted(NO_BACKGROUND_SERVICE):
        if name in permissions:
            errors.append(f"Permesso foreground non richiesto dall'app: {name}")
    for service in root.findall(".//service"):
        name = service.get(f"{ANDROID}name", "")
        if "expo.modules.audio" in name.lower() or "AudioControlsService" in name:
            errors.append(f"Servizio audio in background non richiesto: {name}")
    return errors


def main() -> int:
    if len(sys.argv) != 2:
        print("Uso: validate_android_manifest.py <packaged AndroidManifest.xml>", file=sys.stderr)
        return 2
    path = Path(sys.argv[1])
    errors = validate_manifest(path)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print(f"Manifest Android estratto dall'APK verificato: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
