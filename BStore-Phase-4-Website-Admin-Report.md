# BStore Phase 4 website and admin report

Date: 15 October 2026

Final Admin push completion update: the authorized SDK installation and live lifecycle wiring are now complete and tested at code level. See **Final completion: standalone Admin push only** below for current results, exact files and external Firebase/device gates. Earlier validation and the initial push boundary below are retained as historical evidence. No other completed Phase 4 feature was modified in this follow-up.

Continued the existing uncommitted working tree without resetting or replacing earlier work. Phase 1, 1.1, 2 and 3 changes remain in place. Phase 5 has not started. The final follow-up installed only the authorized Admin Notifications SDK and its required dependencies. No credential creation/change, commit, push, deployment, APK/AAB generation, production-data modification or real notification send was performed.

## Task status

| Phase 4 task | Status and boundary |
| --- | --- |
| Customer installable website metadata | Implemented and locally validated: branded manifest/icons, Apple touch metadata and standalone display. Actual installation on deployed HTTPS Android/iOS remains manual. No service worker or new offline cache. |
| Customer responsive website | Implemented and browser checked at 320, 375, 412, 768, 1024 and 1440 pixels. Native/mobile card behavior and earlier virtualization retained. |
| Admin Panel Arabic notifications | Implemented; seven real Unicode draft/preview cases and exact submitted payload verified in Chrome. |
| Admin standalone APK push | **Code complete in the final follow-up below.** SDK/plugin, lifecycle, secure routing/registration and receipt handling are connected and tested. External Firebase configuration, approved native build and physical delivery remain unverified release gates. |
| Confirmed-products WhatsApp sharing | Implemented in both Admin clients against one read-only backend aggregate. Handler tests cover both clients; native WhatsApp handoff remains a device check. |

## Resume audit and final implementation

The working tree already contained the Phase 4 manifest/document, responsive layout changes, notification editor/preview, WhatsApp handlers, backend endpoint and push preparation. They were retained and exercised rather than restarted. Validation identified stale cross-project fixtures, a special-document route classification issue and incomplete browser fixture assumptions; these were corrected without changing pricing/authentication behavior or skipping tests.

The customer document references a BStore manifest with standalone display, root scope/start URL, theme/background colors, 192/512 icons and a maskable icon. The Apple touch icon is 180 pixels. Icons derive from the existing approved BStore artwork. Chrome parses the actual exported manifest without errors. There is no service-worker registration, new offline mode or persistent full-price cache. Real install availability varies by browser; headless manifest validation does not prove installation on a phone or deployment headers.

The web root centers bounded content: 560 pixels for authentication, 880 for Cart/Favorites/Checkout and 1120 elsewhere. Catalog grids use two columns on mobile, three at tablet widths and four on desktop. Column changes recreate the FlatList as required by its API; width changes may therefore reset that list's position. Back at an unchanged width retains the existing route/list behavior. Native grids remain two columns. Existing cards, product framing, cache services, shopping state and business calculations were retained.

Admin notification inputs and preview use browser `dir="auto"`, start alignment, plaintext bidi behavior and preserved multiline whitespace. Neither client preview nor backend reverses text or inserts directional controls. Backend validation still rejects blank/oversized content while preserving the accepted raw draft, including leading/trailing spaces, punctuation, numbers and emoji. Browser tests exercise Arabic-first and Latin-first mixtures, numeric prefixes and multiline content; payload tests verify exact characters.

Both Admin WhatsApp actions GET `/dashboard/confirmed-products/share` through their existing authenticated transport. That endpoint calls the same Confirmed-only, product-ID-grouped quantity aggregate used by the dashboard and merges the same saved preparation state. Prepared and unprepared rows are both shared. Distinct products with identical names retain identity labels; deleted references retain their IDs with an Unknown Product label. Empty results show feedback. A 1000-row formatter test verifies no truncation. No customer/private order fields enter the text.

Admin Panel reserves a popup during the click, URL-encodes the complete text and provides a link when popups are blocked. Large text exposes a complete selectable textarea and WhatsApp link. Admin App URL-encodes ordinary messages and falls back to the native share sheet for large lists or failed URL opening. WhatsApp itself controls destination selection and sending; no automatic send occurs. A missing native WhatsApp installation may open its web page rather than throw, so actual OS handoff still needs device acceptance.

