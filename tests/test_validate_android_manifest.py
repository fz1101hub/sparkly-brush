"""Fail-closed tests for the Gradle packaged manifest permission gate."""

import importlib.util
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "validate_android_manifest.py"
SPEC = importlib.util.spec_from_file_location("validate_android_manifest", SCRIPT)
assert SPEC and SPEC.loader
validator = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(validator)

ANDROID = "http://schemas.android.com/apk/res/android"
VALID = f'''<manifest xmlns:android="{ANDROID}" package="example.sparkly">
  <uses-permission-sdk-23 android:name="android.permission.ACCESS_FINE_LOCATION" android:maxSdkVersion="30" />
  <uses-permission-sdk-23 android:name="android.permission.ACCESS_COARSE_LOCATION" android:maxSdkVersion="30" />
  <uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />
  <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
  <application />
</manifest>'''


class PackagedManifestTests(unittest.TestCase):
    def check(self, xml: str) -> list[str]:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "AndroidManifest.xml"
            path.write_text(xml)
            return validator.validate_manifest(path)

    def test_scoped_legacy_location_and_modern_ble_pass(self):
        self.assertEqual(self.check(VALID), [])

    def test_decoded_apk_numeric_never_for_location_passes(self):
        for encoded in ("0x00010000", "65536"):
            with self.subTest(encoded=encoded):
                xml = VALID.replace('android:usesPermissionFlags="neverForLocation"',
                                    f'android:usesPermissionFlags="{encoded}"')
                self.assertEqual(self.check(xml), [])

    def test_numeric_scan_without_never_for_location_fails(self):
        xml = VALID.replace('android:usesPermissionFlags="neverForLocation"',
                            'android:usesPermissionFlags="0x00000000"')
        self.assertTrue(any("neverForLocation" in err for err in self.check(xml)))

    def test_unscoped_location_fails_even_if_scoped_declaration_exists(self):
        extra = '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />'
        xml = VALID.replace("  <application />", f"  {extra}\n  <application />")
        self.assertTrue(any("ACCESS_FINE_LOCATION" in err for err in self.check(xml)))

    def test_new_location_permission_above_api_30_fails(self):
        xml = VALID.replace(
            'android:name="android.permission.ACCESS_COARSE_LOCATION" android:maxSdkVersion="30"',
            'android:name="android.permission.ACCESS_COARSE_LOCATION" android:maxSdkVersion="35"',
        )
        self.assertTrue(any("ACCESS_COARSE_LOCATION" in err for err in self.check(xml)))

    def test_ble_scan_without_never_for_location_fails(self):
        xml = VALID.replace(' android:usesPermissionFlags="neverForLocation"', "")
        self.assertTrue(any("neverForLocation" in err for err in self.check(xml)))

    def test_background_audio_permission_or_service_fails(self):
        audio = (
            '  <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />\n'
            '  <application><service android:name="expo.modules.audio.service.AudioControlsService" /></application>'
        )
        xml = VALID.replace("  <application />", audio)
        errors = self.check(xml)
        self.assertTrue(any("FOREGROUND_SERVICE_MEDIA_PLAYBACK" in err for err in errors))
        self.assertTrue(any("AudioControlsService" in err for err in errors))

    def test_missing_or_malformed_file_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "AndroidManifest.xml"
            self.assertTrue(validator.validate_manifest(path))
            path.write_text("not xml")
            self.assertTrue(validator.validate_manifest(path))


if __name__ == "__main__":
    unittest.main()
