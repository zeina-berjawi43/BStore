# BStore Phase 5 final audit report

Date: 16 October 2026

The code audit and available local verification are complete. All 525 main regression tests pass, all three client ESLint runs have zero errors and warnings, both TypeScript checks pass, and supported production builds/exports pass. Dependency advisories, Admin native-library compatibility warnings, credentials, physical-device acceptance and Play Console verification remain open. This is not a release approval.

Work continued in the existing uncommitted working trees of mystore, admin-app, admin-panel and backend. Phase 1–4 changes were preserved. No reset/checkout, commit, push, deployment, APK/AAB generation, real notification send, production database operation or production credential modification was performed. Database integration tests used newly created local test replica sets only.

## Problems found and fixed

### Customer App and Website

- Fixed the 22 existing ESLint warnings: duplicate/unused imports and state, obsolete lint directives and hook dependencies. Focus loaders and Cart's quantity submission use current committed callbacks without making ordinary renders trigger another focus load. Order/product route IDs still control which details are loaded. Search depends on the stable shopping refresh action.
- Updated the existing final-polish test fixture to execute the newly explicit effect hook. The original Orders/Product Details assertions remain; no test was removed or skipped.
- Applied only Expo's online-recommended SDK 57 patch updates: Expo ~57.0.30, Constants ~57.0.22, Dev Client ~57.0.20, Linking ~57.0.13, Notifications ~57.0.23, Router ~57.0.28 and Splash Screen ~57.0.10. React and React Native major/minor versions were retained.
- Excluded `.navigation-check/` from EAS uploads. Local exports, browser profiles and audit evidence must not enter a future remote build archive.

### Admin Panel

- Fixed all five existing ESLint warnings. Initial, polling and debounced loaders read current callbacks through committed refs, preserving their existing request timing.
- Lazy-loaded the Invoice route and imported html2canvas/jsPDF only when saving a PDF. The largest production JavaScript chunk is now 413.86 KB, with jsPDF 399.94 KB, html2canvas 199.50 KB and the Invoice chunk 28.45 KB. The previous roughly 1.04 MB main chunk warning is gone. These are build output sizes, not measured network latency.
- Updated the Users hook fixture to model refs and committed effects; all original customer-name, search, class-filter, edit and deletion assertions remain.
- Verified the real editor, shared A4/80mm previews and both short/long downloaded PDFs after lazy loading. Actual Chromium A4 and 80mm print-preview dialogs also opened successfully using intercepted offline fixtures, without printing.

### Admin App

- Added a real Expo flat ESLint configuration and SDK-compatible development lint dependencies: eslint ^9.39.5 and eslint-config-expo ~57.0.2. Generated native/export/tooling directories are excluded; application code and test scripts remain checked. No lint rule was disabled or weakened.
- The first lint run found 33 errors and 50 warnings. All were resolved. Fixes include hooks declared after the state/callbacks they capture, stable authentication-failure callbacks, complete loader dependencies, unused code/import removal and committed rather than render-time ref updates.
- Preserved hardware Back registrations even where their returned arrow callback was unused. Orders notification opening reads its current committed handler and still deduplicates the push request ID.
- Product price/discount inputs now keep source-tagged drafts rather than synchronously resetting state in an effect. Updated server values display correctly while ordinary local edits remain editable.
- Image framing creates its PanResponder after commit, keeps current gesture inputs in a committed ref and cleans up deferred attachment. The native drag/zoom/reset fixture now models committed effects and still checks all original geometry behavior. USB focus refresh uses a current callback; no printer protocol or invoice calculation was changed.
- Root session retry resets loading/error state in the retry action; initial restoration still begins in its existing loading state. Invoice loading uses a cancellable deferred fetch, and print-busy UI reads state rather than a ref during render. Web color-scheme hydration uses useSyncExternalStore.
- Added a server-rendering storage guard: SSR reads return null without accessing browser AsyncStorage. Native and browser Remember Me behavior remains covered by the existing tests. Admin static web export now succeeds.
- Applied Expo's online-recommended SDK 57 patches: @expo/ui ~57.0.25, Expo ~57.0.30, Asset ~57.0.20, Dev Client ~57.0.20, Linking ~57.0.13, Router ~57.0.28, Sharing ~57.0.23 and Splash Screen ~57.0.10. Installed Notifications remains 57.0.23, compatible with its existing ~57.0.22 declaration. No Expo/React Native major upgrade was performed.
- Scoped Xcode's UUID dependency to 11.1.1, retaining its required v4 API and 24-character project IDs. Added a bounded ICNS decoder security backport for legacy image-size 0.6.3; all existing printer/query-string patches still apply successfully.
- Admin Google Services configuration now rejects missing files and files for another Android package. No Firebase file or credential was created or changed.
- Added four focused regressions: SSR storage isolation; missing/wrong-package Firebase configuration; valid and malicious ICNS parsing with a child-process deadline; Xcode UUID compatibility.