Sharing performs no preparation, order, invoice, inventory or notification writes. Preparation continues using the pre-existing shared backend check endpoint. A saved checked flag is valid only while its saved quantity equals the current Confirmed aggregate quantity. Regression coverage verifies a changed quantity invalidates that flag while sharing remains read-only. Cross-client visibility occurs through existing dashboard refresh/focus fetches; no new real-time synchronization channel is claimed.

## Initial Admin APK boundary (historical; superseded by final completion below)

The installed Admin Expo **57.0.27** compatibility map, `admin-app/node_modules/expo/bundledNativeModules.json`, specifies **`expo-notifications ~57.0.22`**. It is absent from Admin App dependencies and node_modules. The config plugin is absent. Neither an Android google-services file nor `android.googleServicesFile` is configured. Existing EAS project identity and package `com.zeina43.adminapp` are present; remote FCM credentials were not accessed or verified.

Completed preparation:

- Android POST_NOTIFICATIONS permission declaration.
- Admin-only PUT/DELETE `/push/admin-device`, token validation and authenticated user scoping; unregister matches the supplied token so an old cleanup cannot erase a rotated token.
- Adapter core for Android physical-device checks, explicit project ID, channel creation before permission/token acquisition, permission gating and session checks before/after registration.
- Authenticated destination mapping for actual `new_order` and phone-verification event vocabularies.

**The core is not imported or invoked by RootLayout.** There is no active SDK registration, token-rotation subscription, logout unregister integration, foreground handler, response listener, cold-start response continuation or listener cleanup. Channel/permission code in a unit-tested unconnected function is not native lifecycle integration.

After explicit approval, the compatible dependency command is `npx expo install expo-notifications@~57.0.22` (not run). Add `"expo-notifications"` to `expo.plugins`; configure the correct Firebase Android app file through `android.googleServicesFile` and matching FCM v1 credentials for this existing EAS project. Existing expo-device and expo-constants can supply device/project identity. Wire authenticated restoration/login/foreground/rotation registration, matching-token logout removal, one foreground presentation handler, background/tap listeners and terminated-entry pending intent with readiness, auth, deduplication and cleanup guards. An updated native build and physical Android acceptance then remain mandatory.

Both existing admin send pipelines consume `User.expoPushToken`: new orders and phone-verification events. A valid standalone token/configuration is required for either to reach this APK. The existing field supports one registered device per admin, not a new multi-device registry. Legacy admin senders lack the customer's persisted delayed-receipt worker. Staging verification must inspect delayed receipts as well as tickets; ticket acceptance is not delivery. Detailed steps are in `admin-app/docs/Standalone-Push-Setup.md`.

## Validation results

| Command/check | Result |
| --- | --- |
| Customer `node --test scripts/*.test.cjs scripts/security-check.cjs` | **193 passed**, 0 failed/skipped; retains all 191 Phase 3 tests plus two Phase 4 tests. |
| Backend `npm test` | **72 passed**, 0 failed/skipped; includes read-only aggregation, quantity-change invalidation, Arabic payload and admin token ownership. |
| Admin Panel `node --test tests/*.test.mjs` | **68 passed**, 0 failed/skipped. |
| Admin App `node --test scripts/check-*.cjs scripts/phase4.test.cjs` | **169 passed**, 0 failed/skipped; includes five focused Phase 4 tests and all existing check scripts, including local Java USB lifecycle fixtures. |
| Customer and Admin App `node node_modules/typescript/bin/tsc --noEmit` | Both passed. |
| Customer `npm run lint` | 0 errors, 22 existing warnings. |
| Admin Panel `npm run lint` | 0 errors, 5 existing warnings in other files. Changed Dashboard/Notifications files have zero warnings both at HEAD and now. |
| Admin App lint | **Unavailable:** ESLint dependency/configuration is missing. Expo lint was not allowed to auto-install dependencies. |
| Customer fresh Expo web export | Passed, 27 static routes, `.navigation-check/web`. |
| Admin Panel `npm run build` | Passed; existing large-chunk advisory remains (main bundle approximately 1.04 MB before gzip). |
| Admin App Expo web export | **Failed:** static renderer raises `ReferenceError: window is not defined` from AsyncStorage access during module-level session-storage initialization. This initialization is unchanged from HEAD. No successful Admin App web export is claimed. |
| `git diff --check` in all four repositories | Passed; Windows line-ending notices are informational. |

