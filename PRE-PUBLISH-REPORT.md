# BStore Android pre-publish audit

Date: September 25, 2026. Scope: `MyStore/mystore`.

**Decision: source and production JavaScript bundle validation passed, but final production release sign-off is conditional on the Android device and remote configuration checks below. No AAB/APK was generated, no release was created, and nothing was uploaded or published.**

## Checks passed

- TypeScript: `node node_modules/typescript/bin/tsc --noEmit` passed with zero errors, before and after changes.
- Expo Doctor: **21/21 checks passed** after five SDK 57 patch updates. `expo install --check` reports dependencies up to date. No major dependency upgrades.
- Existing security/behavior regression suite: **36 passed, zero failed**, including SecureStore migration, concurrent refresh, transient network failures, logout persistence, account switching, checkout retry IDs, catalog privacy, favorites/cart API calls, push permission handling and account-safe notification navigation. These tests use mocks; they do not prove live checkout or push delivery.
- Production Android Metro/Hermes export: passed after final app changes, **1,415 modules / 47 assets**, generated a 3.6 MB `.hbc` bundle under ignored `.release-check/final-audit-export`. This checks JavaScript compilation, imports and bundled assets, not native Gradle compilation or signing.
- `npm ls --depth=0` passed. The existing query-string compatibility patch applied successfully during installation.
- `npm audit --omit=dev`: **zero reported vulnerabilities**. Full dependency audit has two moderate development-only findings described below.
- Static navigation inspection: all literal router destinations resolve to existing screens. Product/category/department/order navigation parameters were reviewed; notification navigation allows only the current account and supported destinations.
- Production API constant is consistently `https://mystore-backend-u6ey.onrender.com`. No client dependency on a localhost server, development tunnel or public environment variable was found.
- Read-only live requests: home, products, offers, top sellers, categories, departments and `/slideshows` returned HTTP 200. User profile, notification preference, cart, favorites and orders returned HTTP 401 without credentials, as expected.
- Catalog samples contained 366 distinct image values, with no absolute HTTP image URLs. Four product images and two slideshow images returned HTTP 200 with image content types from Supabase. This is sampling, not an exhaustive image check. No customer image-upload feature or camera/gallery picker is present in this app.
- Tracked client/config scan found no obvious private keys, service-role keys, database credentials, hardcoded development URLs, missing directly required local assets or unguarded console calls in `src`. Logs are guarded by `__DEV__`. This was a current-tree review, not a full Git-history secret audit.
- Registration, six-digit OTP verification/resend, login, forgot/reset/change password, account editing/phone verification, account deletion, products, departments, categories, search, favorites, cart, checkout, orders, notifications and settings were reviewed for obvious runtime/configuration problems. No production account mutations were performed.

## Android configuration

- App/package: **BStore / `com.zeina43.mystore`**. Display version: **1.0.0**, consistent with package metadata and informational screens.
- EAS production profile uses `app-bundle`, remote version management and `autoIncrement: true`; it does not enable the development client or internal distribution. Development and preview profiles remain separate.
- No local `android.versionCode` is required by this remote-version workflow. **The actual remote versionCode and its relationship to any previous Play upload were not verified.** Confirm it before the final build; do not infer it from the generated local native project's versionCode 1.
- Local `google-services.json` exists and its Android package matches. `app.config.js` validates the package and supports an EAS `GOOGLE_SERVICES_JSON` file variable. `.easignore` includes the local Firebase client configuration while `.gitignore` excludes it from Git. Firebase client configuration is not a service-account private key.
- EAS project ID is configured. Push channel creation precedes permission/token registration; account and preference checks exist for display/taps. FCM v1 credentials, actual device delivery and deployed backend workers remain unverified.
- Existing 2000×2000 splash/logo asset exists and is used as the launcher icon and splash image; no branding was changed. No separate adaptive/monochrome icon is configured. Verify cropping and appearance on the phone.
- `/loading` has a valid image and cleaned-up redirect timer. Startup currently opens `index` after the native splash, not `/loading`; this existing behavior was preserved.
- Android safe-area protection and explicit dark status-bar icons were added for the existing light screens. Bottom inset protects controls from gesture/three-button navigation. Navigation-bar colors remain platform defaults; phone testing in light/dark system modes is required.
- External-storage permissions are now blocked in generated manifests; remote image display and private app storage do not need these permissions. Internet and notification-related permissions are retained. `SYSTEM_ALERT_WINDOW` is retained because the installed development client uses it; no camera, microphone, contacts or location feature was added.
- The local `android/` folder is generated and excluded from EAS uploads. Its release Gradle template references the debug keystore, so **do not treat that local template as verified production signing**. EAS signing credentials were not inspected. Configuration fixes must be reflected by fresh native generation for device builds; this audit did not overwrite the existing native folder.

