# BStore Android update release

The existing Google Play app is `com.zeina43.mystore`. Its last uploaded versionCode is 11 (operator-confirmed). The next release is 12 in `app.json`; versionName remains 1.0.0. Both local and EAS production builds now use that same local version source, with automatic increments disabled. After uploading 12, increase app.json's versionCode before the next distinct release. Never reuse an uploaded versionCode.

## Prepare and check without building

Run from the `mystore` directory:

```powershell
npm run release:prepare
npm run release:check
```

Preparation synchronizes the existing Android tree's version, R8 configuration, Google Services inputs and release-signing block. It does not regenerate Android or compile an APK/AAB. On a fresh checkout without Android, EAS/native generation consumes the same config plugins instead. The signing block reads the existing root credentials.json at build time and cannot fall back to the debug key. It validates the fixed package and version floor, and keeps the release version aligned with app.json. No passwords or key values are written into tracked Gradle files.

The check reads the existing upload certificate, rejects debug/expired certificates, and uses an in-memory certificate request to verify access to the existing private signing key. That request is discarded; no key/credential is created or changed. It never prints passwords, key aliases, certificate subjects, or Firebase file contents. Existing credentials.json and credentials/android/keystore.jks remain excluded from Git and from the EAS source archive. EAS transfers local signing credentials separately through its credentials mechanism.

For an independent comparison with Play, set `BSTORE_PLAY_UPLOAD_CERT_SHA256` to the public SHA-256 shown under the existing BStore app's **Upload key certificate**, then run `npm run release:check`. A mismatch stops the check. When this optional value is absent, `playUploadCertificateMatched: null` means the local key was validated but its Play registration was not independently confirmed. No Play credentials or settings are changed.

## Build locally when authorized

After both checks pass:

```powershell
cd android
.\gradlew.bat :app:bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`.

## Build through EAS when authorized

After both checks pass:

```powershell
eas build --platform android --profile production
```

The production profile uses the existing local credentials.json, production environment and AAB format. Do not generate a new key or select a new application identity. This workflow requires the existing credentials and Firebase client file on the machine starting the build; Git/CI checkouts must receive those existing files securely.

## Validate the resulting AAB before uploading

- Confirm package `com.zeina43.mystore`, versionCode 12 (or the next unused greater version), target SDK and release signing. Compare its signer against the **Upload key certificate** in the existing BStore Play Console entry; Play's app-signing certificate is a different certificate. The available historical native configuration points to this same local credentials.json, but a direct comparison to Play's current upload certificate remains necessary for independent confirmation.
- Inspect the final merged manifest for MainActivity's unrestricted orientation/resizability. Source configuration is `orientation: default`; no portrait lock should be present.
- Inspect `BUNDLE-METADATA/com.android.tools/r8.json` for actual optimization/obfuscation metrics, and retain `mapping.txt`. R8 enablement and optimized default rules do not by themselves guarantee Google's obfuscation percentage threshold. Do not remove library keep rules blindly.
- Install/test the optimized release on a physical device: startup, login, catalog/images, navigation, notifications, rotation and a large-screen layout. Build/signing preflight does not prove runtime behavior.
- Upload into the existing BStore app and testing track. Do not create a new Play application. Play warnings for release 11 do not change merely because local source settings changed. Android 15 deprecated edge-to-edge APIs remain outside this change.

No app build, upload, Play setting change, credential replacement or real notification send is performed by either preflight command.