The extra Admin App web export was attempted with `node node_modules/expo/bin/cli export --platform web --output-dir .phase4-web-check`. Metro bundled the server renderer, then failed before exporting routes. This existing web-static-render limitation is separate from the requested Android APK integration. No native build was attempted. Admin Panel/backend are JavaScript projects without a configured TypeScript check; backend has no configured build/lint script.

The expanded Admin suite exposed three stale cross-project expectations: Home's old loading guard, Search's incomplete token/cache fixture and an image-frame assertion expecting discounts in public cached metadata. The first two fixtures now reflect the existing progressive loaders/session subscription. The last now executes the real public projection and checks both image-frame preservation and omission of price/discount fields. No test was removed or skipped and no price was restored to public storage to satisfy an obsolete assertion. The security route scanner now excludes Expo's special `+html.tsx` document, which is not a navigable customer screen.

Browser suites, run sequentially against fresh local exports with fixture APIs:

| Suite | Checks / JavaScript exceptions |
| --- | --- |
| Customer Phase 4 responsive/manifest/auth entry | 18 / 0; 16 routes across six widths (96 viewport cases), tablet/desktop grid placement, populated Cart/Checkout, manifest/icons and protected guest entry. |
| Admin Panel actual Arabic editor/preview/send | 8 / 0. |
| Existing customer UI/checkout smoke | 25 / 0. |
| Phase 3 Offers/refresh | 4 / 0. |
| Navigation | 8 / 0. |
| Catalog | 5 / 0; all 600 products reachable, 24 mobile mounted cards and one Home-to-department product request retained. |

Total: **68 browser checks**, zero recorded JavaScript exceptions. Admin WhatsApp handlers are exercised with mocked window/Linking/Share and the actual backend route with model fixtures; no real WhatsApp message or notification was sent. Browser/test workers required execution outside the process-spawn sandbox. All data remained local/mocked.

Evidence is under `mystore/.navigation-check/`: `phase4-tests.txt`, `phase4-backend.txt`, `phase4-admin-panel-tests.txt`, `phase4-admin-all-tests.txt`, `phase4-admin-review-before.txt`, `phase4-admin-review.txt`, `phase4-admin-final-fix.txt`, `phase4-lint.txt`, `phase4-admin-panel-lint.txt`, `phase4-admin-lint-baseline.json`, `phase4-export.txt`, `phase4-admin-panel-build.txt`, `phase4-admin-app-tsc.txt`, `phase4-browser-results.json`, `phase4-admin-browser-results.json`, `phase3-browser-results.json`, `browser-results.json` and `catalog-after.json`. Existing UI browser results remain in `.release-check/ui-ux-browser-results.json`. Admin web export's failure is recorded above; it is not included among successful export evidence.

## Exact Phase 4 files changed

This lists Phase 4 work, not every file in the combined uncommitted diff from earlier phases.