### Backend and integration fixtures

- Replaced duplicate `$ne` keys in three notification recipient filters with `$nin: [null, ""]`. JavaScript had silently discarded the first `$ne`, leaving null values in the initial query. Existing downstream guards prevented them from being sent; the query now expresses both exclusions correctly. Strengthened the actual admin sender test to reject null/empty tokens while accepting the valid token.
- The optional real-database pricing integration initially failed at `tests/pricing.integration.cjs:95`: it raised Class C's minimum to 108.01 while leaving the free-delivery threshold at 100. The existing API correctly returned 400. The fixture now moves both boundaries together for its intended zero-fee scenario, and explicitly checks success for subsequent settings saves. All minimum, tampering, checkout, snapshot and ownership assertions remain. Application pricing rules were not changed.

## Complete local verification

Commands are run from the named repository. Results below reflect the final source and SDK patch versions, rather than historical Phase 1–4 logs.

| Component / command | Result |
| --- | --- |
| Customer: `node --test scripts/*.test.cjs scripts/security-check.cjs` | 193 passed; 0 failed, cancelled or skipped |
| Admin App: `node --test scripts/check-*.cjs scripts/*.test.cjs` | 186 passed; 0 failed, cancelled or skipped; includes four new Phase 5 tests |
| Admin Panel: `node --test tests/*.test.mjs` | 68 passed; 0 failed, cancelled or skipped |
| Backend: `npm test` | 78 passed; 0 failed, cancelled or skipped |
| Customer, Admin App and Admin Panel: `npm run lint` | Each: 0 errors, 0 warnings |
| Customer and Admin App: `node node_modules/typescript/bin/tsc --noEmit` | Both passed |
| Backend: `node --check` over application/scripts/tests | All 80 JavaScript/CommonJS files passed |
| Admin Panel: `npm run build` | Passed; no oversized-chunk warning |
| Customer: `node node_modules/expo/bin/cli export --platform web --output-dir .navigation-check/web` | Passed; 27 static routes |
| Admin App: `node node_modules/expo/bin/cli export --platform web --output-dir .release-check/phase5-web` | Passed; includes invoice/details routes |
| Both Expo apps: `expo export --platform android --source-maps` | Passed; Hermes JS/assets/maps only, no native binary |
| Both Expo apps: `expo config --type introspect --json` | Passed; plugins/config resolved without generating native projects |
| Both Expo apps: online `expo install --check` | Passed: dependencies up to date after the targeted patch updates |
| Customer: installed Expo Doctor 1.20.4, `--verbose` | 21/21 checks passed |
| Admin App: same Expo Doctor | 20/21 passed; native-directory compatibility warning remains, detailed below |
| Both Expo apps: `node node_modules/patch-package/index.js --error-on-fail` | Passed; Customer query-string patch; Admin both printer patches, query-string and new image-size patch |
| All four repos: `git diff --check` | Passed; only informational Windows LF/CRLF conversion notices |

Admin Panel and Backend are JavaScript projects without configured TypeScript checks; Backend has no configured ESLint or separate production compilation command. Their actual existing tests, Panel lint/build and Backend syntax checks were run instead. No check is represented as passing when it does not exist.

Web exports emit Expo Notifications' notice that push-token change listening is unsupported on web. Both native push lifecycles are platform-gated; Android delivery is not inferred from a web export. The notice was recorded, not suppressed.

