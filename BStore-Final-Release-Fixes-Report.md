# BStore Final Release Fixes

Date: 2026-10-17. Status reflects implementation and the verification below; physical Android acceptance remains outstanding.

| Task | Status | Result |
| --- | --- | --- |
| 1. Pricing class names | Completed | Both admin clients resolve names from backend configuration; immutable IDs remain filter/save values. Legacy A/B/C and missing definitions have safe labels. Dynamic filtering, editing, saving and refreshed names are tested. |
| 2. Uniform product cards | Completed | Shared reserved title/price areas and right-aligned controls stabilize Home, category/department/offer grids and Search; related compact cards reserve their own consistent rows. |
| 3. Offers carousel | Completed | Orange Add and quantity selector share their footprint; zero restores Add. |
| 4. Favorites clipping | Completed | Compact consistent cards contain full Add text and quantity controls, including narrow layouts. |
| 5. Cart reliability | Completed | Immediate optimistic quantities retain rapid taps and zero/re-add intents; ordered reconciliation and current-intent feedback prevent stale results. |
| 6. Notification toggle | Completed | Immediate latest-intent state, serialized persistence, guarded initial reads, visible failures and safe reconciliation are integrated into the screen. |

## Root causes

Cart handlers suppressed taps while requests were pending, including the first re-add after zero. Mutation readiness also waited for unrelated Favorites loading. Success feedback depended on eventual request completion. Controls now retain absolute quantity intents, wait only for cart readiness, and subscribe to each product's quantity. Confirmation updates the existing active feedback notice only while its action is current; expired notices are not revived.

Notification controls used busy/loading guards and request-driven state, allowing slow initial reads and acknowledgements to conflict with newer selections. A session-scoped preference store now displays intent immediately, coalesces writes, rejects stale responses and rolls back current failed intent visibly. Device registration waits for settled saved state. Existing Android permission/token logic is retained. Web changes the account's Android notification preference and explicitly states that browser push is unavailable. The existing master preference was preserved; no independent categories were invented.

## Modified files by repository

- **admin-panel:** `src/pages/Users.jsx`, `src/components/CustomerClass.jsx`, `src/utils/pricing-class.js`, `tests/users.test.mjs`.
- **admin-app:** `src/app/users.tsx`, `src/services/pricing-class.ts`, `scripts/check-admin.cjs`, `scripts/customer-class-names.test.cjs`.
- **mystore screens:** `src/app/index.tsx`, `category-products.tsx`, `search.tsx`, `favorites.tsx`, `notifications.tsx`.
- **mystore shared code:** `src/components/add-to-cart-button.tsx`, `quantity-selector.tsx`, `product-feedback.tsx`, `product-card-layout.ts`; `src/hooks/use-shopping.ts`; `src/services/shopping-state.ts`, `notification-preference.ts`.
- **mystore verification:** `scripts/comprehensive-browser.cjs`, `release-browser.cjs`, `comprehensive.test.cjs`, `customer-interactions.test.cjs`, `final-polish.test.cjs`, `shopping-state.test.cjs`, `notification-preference.test.cjs`; this report.
- **backend:** no changes.

## Verification results

| Check | Actual result |
| --- | --- |
| Customer `node --test scripts/*.test.cjs` | 143 passed, 0 failed |
| Backend `npm test` | 83 passed, 0 failed |
| Admin Panel Users + final-polish tests | 13 passed, 0 failed |
| Admin App customer-class names + pricing settings tests | 7 passed, 0 failed |
| Customer and Admin App TypeScript | Passed |
| Customer source and touched admin source lint | Passed |
| Admin Panel production build | Passed |
| Customer Expo Web production export | Passed |
| Headless browser checks against final Web export | 16 scenarios passed; no runtime errors |

Browser scenarios used mocked API responses and checked Home, category grids, Search, Favorites and Offers carousel at 320/412/1024 px, mixed discounts, long names, large prices, stock states, right-edge alignment, stable dimensions, zero/re-add and notification rapid-toggle/reload persistence. Node tests cover delayed responses, rapid quantity sequences, failures/retry, notification latest-intent persistence and dynamic class IDs. Evidence is in the local `.comprehensive-audit` folders (ignored artifacts).

## Remaining acceptance and deployment dependencies

No known failing automated check remains. This is not a release-ready declaration. Signed Android real-device touch/performance/font-scaling checks, permission denial/regrant, restart persistence, token registration, background notification delivery and deep links still require device testing. Physical push delivery was not tested. Real website/browser and live authenticated API acceptance remain necessary; mocked browser checks do not establish production behavior or deployed backend version.

Deploying the changed clients is required to deliver these fixes. This pass needs no backend code/schema deployment or data migration. Pricing formulas, customer assignments, minimums, delivery/order rules, historical orders and invoices were not changed. No commit, push, deploy, publish or APK/AAB build was performed.