| Repository / file | Purpose |
| --- | --- |
| mystore/src/app/+html.tsx | Web document, install metadata, bounded input/focus CSS. |
| mystore/public/manifest.webmanifest | Standalone BStore manifest. |
| mystore/public/icons/bstore-192.png | Branded 192 icon. |
| mystore/public/icons/bstore-512.png | Branded 512 icon. |
| mystore/public/icons/bstore-maskable-512.png | Maskable icon with safe artwork margin. |
| mystore/public/icons/apple-touch-icon.png | Apple touch icon. |
| mystore/src/app/_layout.tsx | Web-only centered content widths. |
| mystore/src/app/category-products.tsx | Responsive virtual grid column count. |
| mystore/src/app/department-categories.tsx | Same responsive columns. |
| mystore/scripts/security-check.cjs | Recognize special web document separately from routes. |
| mystore/scripts/phase4.test.cjs | Manifest/icon/no-new-service-worker coverage. |
| mystore/scripts/phase4-browser.cjs | Responsive/manifest/protected-entry browser checks. |
| mystore/BStore-Phase-4-Website-Admin-Report.md | This report. |
| admin-panel/src/pages/Notifications.jsx | Exact bidi draft and preview. |
| admin-panel/src/pages/Dashboard.jsx | Read-only WhatsApp sharing and complete-text fallbacks. |
| admin-panel/tests/phase4.test.mjs | Sharing and bidi regressions. |
| admin-panel/tests/phase4-browser.cjs | Real Unicode browser editor/preview/send coverage. |
| admin-app/app.json | Android notification permission preparation only. |
| admin-app/src/app/dashboard.tsx | Read-only WhatsApp action/native fallback. |
| admin-app/src/services/admin-push-core.ts | Unconnected registration/destination adapter core. |
| admin-app/docs/Standalone-Push-Setup.md | Exact compatible SDK and incomplete native integration checklist. |
| admin-app/scripts/phase4.test.cjs | Core and actual share-handler regressions. |
| admin-app/scripts/check-review.cjs | Current Home/Search fixtures. |
| admin-app/scripts/check-image-frame.cjs | Execute metadata projection; preserve framing without private prices. |
| backend/routes/adminRoutes.js | Preserve accepted exact notification text. |
| backend/routes/dashboardRoutes.js | Admin-only read aggregate sharing endpoint. |
| backend/services/confirmedProductsShare.js | Full identity-safe product/quantity formatting. |
| backend/routes/pushRoutes.js | Admin token registration/removal preparation. |
| backend/tests/security.test.js | Four focused Phase 4 tests alongside earlier coverage. |

## Preservation and remaining acceptance

All four Phase 1 navigation fixes remain covered by router/handler tests and browser flows: retained product/category Back, authorized order notification parents/login continuation, Settings Back and empty Orders Start Shopping. Phase 1.1 Class C empty-cart progress, Phase 2 cache/session/class isolation and virtualized lists, and Phase 3 status-bar/shade/carousel/compact-cart changes remain intact. No pricing class assignment, A/B/C percentage, threshold, delivery/free-delivery rule, discount formula, cart/checkout total, inventory operation or order-status rule changed in Phase 4.

Before release, verify on an approved deployed HTTPS test site that manifest/icon MIME types and direct routes work, Android Chrome installation opens standalone and iOS Add to Home Screen uses the BStore icon. Repeat login/logout/protected entry, checkout and refreshed prices in standalone mode. No production install/deployment was tested here.

Use physical Android/iOS/tablet/desktop browsers to check touch, keyboard/large fonts, rotation and long names at the requested widths; preserve mobile appearance and test long virtual lists after details Back and resizing. On actual Admin devices verify WhatsApp unavailable/installed, cancelled sharing, large/Arabic product lists and no preparation changes. Refresh the other Admin client after marking a product prepared, then alter Confirmed quantities in staging and confirm both clients reflect invalidation on refresh. Browser bidi tests do not replace a human Arabic typography review.

At the initial handoff, Admin APK push was blocked on dependency installation and integration. Those code steps are now completed below. Firebase credentials, an approved new native build and physical Android acceptance remain required. No device delivery claim is made.

Stopped at Phase 4 with those explicit outstanding items. No Phase 5 or release action was performed.

## Final completion: standalone Admin push only

This follow-up reused the existing registration endpoint and adapter. Customer PWA/responsive code, Admin Panel Arabic editing and WhatsApp implementations were not edited or reimplemented. Earlier uncommitted work was retained. Only Admin push implementation, related security/fixtures and this documentation changed.

### Connected implementation

`RootLayout` now invokes `useAdminPush`, which connects the real Expo SDK to the previously prepared core. Android physical devices create the `default` channel before requesting permission and acquiring an Expo token with the existing Admin EAS project ID. Registration waits for authenticated restoration/login and navigator readiness. Session events, foreground revalidation and native token rotation share one controller. Concurrent work is serialized; identical session/token registration is deduplicated. Failed registration and recoverable pending-tap validation use bounded backoff; manual retry remains available. Denied permission exposes Enable Admin notifications, including Android Settings when the OS cannot ask again. Foreground return detects subsequent approval.