The first Android JS exports failed with sandbox `spawn EPERM`; the same exports passed with permitted process execution. Test workers, local MongoDB and Chrome also required that execution permission. Unsupported `expo install --check --offline` syntax was corrected to the CLI's environment-based mode; the definitive compatibility check was then run online. No failed command was counted as a success.

### Browser and invoice coverage

All six existing suites were rerun against the final fresh Customer export and Panel build, sequentially because they share a local port:

| Command | Result |
| --- | --- |
| Customer `node scripts/ui-ux-browser-smoke.cjs`, BSTORE_WEB_EXPORT set to the fresh export | 25 checks passed; 0 JavaScript exceptions |
| Customer `node scripts/phase3-browser.cjs` | 4 passed; 0 exceptions |
| Customer `node scripts/navigation-browser.cjs` | 8 passed; 0 exceptions |
| Customer `node scripts/catalog-browser.cjs` | 5 passed; 0 exceptions |
| Customer `node scripts/phase4-browser.cjs` | 18 passed; 0 exceptions |
| Panel `node tests/phase4-browser.cjs` | 8 passed; 0 exceptions |
| Panel `node tests/invoice-ui-visual.mjs` | Real editor/modal and short/long PDF assertions passed |
| Panel `node tests/invoice-visual.mjs phase5` | 42 production-template cases rendered; geometry/content assertions passed |
| Panel `node tests/invoice-print-dialog.mjs 80mm off` and `... A4 off` | Both actual Chromium print-preview captures completed; no physical printing |

The six suites total 68 checks and zero recorded exceptions. They cover authenticated/signed-out checkout, responsive layouts, A/B/C cart eligibility/totals/delivery, quantities/removal, logout confirmation, Offers/refresh, retained category/scroll, notification login continuation and order parents, Settings/Start Shopping history, manifest/PWA metadata, WhatsApp payloads/preparation synchronization and exact Arabic drafts. The 600-product catalog still mounts 24 department cards and performs one Home-to-department product read. Synthetic frame timings remain noisy and are not an Android FPS claim.

### Real local database verification

The existing cached MongoDB 8.2.6 executable was used with downloads disabled. Temporary replica sets were stopped after each run. Tests never load a production database URL.

- `node .release-check/mongo-tools/run.cjs`: existing checkout integration passed concurrent checkout/replay, authoritative prices and transaction rollback.
- `node .release-check/mongo-tools/release-security.cjs`: 5/5 passed, including concurrent/single-use OTP, attempt limits, expiry/purpose restrictions, password reset and account-deletion snapshot isolation.
- The local Phase 5 runner executed `node tests/pricing.integration.cjs` on port 27028 / bstorePricingTest and `node tests/accountDeletion.integration.cjs` on port 27018 / bstoreTestRS. Both passed after the fixture correction. Pricing exercised actual HTTP auth, migration dry-run/apply/idempotency, class tampering, settings, catalog/Favorites/cart, minimum boundaries, concurrent checkout, immutable order/invoice snapshots and ownership. Deletion passed all three scenarios: active-order rejection, transaction rollback and personal-data removal with financial-history retention.

These integration assertions are additional to the 525 main-suite tests; they are not inflated into that count.

## Dependency and security audit

Audits used the actual online registry: `npm audit --offline=false --json` and `npm audit --offline=false --omit=dev --json`, with bounded fetch deadlines/retries. This environment defaults npm to offline mode; its initial empty advisory response was rejected as insufficient evidence. The final results are the online JSON files.

| Repository | Full dependency audit | `--omit=dev` audit |
| --- | --- | --- |
| Customer | 22: 20 high, 2 moderate | 18 high |
| Admin App | 33: 28 high, 5 moderate | 31: 26 high, 5 moderate |
| Admin Panel | 0 | 0 |
| Backend | 3 high | 0 |

There are no critical findings in these runs. Admin's saved baseline was 42 (28 high, 14 moderate), rather than the earlier approximate 41; UUID remediation reduced the moderate dependency chains. Intermediate registry/cache snapshots produced 32/33 totals; the table uses the final online result after SDK patch updates. Counts include parent packages flagged through a vulnerable dependency, not 33 independent Admin application exploits.

