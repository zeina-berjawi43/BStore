# BStore Phase 3 customer UI and notifications report

Date: 15 October 2026

Continued from the existing uncommitted working tree. Earlier Phase 1, 1.1 and 2 changes were retained; no checkout/reset or replacement of those changes was performed. Phase 4 has not started. No commit, push, deployment, APK/AAB, production-data modification or real notification send was performed.

## Audit when work resumed

The diff contained implementation for all six tasks, with validation unfinished. Offers pagination and refresh code were present. Cart/Favorites had the new X actions and shared dimensions, but screenshot review later identified a remaining height difference for discounted cards. Android status styling, saved-order notification text, and Android shade dismissal were present but needed focused tests. The saved customer test log showed three integration failures; corrections for their changed UI assertions and StatusBar mock were already in the working tree and were retained.

## Root causes and final behavior

### 1. Offers pagination

Home rendered only the first six dots even when the carousel contained more offers. The carousel published its logical index only after settling, and Home reset its active dot on every offers response even when the carousel's unchanged item IDs kept the existing page mounted.

Dots now map every real offer, with stable offer IDs, one dot for a single offer and no dots for zero offers. Active index follows the nearest logical page during scrolling, including duplicated loop endpoints, while the existing settling/wrapping/autoplay behavior remains. Collection or measured-width changes remount the keyed pages safely; the dot's rendered index is clamped to the current collection. The unnecessary response-time index reset was removed. Dot rows wrap if needed. Native accessibility selection and explicit web aria-selected stay synchronized. Card sizes, spacing inside the carousel, images, navigation and gestures were retained.

### 2. Cart and Favorites compact layout

Cart's Remove row consumed card height; Favorites used different image dimensions and a separate action beside Add to Cart. Class C's fixed summary also duplicated totals using large subtotal/delivery rows, a divider and an item count already shown in the header.

Both screens now use a shared base layout: 140-point minimum card height, 96 × 96 image slots, 10-point padding/spacing and a 44 × 44 top-right X target. Cards can grow for larger fonts or longer content. Cart's discount badge now sits in available space beneath its image rather than consuming another information row; its existing colors and discount wording remain. Favorites retains its existing badge treatment. The final browser check verifies equal card width and height for the matching fixture product.

X actions have product-specific accessibility labels. Cart delegates to the existing shared removal action and pending guard; Favorites stops propagation and removes the correct favorite without opening details. Existing quantity editing, Add to Cart, availability, names, prices, discounts, image framing and optimistic rollback remain.

The summary retains a prominent Total. A single compact line appears only when the actual delivery fee is positive, for example `$56.05 subtotal + $4.00 delivery = $60.05`. At zero delivery fee, that line is absent: it contains no zero delivery amount or delivery wording. The removed rows/divider and duplicate item count are not rendered. Padding and checkout-button spacing are reduced. Class C's minimum/free-delivery labels, both progress tracks, warnings, exact `#039320` green, `get FREE delivery` wording and checkout eligibility remain intact, including the empty-cart progress repair.

### 3. Home refresh feedback and slideshow reset

Home already used native RefreshControl, but the web equivalent did not provide usable pull feedback. Section loaders swallowed failures, so the refresh caller could not determine whether a refresh actually succeeded. The slideshow lacked an explicit success-only reset mechanism.

Native pull and the visible Refresh Home control now invoke the same real loader. The control displays an animated ActivityIndicator while loading and gives web users a supported refresh action. A promise guard deduplicates concurrent refresh gestures/taps. Section loaders report success/failure; the aggregate waits for every requested section with Promise.allSettled, including when one fails early. Success resets the slideshow index and its local pager key to the first banner. Failure preserves cached content and the slideshow's retained position and displays retry feedback. The outer Home ScrollView is not scrolled or remounted. Existing section caches, complete price snapshots and session guards remain in use.

### 4. Android status bar

The startup component owned a temporary dark StatusBar, but there was no persistent root StatusBar across startup and navigation. Theme-dependent fallback could therefore expose light icons on the approved light backgrounds. The native stack already had Android dark styling; that alone did not cover the pre-stack startup period.