Explicit logout calls token removal before local clearing/server revocation. Cleanup always retains the original owner's identity, refreshing that exact session only while current. Account replacement removes the previous binding and registers the new one. Late registration completion checks session/generation ownership and removes stale results. Removal failures do not prevent logout; backend session revocation independently suppresses eligibility. Unmount removes SDK response/receipt/token listeners, AppState/session/logout subscriptions, handler ownership and retry timers. An ordinary unmount does not intentionally unregister a still-valid device.

Foreground notification presentation validates the admin context, payload and recipient, suppresses duplicates and avoids badges. Visible remote notifications in background/terminated states use the installed SDK's native `ExpoFirebaseMessagingService`; these are alert pushes, not a new silent/background task. Background taps and `getLastNotificationResponse()` cold entry use the same processing path. Receipt without a tap never navigates.

Tap handling accepts known types and valid IDs, rejects arbitrary URLs/malformed IDs/dismiss actions, checks `adminId` against the authenticated owner, validates the current session through the authenticated transport, and waits for a ready protected navigator. Signed-out or recoverably offline taps remain pending for authentication/retry. Duplicate SDK/cold callbacks navigate once. A handled native response is cleared only if it is still the matching response; explicit logout also clears its saved response.

For `new_order`, the history becomes Dashboard > Orders, and validated `orderId`/response parameters open the **existing authenticated Order Details modal** with the actual order ID. Closing/hardware Back exposes Orders, then Dashboard. The implementation does not invent a second details screen. Phone event types `phone_verification`, `REGISTER`, `RESET_PASSWORD` and `CHANGE_PHONE` open **Phone Verification**, with Dashboard beneath it. Login/Index redirect completion is allowed before a push resets the protected stack, preventing a competing startup redirect from overwriting the destination. Notification data never supplies order contents or bypasses backend authorization.

### Backend verification and security

The existing `/orders/create` route calls `sendOrderNotificationToAdmins` only after checkout commit and only when `result.replayed` is false; its order/pricing path was not edited. Actual registration, resend/password-reset and change-phone controller paths call `sendAdminPushNotification` with REGISTER/RESET_PASSWORD/CHANGE_PHONE. The legacy phone-verification service is also supported. Tests execute both sender implementations with mocked Expo transport and validate actual event IDs, recipient fields and channel metadata.

Existing PUT/DELETE `/push/admin-device` remain authenticated/admin-only. PUT now reuses the existing atomic device/session generation guard, so an older session cannot reclaim a device owned by a newer login. Admin-only User metadata records the session ID/start time; conditional updates prevent an older login overwriting newer notification ownership. DELETE matches the original user, token and session, so old logout/rotation cleanup cannot erase replacement ownership. Client-supplied user/session IDs are ignored. Tests run the actual middleware and verify unauthenticated/customer rejection, authenticated scoping, stale-registration conflict and constrained removal.

Admin sends require a live, unexpired session with the current credential version and the matching atomic device owner, in addition to the existing admin role/notification preference selection. Legacy unbound admin tokens must register through the new lifecycle before receiving private pushes. Existing single-device-per-admin behavior is retained. Customer notification service code/endpoints were not changed; its existing device ownership helper is reused by the Admin endpoint.

Successful Admin ticket IDs are persisted in `AdminPushReceipt`. The existing server timer now also runs an isolated Admin receipt check: first check after 15 minutes, bounded batches, missing-receipt rechecks and 24-hour retention. DeviceNotRegistered cleanup matches the original token/session. InvalidCredentials and other receipt errors are reported by error code without token output and do not delete valid registrations. Accepted tickets are not treated as confirmed delivery. Failed sends are not blindly replayed, which avoids generating duplicates after ambiguous network failures; push delivery remains best effort and the authorized order/verification lists remain the source of truth. No production sends or database operations occurred during validation.