| Root advisory / installed dependency | Exposure and disposition |
| --- | --- |
| [braces 3.0.3: nested-pattern stack exhaustion](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), high | Expo/Metro/file-glob and patch tooling in the apps; nodemon > chokidar in Backend development tooling. No patched upstream release was available at audit time. Do not supply untrusted glob patterns to these tools. Backend production audit is clean. |
| [node-forge 1.4.0: RSA signature verification](https://github.com/advisories/GHSA-86w9-cpqp-85rv), high | Expo CLI code-signing certificate tooling, not the BStore login/JWT or checkout implementation. No patched upstream release was available. Untrusted certificate verification remains a build-tool risk pending an upstream compatible fix. |
| [image-size 0.6.3: malformed ICNS infinite loop](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr), high | Admin legacy React Native CLI dependency. Backported entry/header/bounds checks preserve its callable 0.x API; valid ICNS and malformed zero/truncated entries pass the deadline-protected regression. Upstream 2.0.4 is not a drop-in API override. npm still flags version 0.6.3 despite the applied mitigation. |
| [ip 1.1.9: isPublic SSRF classification](https://github.com/advisories/GHSA-2p57-rm9w-gvfp), high | Admin legacy CLI tooling pulled through the printer/ping dependency chain. No affected Node ip package appears in the Android bundle. Application request authorization/SSRF protection does not use this helper. No safe compatible upstream fix was identified. |
| [sprintf-js 1.0.3: unbounded precision](https://github.com/advisories/GHSA-hp3w-g68c-fv3c), moderate | Admin legacy CLI argument/format tooling. Attacker-controlled format strings are required; no patched release was available. It is absent from the Android bundle. |
| [uuid <11.1.1: v3/v5/v6 caller-provided buffer bounds](https://github.com/advisories/GHSA-w5hq-g745-h8pq), moderate | Admin Xcode dependency now resolves 11.1.1 with compatibility coverage. Customer's development-only @expo/ngrok still resolves UUID 3.4.0; its actual call is v4 without a supplied buffer, so this advisory path is not exercised there. A scoped override was attempted, but npm retained the old nested version; the ineffective override was removed and the dependency tree was verified valid. The finding is disclosed, not hidden. |

The installed application SDK packages bring CLI/Metro dependencies under npm's production dependency graph. Consequently `--omit=dev` counts are not the same as vulnerabilities shipped in an Android app. Final Hermes source maps contain 1,418 Customer and 1,746 Admin source entries and **zero sources from the affected Node packages** braces, node-forge, ip, image-size, sprintf-js or uuid. This establishes their absence from these Android JS bundles; it does not certify native libraries, CI machines or every future build configuration.

The complete affected-parent lists and dependency paths are retained in `phase5-final-summary.json`, `phase5-security-summary.json`, the four final audit JSON files and Admin dependency-path evidence. Findings propagate through Expo/Metro/React Native and, in Admin, the legacy community CLI, argparse/js-yaml/cosmiconfig and printer/ping chain. Backend's three flagged packages are braces, chokidar and nodemon; its production graph has no advisory.

No `npm audit fix --force`, unsafe image-size major override, Expo/RN major upgrade, audit allowlist or lint suppression was used. Upstream tooling findings remain unresolved security warnings. Replacing the working native printer stack merely to erase advisory metadata would require a separate compatibility effort and physical printer tests.

### Application security and business-rule preservation

The complete security/pricing tests and local integrations retain server-side session/role checks, credential-version revocation, resource ownership, bounded single-use OTP, upload validation, checkout idempotency/transactions, immutable historical totals and account-deletion isolation. Public catalog responses remain price-free; authenticated price caches remain scoped to session/class and are invalidated on observed class changes. No secret or full price snapshot was added to disk cache.

No A/B/C percentage/class rule, minimum threshold, delivery/free-delivery formula, discount, cart progress, checkout total, invoice arithmetic or authorization policy was changed. All four Phase 1 navigation fixes, Phase 1.1 empty Class C progress, Phase 2 virtualization/cache behavior and Phase 3/4 customer/admin features remain covered by the passing suites.

Admin push still uses its connected SDK lifecycle, authenticated registration/removal, permission/channel setup, restored/login sessions, token rotation/account ownership, retry/deduplication, foreground handling and background/cold tap continuation. Actual new-order and REGISTER/RESET_PASSWORD/CHANGE_PHONE sender paths, recipient guards, tickets and delayed receipts remain tested. No customer notification behavior was changed by the Admin lint cleanup.

## Google Play and native readiness

Official requirements were checked on 16 October 2026. [Google Play's current target API policy](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en-EN) requires new phone apps/updates to target API 36 from 31 August 2026. [Expo SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/) specifies target/compile 36. Installed React Native Gradle metadata agrees: minimum 24, target/compile 36, Build Tools 36.0.0, AGP 8.12.0 and NDK 27.1.12297006. Both online SDK checks pass. Generated native directories are ignored/CNG inputs; no final merged release manifest has been built or inspected in this task.

| Item | Verified locally | External/artifact gate |
| --- | --- | --- |
| Customer identity | com.zeina43.mystore; EAS 01603f4a-3767-40ad-84bd-0743d02198c1 | Confirm existing Play listing/package ownership |
| Admin identity | com.zeina43.adminapp; EAS 96f34cc8-d72f-4b0c-8242-b86661288728 | Confirm intended distribution/listing and ownership |
| Versioning | Both display version 1.0.0; EAS appVersionSource remote; production autoIncrement true | Remote versionCode and its relation to uploaded releases are unverified; no arbitrary versionCode was invented |
| Signing | Existing EAS profiles retained; Customer preview explicitly APK and production app-bundle; Admin internal preview/production profiles retained | Verify remote keystore/upload key, Play App Signing and fingerprints; no signing credential was accessed/modified |
| 16 KB | Modern RN/AGP baseline; installed Reanimated/Worklets enable flexible page sizes | Inspect every final native .so, ELF/RELRO and APK ZIP alignment; test a 16 KB device/emulator; legacy printers remain a compatibility risk |
| Permissions | Notifications/network; Admin additionally Bluetooth/printer, image picker and legacy location/storage declarations from native dependencies | Inspect final merged manifest and runtime prompts, especially on API 31/33/36; justify actual usage in policy forms |
| Legal pages/deletion | Public Panel /privacy-policy and /delete-account routes; in-app deletion; authenticated transaction/retention tests pass | Confirm approved deployed HTTPS URLs are accessible without login and match store listing, retention practice and support process |
| Data Safety/store forms | Source data flows reviewed; no new analytics/ad SDK added | Operator must verify actual processors/retention, collection/sharing declarations, encryption/deletion, target audience, content rating, screenshots and reviewer access |

[Android's current 16 KB guidance](https://developer.android.com/guide/practices/page-sizes) covers apps targeting API 35+ and currently states an update enforcement date of 1 February 2027. SDK/JS success alone is insufficient. On approved artifacts, check ELF load segments for at least 2**14 alignment, RELRO alignment where present and `zipalign -v -c -P 16 4` on APKs; inspect bundle delivery and exercise native modules on 16 KB Android. No existing unrelated APK or stale node_modules build output was treated as evidence for these changes.

Customer Expo Doctor is fully green. Admin Doctor still flags **react-native-ping as unmaintained/untested on New Architecture** and missing directory metadata for **@haroldtran/react-native-thermal-printer** and **react-native-thermal-printer**. These checks were not excluded. Automated native bridge/protocol/Unicode tests pass, but cannot establish New Architecture/native linking, 16 KB or physical printer compatibility. This is a remaining actionable verification warning, not a proven printer failure.

Admin native manifests include camera and API<=32 legacy storage via Image Picker, Bluetooth/connect/scan/advertise and location declarations via printer/BLE libraries. No modern READ_MEDIA_IMAGES/VIDEO declaration was found in the inspected Image Picker manifest. Customer explicitly blocks legacy read/write external-storage permissions. Final merged manifests and actual permission necessity still require artifact review; native dependencies were not removed speculatively.

[Google's account-deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en-EN) and [Data Safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en) require accurate public disclosures and an external deletion pathway where applicable. The existing email-assisted deletion page and in-app action were retained; retained historical invoices are disclosed rather than silently claimed deleted. Live URLs, email handling and submitted forms were not verified through Play Console.

For personal developer accounts created after 13 November 2023, [the current closed-testing policy](https://support.google.com/googleplay/android-developer/answer/14151465) requires at least 12 testers continuously opted in for 14 days before applying for production access. **This account's type, creation date, testing completion, verification and production access status are unverified.** No unresolved account restriction is assumed, and no claim is made that any restriction has been cleared.

## Firebase / FCM / EAS gates

- Customer's local Google Services file is present and passes the existing Android-package check. That proves file/package consistency, not remote FCM service-account validity or device delivery.
- Admin has no local Google Services file or configured file variable in this environment. Supply the approved Firebase Android client file for **com.zeina43.adminapp** through `ADMIN_GOOGLE_SERVICES_FILE` in every intended EAS build environment. The validated dynamic config maps it to android.googleServicesFile. Reusing the Customer client file is not acceptable.
- Verify the matching Firebase project's FCM v1 API/service-account permissions and its credential association with the Admin EAS project. EAS and Firebase project IDs are different identifiers; matching the UUID text is not the verification. The [Expo FCM setup guide](https://docs.expo.dev/push-notifications/fcm-credentials/) requires both client configuration and server credentials. If client API keys are restricted, verify required FCM Registration/Firebase Installations APIs and appropriate signing fingerprints, including Play App Signing where applicable.
- Remote EAS signing/FCM credentials, environment file variables and any Expo push access-token enforcement remain unverified. Nothing was generated, uploaded or replaced. Check backend staging environment, HTTPS access, live session/device records and delayed-receipt worker operation before staging push acceptance.
- A newly approved native build must contain the Notifications module/plugin and Firebase config. A previously installed APK without them cannot gain these native capabilities from JavaScript alone. Physical notification delivery remains unverified.

## Exact Phase 5 files changed

Paths are relative to the workspace. Earlier Phase 1–4 files remain uncommitted too; this list describes Phase 5 changes compared with the saved starting hashes, plus the EAS ignore change and this report.

| Component | Exact paths |
| --- | --- |
| Customer configuration | mystore/.easignore; mystore/package.json; mystore/package-lock.json |
| Customer screens | mystore/src/app/cart.tsx; mystore/src/app/checkout.tsx; mystore/src/app/edit-account.tsx; mystore/src/app/favorites.tsx; mystore/src/app/index.tsx; mystore/src/app/order-details.tsx; mystore/src/app/orders.tsx; mystore/src/app/product-details.tsx; mystore/src/app/search.tsx |
| Customer fixture/report | mystore/scripts/final-polish.test.cjs; mystore/BStore-Phase-5-Final-Audit-Report.md |
| Admin configuration/security patch | admin-app/app.config.js; admin-app/eslint.config.js; admin-app/package.json; admin-app/package-lock.json; admin-app/patches/image-size+0.6.3.patch |
| Admin screens | admin-app/src/app/_layout.tsx; admin-app/src/app/add-admin.tsx; admin-app/src/app/bluetooth-printer.tsx; admin-app/src/app/brands.tsx; admin-app/src/app/categories.tsx; admin-app/src/app/dashboard.tsx; admin-app/src/app/departments.tsx; admin-app/src/app/invoices/[invoiceId].tsx; admin-app/src/app/login.tsx; admin-app/src/app/notifications.tsx; admin-app/src/app/orders.tsx; admin-app/src/app/phone-verification.tsx; admin-app/src/app/printer-settings.tsx; admin-app/src/app/products.tsx; admin-app/src/app/slideshow.tsx; admin-app/src/app/usb-printer.tsx; admin-app/src/app/users.tsx |
| Admin hooks/components/services | admin-app/src/components/image-frame-editor.tsx; admin-app/src/hooks/use-admin-push.ts; admin-app/src/hooks/use-color-scheme.web.ts; admin-app/src/services/admin-api.ts; admin-app/src/services/session-storage.ts |
| Admin tests | admin-app/scripts/admin-push.test.cjs; admin-app/scripts/check-admin.cjs; admin-app/scripts/check-final-fix.cjs; admin-app/scripts/check-image-frame.cjs; admin-app/scripts/check-thermal-unicode.cjs; admin-app/scripts/phase5-audit.test.cjs |
| Panel | admin-panel/src/App.jsx; admin-panel/src/pages/Invoice.jsx; admin-panel/src/pages/PhoneVerification.jsx; admin-panel/src/pages/Products.jsx; admin-panel/src/pages/Slideshow.jsx; admin-panel/src/pages/Users.jsx; admin-panel/tests/users.test.mjs |
| Backend | backend/services/notificationService.js; backend/tests/admin-push.test.js; backend/tests/pricing.integration.cjs |

Local ignored orchestration/evidence files were also added under mystore/.navigation-check, and one local Mongo runner under backend/.release-check/mongo-tools. They are not application source or deployment artifacts. Existing Phase 1–4 reports were retained as historical evidence.

## Evidence and remaining acceptance

Evidence is retained under `mystore/.navigation-check/phase5-*`: four test logs, three lint logs, two TypeScript logs, Panel build, both web/Android exports, native config JSON, online SDK checks/Doctor, patch checks, full/production audit JSON, security/final summaries, six browser outputs, invoice and print-dialog logs, database integrations and four diff-check logs. Original Phase 5 hashes distinguish this phase from earlier dirty changes. Browser JSON is also in the existing .navigation-check/.release-check locations; invoice PDFs/screenshots/metrics are under workspace `.invoice-acceptance/phase5` and `.invoice-acceptance/professional`.

Before approved test builds or release:

1. Supply/verify Admin Firebase client configuration and remote FCM/signing/EAS environment setup. Recheck upstream security advisories and Admin native dependency compatibility. Generate no binary until separately approved.
2. On approved Customer and Admin APKs, verify cold/remembered/nonremembered login, OTP/expiry/revocation/logout/account switching, offline restoration/retry, orientation, safe areas/dark status icons, Android Back and font scaling. Exercise the four Phase 1 navigation flows and deep links without exposing Login/startup through authenticated Back history.
3. Use staging A/B/C accounts to verify exact/exceeded/below minimum/free-delivery boundaries, discounts/quantities/cart progress, real image framing, 600-item category scrolling/Back, foreground refresh/cache invalidation and backend-authoritative checkout/order/invoice totals. Verify idempotent retries under network loss.
4. Trigger staging Customer order-status and Admin new-order/phone-verification pushes. Test foreground/background/terminated taps, signed-out and expired continuation, channel/permission denial and later approval, rotation/account/device replacement, duplicate delivery/navigation, Customer shade dismissal and delayed receipts. Verify other apps' notifications remain. No production send is needed for acceptance.
5. Test Admin USB/Bluetooth printers on real hardware, permission denial/settings/reconnect, busy/double-tap guards, Back while printing, Arabic/Unicode/logo output, A4/80mm pagination, save/cancel/history and PDF sharing. Native build/linking, New Architecture and 16 KB behavior remain unproven by JS tests.
6. On an approved deployed HTTPS website, verify direct routes/reloads, session storage and back/forward restoration, install metadata across supported browsers, responsive layouts, cache headers, real CORS/API failures and web-push permission behavior. Verify WhatsApp on installed/mobile/web handlers and cross-client preparation synchronization in staging. Automated fixtures do not prove deployment configuration or another app opening.
7. Confirm public privacy/deletion URLs and support handling; complete accurate Data Safety, permission, rating/audience and reviewer-access forms. Verify Play listing/package/signing/versionCode, current account verification/production-access status and any applicable closed test. Perform final artifact manifest, ELF/RELRO/ZIP/16 KB and Play pre-launch review before submission.

No known unresolved BStore application code error remains in the audited scope. The zero-warning/release targets are not fully achieved: dependency/tooling advisories and Admin Doctor warnings remain, Admin Firebase/signing readiness is not verified, and physical/deployed/Console acceptance is outstanding. These limits are not waived by passing automated tests.

**PHASE 5 CODE AUDIT COMPLETE: YES**

**ZERO UNRESOLVED ACTIONABLE CODE ERRORS: YES**

**ZERO UNRESOLVED ACTIONABLE WARNINGS: NO**

**READY FOR APPROVED APK TEST BUILDS: NO**

**READY FOR GOOGLE PLAY SUBMISSION: NO**