## Issues fixed and exact files changed

| File | Change and reason |
| --- | --- |
| `app.json` | Blocked `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE`, which are unnecessary for this customer's remote-image/private-storage flows. Effective Expo manifest introspection confirms removal markers. |
| `src/app/_layout.tsx` | Added Android safe-area edges and dark status-bar icons to prevent controls/content being obscured by system bars and cutouts. Existing screen layouts and business logic remain intact; verify final spacing on a device. |
| `src/app/index.tsx` | Recreated slideshow gesture handlers when next/previous callbacks change. Previously `useRef` retained callbacks from the initial empty slide list, so swipes did nothing after slides loaded. |
| `package.json` | Updated only the five Expo SDK patch ranges flagged by diagnostics: expo 57.0.25, glass-effect 57.0.4, linking 57.0.11, notifications 57.0.21, router 57.0.23. Added Expo-compatible ESLint development tooling so the existing lint command can run. The pre-existing Android/iOS run-script changes were preserved. |
| `package-lock.json` | Recorded the patch updates and ESLint development dependency tree. |
| `eslint.config.js` | Added the standard Expo flat configuration, excluded generated native/export files and declared Node globals for configuration/test scripts. No app lint rules were disabled. |
| `PRE-PUBLISH-REPORT.md` | Added this report. |

Temporary audit scripts/results exist only in ignored `.release-check/`; they are excluded from EAS uploads.

## Remaining findings and limits

- **Lint is not clean: 94 errors and 34 warnings.** Errors comprise 80 Animated/ref diagnostics, four memoization diagnostics, two purity diagnostics, one declaration-order diagnostic, two missing component display names and five JSX apostrophe findings. Warnings comprise nine Hook dependency findings and 25 unused-variable findings (including test helpers). Compiler diagnostics include skipped optimization of existing animation code; the final production export still succeeds. No broad animation refactor or blanket lint suppression was performed. Machine-readable output is `.release-check/lint-final.json`.
- Full npm audit reports moderate findings for `@expo/ngrok` and its nested `uuid`, originating from [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq). They are development dependencies, not production app dependencies. npm reports no automatic fix. No forced upgrade or removal of development functionality was performed.
- `web.favicon` references a missing `assets/images/favicon.png`, and `reset-project` references a missing script. Neither is used by the Android production export/build workflow, so both were left unchanged under the Android-only scope.
- Live public API checks establish reachability and expected response shapes, not that the deployed server contains every local session, idempotency, notification-worker or database-transaction change. Authenticated end-to-end tests and backend deployment confirmation remain necessary.
- No native APK/AAB compilation, signing verification, Play version comparison, real OTP delivery, production checkout or notification send was performed.

## Required manual Android tests

Use a native test build and a dedicated test account, not Expo Go for remote push.

1. Cold-start/force-stop/reopen: launcher icon, splash, initial loading, fonts and images. Test a cutout phone, gesture navigation and three-button navigation, light/dark system mode, keyboard visibility and Android Back. Ensure headers and bottom checkout/cart controls remain reachable.
2. Swipe the slideshow both ways after images load; confirm auto-advance and refresh still work.
3. Register, receive the administrator-delivered OTP, reject invalid/expired codes, resend and verify. Log in, restart the app, wait for token expiry, try offline/reconnect, log out offline and online, restart, then switch accounts. Verify no prior account's private data returns.
4. Forgot/reset password, change password, edit delivery information, change phone with OTP, and account-deletion confirmation/error handling on a disposable account.
5. Browse departments/categories/products; search; add/remove favorites; add/remove cart items; type quantities; verify out-of-stock behavior, totals and minimum order. Refresh with slow/offline networking.
6. Checkout with a test order: address edits, repeated taps, interrupted response/retry, order history/details and status changes. Confirm only one order is created and server prices are authoritative.
7. Push: confirm EAS FCM v1 credentials and backend workers first; allow/deny permission, toggle preference, receive offer/order notifications foreground/background/terminated, tap them, then repeat after logout/account switching. Confirm another account's order never opens.
8. Confirm EAS production signing credentials and next remote versionCode against the existing Play application before authorizing the final AAB.

**Ready for the final production AAB? Conditionally: automated source/bundle checks pass, but do not give the release final approval until the device tests and remote signing/version/push checks pass.**

References used: [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/), [Expo safe areas](https://docs.expo.dev/develop/user-interface/safe-areas/), [Expo app configuration](https://docs.expo.dev/versions/v57.0.0/config/app/).