The root now mounts Android's persistent Expo StatusBar with `style="dark"`; the native stack retains matching `statusBarStyle: 'dark'`. The temporary startup declaration was removed. Expo config sets `androidStatusBar.barStyle` to `dark-content` for native startup configuration. Existing safe-area edges, backgrounds, header layout and padding were not changed. Web does not mount the native status-bar component. Native config changes require an appropriately updated native build before release; no build was generated in this task. Automated tests verify configuration and absence of conflicting screen overrides; actual Android icon visibility remains a device acceptance item.

### 5. Order-status notification text and destination

The authenticated admin status route saved the new status but sent fixed generic text. Both Admin Panel (`src/pages/Orders.jsx`) and Admin App (`src/app/orders.tsx`) use `/orders/admin/:orderId/status`, so this was the shared path to fix.

The route now builds the notification from the saved order: `Your order #123 is now Shipped. Click to view.` It uses the customer's own customerOrderNumber, with the actual order ID as fallback for an unnumbered historical order. The payload carries only type, actual order ID and saved status; the existing push service adds the recipient ID for its ownership guard. It does not add names, addresses, phones, prices or payment details. All existing statuses remain valid: Pending, Confirmed, Preparing, Shipped, Delivered and Cancelled. An unchanged status produces no additional push.

The existing push send service, preference/device/session checks, retry/receipt handling and notification data/history behavior were preserved. Tests mock sending; no Expo production send occurs. Customer-initiated cancellation already changes Pending to Cancelled without sending this admin-status push; that behavior was not expanded. Invoice save/cancel paths update invoiceStatus rather than order.status and were inspected without modification.

Phase 1 routing remains responsible for the destination: pending signed-out tap retention, recipient validation, authenticated backend order ownership, duplicate handling and Order Details > Orders > Home. The added status field is display context, not authorization or a client-side source of order truth.

### 6. Android notification shade dismissal

The tap handler cleared the saved response after routing authorization but did not dismiss other presented notifications.

It now invokes a response-specific helper immediately after accepting a tap for processing, before the signed-out branch. On Android, Expo Notifications.dismissAllNotificationsAsync dismisses this application's currently presented notifications. It cannot dismiss another application's notifications. The tapped response remains available for authentication continuation; the saved response is still cleared by the existing Phase 1 flow only when appropriate. Reprocessing the same response during login continuation does not repeat shade dismissal. A dismissal error is swallowed so destination routing can proceed.

This helper is called only from response processing, never ordinary app startup/foreground activation without a pending tap. It does not call any backend history/read endpoint, change the in-app notification setting, mark history read, clear badges, delete channels or cancel scheduled future notifications. iOS and web intentionally skip Android bulk dismissal. Cold/background/foreground response entry uses the same existing handler. Real tray timing, vendor behavior and permission states require Android device validation.

## Regression protection and business rules

No pricing helper, pricing percentage, class assignment rule, minimum threshold, delivery fee/free-delivery calculation, order total, checkout validation or authorization rule was changed. Cart and Favorites render server/shared-state values; checkout and backend totals remain authoritative. Browser cases cover paid/zero delivery, exact and exceeded thresholds, below-minimum states and A/B eligibility without Class C progress. Existing pricing/security suites retain A/B/C coverage.

All four Phase 1 navigation repairs and Phase 1.1 empty Class C progress remain covered. Phase 2's virtualized department/category grids, cache freshness/eviction, request deduplication, background revalidation, stable filters and session/class price invalidation were retained. No cache service, catalog hook or virtualized catalog screen was changed for Phase 3.

## Validation results

Commands run locally:

| Check | Result |
| --- | --- |
| Customer: `node --test scripts/*.test.cjs scripts/security-check.cjs` | 191 passed, 0 failed/skipped; all 182 Phase 2 tests plus nine focused Phase 3 tests. |
| Backend: `npm test` from backend/ | 68 passed, 0 failed/skipped; all 66 prior tests plus two saved-status/content tests. |
| Targeted navigation, carousel interaction and Phase 3 UI suite | 36 passed. |
| TypeScript: `node node_modules/typescript/bin/tsc --noEmit` | Passed. |
| Lint: `npm run lint` | 0 errors, 22 warnings. Remaining existing hook-dependency, unused-code/import and directive warnings. |
| Fresh Expo web export to `.navigation-check/web` | Passed, 27 static routes. This is a local export, not a deployment or Android build. |
| `node scripts/ui-ux-browser-smoke.cjs` with BSTORE_WEB_EXPORT pointing to the fresh export | 25 checks passed, 0 JavaScript exceptions; includes matched Cart/Favorites card heights, X targets/actions, quantities, A/B/C delivery/eligibility, checkout, carousel gestures/autoplay and responsive layout. |
| `node scripts/phase3-browser.cjs` | 4 checks passed, 0 JavaScript exceptions: eight dots, widths 320/412/1024, dynamic 8 > 1 > 0 > 8 offers, animated/deduplicated success refresh and failed-refresh preservation. |
| `node scripts/navigation-browser.cjs` | 8 checks passed, 0 JavaScript exceptions, including notification login continuation, order parents, retained category/scroll and Settings/Start Shopping history. |
| `node scripts/catalog-browser.cjs` | 5 checks passed, 0 JavaScript exceptions: all 600 products retained, both 300-product category endpoints reachable, complete cached prices, scroll retention, stale revalidation and offline retry. Mounted department cards remain 24; Home-to-department catalog reads remain one. |
| `git diff --check`, customer and backend repositories | Passed after removing two trailing-whitespace lines. Windows line-ending conversion notices remain informational. |

All four browser suites total 42 successful checks with zero recorded JavaScript exceptions. The catalog run's timing and total DOM counts are recorded in catalog-after.json; this phase makes no new FPS or Android performance claim from those noisy synthetic timings.

New coverage includes actual refresh-handler success/failure/rejection/deduplication, aggregate partial failure with slow sections, dynamic pagination/clamping, swipe-time selection, native status-bar config, shared card dimensions, Android-only shade API calls/failure/deduplication, and each actual saved status through the backend route. Existing assertions were updated for the requested X and compact summary rather than deleted or skipped.

The broader browser script also needed its outdated auth fixture changed to the existing session-storage format, an explicit Account selector after adding Refresh Home, a wait for complete price hydration, and its obsolete `enjoy FREE delivery` expectation aligned to the application's approved `get FREE delivery` wording. Those changes affected tests, not authentication, pricing or checkout behavior. A new A/B Checkout assertion was corrected to select the existing focusable control rather than assuming a role it does not declare.

All browser backend requests use local responses, including the mock order-placement acceptance path. Backend tests use mocks, not production databases or real notifications. Local process-spawn restrictions required running test workers and headless Chrome outside that sandbox. No external data mutations were involved.

Evidence: `.navigation-check/phase3-tests.txt`, `phase3-backend.txt`, `phase3-lint.txt`, `phase3-export.txt`, `phase3-browser-results.json`, `browser-results.json`, `catalog-after.json`; `.release-check/ui-ux-browser-results.json`, `phase3-cart.png` and `phase3-favorites.png`. Screenshots were reviewed during the card-size adjustment.

## Exact Phase 3 files changed

Earlier phases remain uncommitted too; this list describes Phase 3 additions to that working tree, not the entire diff against HEAD.