### Dependency, native configuration and external readiness

Installed with `npm install expo-notifications@~57.0.22 --ignore-scripts` in **admin-app only**. The installed Expo 57.0.27 compatibility map specifies that range; the lock resolves Notifications **57.0.23**. Required additions are expo-application 57.0.3 and badgin 1.2.3; Notifications requires expo-constants ~57.0.22, so its installed resolution moved from 57.0.21 to **57.0.22** while the existing top-level compatible range remains unchanged. No unrelated upgrade or audit fix was run. Existing printer patches were preserved. npm reported 41 dependency-tree vulnerabilities (14 moderate/27 high); that installer summary is not an attribution to Notifications, and broader dependency remediation was outside this push-only task.

The Expo Notifications config plugin sets `defaultChannel: "default"`; Android POST_NOTIFICATIONS remains declared. `app.config.js` maps an approved **file** environment variable `ADMIN_GOOGLE_SERVICES_FILE` to `android.googleServicesFile` when supplied. The evaluated package remains **com.zeina43.adminapp**, project **96f34cc8-d72f-4b0c-8242-b86661288728**. Existing EAS development/preview/production profiles were inspected and retained without credential access.

No Google Services file is present/configured locally. Supply the Firebase Android client file matching that exact package/project through the approved file variable. The matching Firebase project's FCM v1 service-account credential and Messaging API/permissions must be configured for the existing Admin EAS project. Remote credentials were not accessed and therefore are **unverified**, rather than asserted absent. No production credential was created, replaced, uploaded or modified. If Expo push access-token enforcement is enabled remotely, its server-side authentication also needs an authorized readiness check.

Config introspection successfully evaluates plugin/permission/default-channel metadata without writing a native project or generating an APK. It cannot establish native compilation or FCM credential validity. A separately approved native build containing the SDK/plugin/Firebase configuration and physical-device delivery acceptance remain mandatory.

### Final push-only validation

| Command/check | Final result |
| --- | --- |
| Admin App `node --test scripts/check-*.cjs scripts/*.test.cjs` | **182 passed, 0 failed/skipped**: all previous 169 tests plus 13 meaningful push tests. |
| Backend `npm test` | **78 passed, 0 failed/skipped**: all previous 72 tests plus six Admin push tests. The new file is included in the npm test script. |
| Admin App `node node_modules/typescript/bin/tsc --noEmit` | Passed. |
| `node node_modules/expo/bin/cli config --type public --json` | Passed; package, project, plugin and missing local Google Services configuration checked. |
| `node node_modules/expo/bin/cli config --type introspect --json` | Passed; generated-in-memory Android POST_NOTIFICATIONS and Firebase default-channel metadata asserted. Installed SDK native manifest includes Firebase messaging service and notification response components. |
| `git diff --check` | Passed in Admin App, backend and report/customer repositories; existing Windows line-ending notices remain informational. |

The 13 push tests exercise permission denial/approval/revocation, registration deduplication, restoration readiness, logout, delayed completion, account switching/rotation, backoff/timer cleanup, payload/recipient validation, cold/background duplicates, expired/offline session routing, actual transport logout ordering, native configuration, the real hook with SDK/AppState/session lifecycle fixtures, and actual Orders detail invocation. Six backend tests exercise live session/device/credential eligibility, tickets/receipts, missing receipts and credential errors, actual new-order/phone senders, actual authentication-event senders, and real middleware/token ownership.

Existing fixture extensions mock the new push hook/logout bridge for unrelated screen/transport tests. Their assertions remain intact; the new suite separately executes the real implementations. The previous Phone route assertion now expects the requested Phone Verification screen. No test was removed or skipped. No Customer or Admin Panel implementation was modified. Their earlier web/browser evidence above remains historical; these unrelated browser suites were not rerun for this push-only follow-up. Admin App lint remains unavailable without its pre-existing missing ESLint setup; no unrelated dependency was installed for lint. Earlier Admin web-static-render limitation is outside this Android push task.