| Repository / file | Purpose |
| --- | --- |
| mystore/app.json | Android startup dark-content status icons. |
| mystore/src/app/_layout.tsx | Persistent Android status bar and tap-only shade dismissal; existing secure navigation retained. |
| mystore/src/app/index.tsx | Complete Offers dots/selection, real refresh feedback, aggregate outcome and success-only slideshow reset. |
| mystore/src/app/cart.tsx | Compact shared card, accessible X, discount placement, compact summary and reduced spacing. |
| mystore/src/app/favorites.tsx | Matching shared card/image dimensions and accessible X without details navigation. |
| mystore/src/components/shopping-card-layout.ts | Shared card/image spacing and 44-point corner target. |
| mystore/src/components/paged-carousel.tsx | Optional local reset key for successful slideshow refresh. |
| mystore/src/components/startup-screen.tsx | Remove temporary screen-level status ownership. |
| mystore/src/hooks/useOfferCarousel.ts | Publish logical selection during scrolling while retaining loop/autoplay behavior. |
| mystore/src/hooks/use-home-section.ts | Report refresh success/failure without dropping cached content. |
| mystore/src/services/pushService.ts | Android presented-notification dismissal with duplicate guard and safe failure. |
| mystore/scripts/customer-interactions.test.cjs | Assert active carousel selection before momentum settles. |
| mystore/scripts/final-polish.test.cjs | Preserve removal/price/progress coverage with new X and exact fee breakdown assertions. |
| mystore/scripts/security-check.cjs | StatusBar fixture and Android-only dismissal/no-history tests. |
| mystore/scripts/navigation.test.cjs | Retain secure tap routing tests and verify duplicate responses dismiss once. |
| mystore/scripts/navigation-browser.cjs | Select Account explicitly now that Home also has a refresh action. |
| mystore/scripts/ui-ux-browser-smoke.cjs | Current auth fixture, compact summary/X/card geometry and A/B/C browser regressions. |
| mystore/scripts/phase3-ui.test.cjs | Seven focused UI/refresh/status-bar tests. |
| mystore/scripts/phase3-browser.cjs | Four focused dynamic Offers/refresh browser checks. |
| mystore/BStore-Phase-3-UI-Notifications-Report.md | This report. |
| backend/routes/orderRoutes.js | Use the saved order's actual status notification content. |
| backend/services/orderStatusNotification.js | Safe message/payload construction with customer order number/ID. |
| backend/tests/security.test.js | Saved route transitions, duplicate suppression, invalid statuses and private-field-free fallback content. |

## Android acceptance checklist and remaining limits

No Android device/emulator interaction, installed Google Play build, real push delivery or live production account was tested. Automated handler/API mocks do not prove system shade or icon rendering.

1. Check clock, battery and notification icons against every light screen in Android light and dark system themes: cold startup, login/OTP, Home, Search, Favorites, Cart, Settings, Orders, Order Details, Product Details and Checkout. Repeat after background/foreground, rotation and native permission/dialog transitions. Confirm edge-to-edge rendering without added blank insets or header movement.
2. On an existing suitable test build, swipe Offers in both directions across loop endpoints; verify more than six offers, zero/one offers and width changes. Pull Home to refresh; verify a visible native indicator, banner one on success, retained banner/content on failure and no outer-page jump. Web uses the explicit Refresh Home control.
3. Use A/B/C test accounts to inspect Cart/Favorites at narrow and wide widths and with enlarged fonts. Verify X touch targets, long names, quantity editing, Add to Cart, pending guards and rollback. Test minimum, charged delivery, zero-fee and free-threshold transitions; compare checkout totals to server results and check `get FREE delivery`, green progress and empty Class C progress.
4. Update an order using both Admin clients in a nonproduction environment. Verify the actual status/order number, unchanged-status suppression, and no private profile fields in pushes. Tap with app terminated, backgrounded and foregrounded; confirm actual Details > Orders > Home history and recipient/backend ownership restrictions. Repeat signed out, expired, after switching accounts and through login/OTP continuation.
5. Present several BStore notifications plus a notification from another app. Tap a BStore notification; confirm the other BStore presented notifications disappear while the other app remains. Confirm the intended order still opens, in-app state/history/read state are unchanged, future scheduled notifications remain scheduled, manual app opening does not bulk-dismiss, and duplicate callbacks do not navigate twice. Repeat signed out, with permissions denied/re-enabled, and on relevant Android vendors/versions.
6. Repeat retained category/scroll Back, Settings/Notifications Back, empty Orders Start Shopping and long Personal Care Shampoo/Hair Care/ALL scrolling/background revalidation. Device acceptance remains required before release.

References consulted: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Expo Notifications dismissal API](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/#dismissallnotificationsasync), [Expo StatusBar](https://docs.expo.dev/versions/v57.0.0/sdk/status-bar/). Installed Expo/RN implementations were also inspected for API and edge-to-edge status-bar behavior.

Stopped at Phase 3. Release/build/production actions remain unperformed.