Final evidence: `.navigation-check/admin-push-admin-tests.txt`, `admin-push-backend.txt`, `admin-push-tsc.txt`, `admin-push-native-config.json` and `admin-push-introspect.json`. Test workers required execution outside the process-spawn sandbox, using fixture SDK/network/database operations only.

### Exact files changed in this final follow-up

| File | Change |
| --- | --- |
| admin-app/package.json | Authorized compatible Notifications dependency. |
| admin-app/package-lock.json | SDK and strictly required dependency resolutions. |
| admin-app/app.json | Real Notifications plugin/default channel. |
| admin-app/app.config.js | Optional approved EAS Google Services file reference. |
| admin-app/src/app/_layout.tsx | Invoke real lifecycle and permission/retry controls. |
| admin-app/src/hooks/use-admin-push.ts | SDK adapter, auth/native lifecycle, foreground/tap handling, routing and cleanup. |
| admin-app/src/services/admin-push-core.ts | Reused registration core; validated intents, deduplicated controller, guarded retries/session transitions. |
| admin-app/src/services/admin-push-logout.ts | Logout bridge without circular native/transport dependency. |
| admin-app/src/services/admin-api.ts | Bind logout bridge; expose bounded raw removal transport. |
| admin-app/src/services/auth-transport.ts | Best-effort pre-revocation removal hook. |
| admin-app/src/app/orders.tsx | Open existing actual order detail from validated notification params once. |
| admin-app/scripts/admin-push.test.cjs | Thirteen focused core/hook/native/route/transport regressions. |
| admin-app/scripts/phase4.test.cjs | Correct dedicated Phone Verification destination assertion. |
| admin-app/scripts/check-admin.cjs | New hook/bridge dependencies in existing screen fixtures. |
| admin-app/scripts/check-final-fix.cjs | Load actual new logout bridge in transport fixture. |
| admin-app/scripts/check-review.cjs | Locate retained Stack guards beneath the new root notification control wrapper. |
| admin-app/docs/Standalone-Push-Setup.md | Connected implementation and exact external/device acceptance steps. |
| backend/routes/pushRoutes.js | Reuse atomic ownership; session/start-time guards and matched removal. |
| backend/models/User.js | Non-default-selected Admin push session metadata. |
| backend/models/AdminPushReceipt.js | Separate persisted Admin receipt jobs. |
| backend/services/adminPushDelivery.js | Eligibility, tickets, delayed receipts and conditional invalid-token cleanup. |
| backend/services/notificationService.js | Actual Admin order/legacy phone sender integration. |
| backend/controllers/authController.js | Actual phone-purpose Expo sender integration; browser push recipients retained. |
| backend/server.js | Run Admin receipt processing in existing worker cadence. |
| backend/tests/admin-push.test.js | Six sender/receipt/session/authorization regressions. |
| backend/tests/security.test.js | Extend existing endpoint fixtures/assertions for real session ownership. |
| backend/package.json | Include new Admin push file in standard npm tests. |
| mystore/BStore-Phase-4-Website-Admin-Report.md | This completion update; other completed features retained. |

### Physical Android acceptance and remaining limits

No known unresolved Admin push code defect remains after these checks. This is code-level completion, not release readiness or proof of physical delivery. Missing local Google Services configuration, unverified remote FCM credentials and the unperformed native build/device checks are explicit external gates. SDK/native lifecycle fixtures cannot prove OS presentation, vendor background policies, real tap timing or delivery. Already in-flight notifications may still appear after logout even though future sends reject the revoked session.

After separate credential/build/send approval, use a staging standalone APK on a physical Android device. Verify remembered/nonremembered restoration; permission grant/denial/settings approval; offline retry; both order and each verification-purpose push in foreground/background/terminated states; correct order details and modal/list/dashboard Back; verification/dashboard Back; signed-out/expired login continuation; duplicate callbacks; account/device replacement and delayed token rotation; online/offline logout; and delayed receipt/invalid-credential handling. Inspect tickets and delayed receipts independently. No real production notification should be used for acceptance.

All earlier phases and completed Phase 4 features remain uncommitted and preserved. No commit, push, deployment, APK/AAB, production-data/credential operation or Phase 5 work occurred.

**PHASE 4 CODE COMPLETE: YES**
