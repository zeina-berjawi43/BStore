# BStore Customer App and Website final UX fixes

Date: 17 October 2026

Customer-only local implementation. Existing Phase 1–5 functionality was retained. No Backend, Admin App, Admin Panel, dependency, credential, production-data, deployment or native-build changes were made. No commit or push was performed.

## Diagnosis and implementation

| Request | Cause and resulting behavior |
| --- | --- |
| 1. Login return | Successful authentication was owned by the root session reset, but it discarded ordinary protected-page intent. Login was also still an available authenticated route. An allowlisted, one-use intent now records Cart/Account/Favorites and direct protected entries; Login carries its `returnTo` value. The root resumes the destination or Home. Guest screens are unavailable after authentication. Browser continuation is staged through the mounted navigator to avoid the protected-route/history race found during testing. Order deep-link continuation retains its existing separate ownership. |
| 2. Anonymous Offers | The catalog service intentionally strips prices **and discount fields** from public snapshots. Home then filtered those already-valid offers by `discount > 0`, discarding all anonymous offers. Home now trusts the existing `/products/offers` selection. Anonymous products remain price-free; no public pricing or placeholder products were added. |
| 3. Department loading | Category loading and the product-list empty state both rendered spinners. There is now one empty-list loading indicator while either initial dependency is pending. Existing visible cards remain during revalidation; errors settle loading and expose a force-refresh retry. |
| 4. Home refresh | The visible Refresh Home button was removed. Native RefreshControl remains; touch web uses a top-edge downward gesture with nonpassive movement handling, a release threshold and visible loading feedback. Horizontal gestures, scrolled content, cancelled/multitouch gestures and unmounts do not trigger refresh. Desktop has no added refresh button. Success resets only the slideshow; failure preserves content and banner position. |
| 5. Refresh/retry | Two client checks treated valid empty catalog/top-selling responses as request failures, producing a false aggregate refresh error. Valid empty arrays now succeed; malformed data, HTTP errors and network failures still fail. Retry forces new requests and clears the error only after successful completion. This fixes the confirmed client false-error paths; no claim is made that an unobserved production network outage has been eliminated. |
| 6. Empty Cart | The empty branch rendered the same Class C progress component as a populated cart. That component is now omitted only from the empty branch. The existing centered empty state and Continue Shopping remain. Nonempty minimum/free-delivery progress, eligibility, fees and totals are unchanged. This deliberately supersedes the older empty-cart progress expectation as requested. |
| 7. Navigation | Continue Shopping retains the existing dismiss-to-Home helper. Department/category/detail context, Settings/Notifications history, Orders/Home and signed-out order-notification continuation remain covered by router and browser regressions. Browser history may return to an earlier public page; it does not reopen a usable Login screen after authentication. |
| 8. Sticky headers | Back/title/Cart, category tabs and the result/error area are siblings above FlatList in both catalog screens. Only the virtual grid scrolls. All remains present even while categories are loading or empty. No floating Cart control was introduced. |
| 9. Success feedback | The misleading decorative Cart icon was removed. Success appears after confirmed saving rather than falsely preceding a failed write. The notice still replaces rapid messages, announces them, closes manually and expires after 2.2 seconds. Its full-screen wrapper and notice use `box-none`; noninteractive content uses `none`, leaving underlying controls reachable. |
| 10. Inline quantities | A shared selector subscribes directly to the existing shopping store. Initially the original Add control renders; a cart item renders minus/current quantity/plus, and zero restores Add. Departments, categories, all Offers, Home actions, Search, Favorites and Product Details share the same quantities as Cart. Buttons have product-specific labels, propagation guards and 44-point minimum touch targets. Availability blocks increases. Rapid taps use current optimistic quantities and coalesce unsent absolute intents through the existing serial queue. Server prices are never submitted. |
| 11. Department movement | Confirmed layout contributors were changing safe-area ownership between Home and departments, and a count row that gained height after loading. Android top/bottom safe areas now have one consistent root owner; Home retains horizontal edges. The count row reserves its space. Browser checks scroll the actual grid, verify a fixed header, retain a nonzero Home scroll offset, show no outer-document movement on entry/exit, and verify identical cold/loaded header height. The original physical Android shift could not be reproduced on a device here; device acceptance remains required. |
| 12. Categories header | Removed only EXPLORE. Category cards, section geometry and navigation remain. |
| 13. Recently Added header | Removed only the header NEW label. Products and their existing actions remain. |
| 14. Top Selling | Header controls, ranking, product/image presentation and initial Add appearance remain. The shared requested quantity state replaces Add after adding; compact price/action rows can wrap when necessary to keep 44-point quantity controls and prices unclipped at narrow widths. No ranking or carousel redesign was performed. |
| 15. Offers See All | The existing orange control is exactly `See All` and opens the public `/offers` route. It reuses the virtualized catalog presentation and existing real offers endpoint, with categories, prices for authenticated users, shared cart controls, loading, empty state, retry and history-aware/direct-entry Back. It does not cap the product list. |

## Mutation failure safety

An additional edge case was found while testing rapid quantities: an add can time out after the server commits it. Choosing another POST from the old confirmed snapshot could then over-add. Before choosing add versus update for a queued inline intent after a failed cart write, the queue now reads the authoritative cart. It does not blindly retry the mutation. A failed read blocks that intent with an error; account generations reject late responses. If the intended quantity is zero and the confirmed server cart has no such item, it settles locally without a misleading DELETE/404. Tests cover both committed and uncommitted failed-add cases, rollback, remove/re-add, account change and stock guards.

All existing A/B/C percentages, discounts, minimums, delivery/free-delivery thresholds, fee calculations, checkout totals and backend authorization remain unchanged. The existing shared-state reconciliation and checkout synchronization remain in use. No Cart Total Tracker was added.

## Validation

Commands are run from `mystore/`. All browser API traffic is replaced with local fixtures; successful order placement in the broad browser suite is mocked.

| Command | Final result |
| --- | --- |
| `node --test scripts/*.test.cjs scripts/security-check.cjs` | 201 passed, zero failed/skipped. All 193 previous tests plus eight added tests. |
| `node node_modules/typescript/bin/tsc --noEmit` | Passed. Expo SDK 57's installed typed-route generator regenerated local ignored declarations for `/offers`. |
| `npm run lint` | Passed: zero errors and warnings. No lint rules disabled. |
| `node node_modules/expo/bin/cli export --platform web --output-dir .navigation-check/web` | Passed, 28 static routes including Offers. Local export only. |
| `node scripts/customer-final-ux-browser.cjs` | Nine checks, zero JavaScript exceptions. Anonymous Offers and prices, responsive/direct all-offers entry, final offer reachability, login destination/fallback, empty Cart, actual sticky scrolling, Home scroll retention, rapid quantities, one spinner/stable loading geometry, empty/error/retry. |
| `node scripts/phase3-browser.cjs` | Five checks, zero JavaScript exceptions. Dynamic pagination, native Chrome touch events for pull refresh, deduplication, success-only slideshow reset, failed-refresh retention and a real retry request. |
| `node scripts/navigation-browser.cjs` | Eight checks, zero JavaScript exceptions. Includes order login continuation and Details > Orders > Home history. |
| `node scripts/catalog-browser.cjs` | Five checks, zero JavaScript exceptions. Both 300-product categories remain reachable, 600-product ALL list retained, complete prices/scroll preserved, stale refresh and offline retry. Windowed cards remain 24 and Home-to-department catalog reads remain one. |
| `node scripts/phase4-browser.cjs` | 18 checks, zero JavaScript exceptions. Responsive routes through 1440px, PWA manifest and protected direct entry. |
| `node scripts/ui-ux-browser-smoke.cjs` | 25 checks, zero JavaScript exceptions. Includes A/B/C delivery and eligibility, checkout, cart editing, favorites rollback, responsive price/quantity geometry, carousel behavior and logout. |
| `git diff --check` | Passed. Git line-ending conversion notices are informational. |

For all six browser commands set `BSTORE_WEB_EXPORT` to the absolute `.navigation-check/web` path, particularly for the broad UI suite whose default points to an older export. In PowerShell: `$env:BSTORE_WEB_EXPORT=(Resolve-Path '.navigation-check/web').Path`.

Browser total: 70 checks. No Android FPS or live delivery claim is made from headless fixture runs. Export emitted the existing Expo Notifications web-listener limitation notice and Node color-environment notices; neither is an ESLint finding or export failure.

Test updates preserve the requested coverage rather than suppressing failures: empty-cart assertions now require no progress while retaining every populated threshold case; feedback tests require confirmed success and pass-through placement; the obsolete Offers imperative-scroll test now requires the dedicated route; browser selectors follow the new quantity state and still assert unclipped prices/no overlap. The shared fixture now honors the API's requested add quantity rather than always adding one. No test was skipped or removed.

Evidence is local under `.navigation-check/`: `customer-ux-tests.txt`, `customer-ux-lint.txt`, `customer-ux-export.txt`, `customer-final-ux-browser.json`, `phase3-browser-results.json`, `browser-results.json`, `catalog-after.json`, and `phase4-browser-results.json`. Broad UI evidence remains under `.release-check/ui-ux-browser-results.json` and its screenshots. Process-spawn restrictions required approved execution of test workers/headless Chrome outside the sandbox. Initial runs with obsolete assertions, synthetic touch events or the wrong export directory were corrected and rerun; only completed successful runs are reported above.

## Exact files changed

All paths are relative to `mystore/`.

| File | Purpose |
| --- | --- |
| `src/app/_layout.tsx` | Protected intent continuation, authenticated guest-route exclusion, direct protected entry and consistent Android safe areas. |
| `src/app/login.tsx` | Remember allowlisted `returnTo` destination. |
| `src/services/login-intent.ts` | New one-use protected login intent helper. |
| `src/services/sessionRoutes.ts` | Public Offers classification. |
| `src/components/cart-button.tsx` | Preserve protected Cart intent. |
| `src/app/index.tsx` | Anonymous Offers fix, remove refresh button/Explore/New, touch refresh feedback, See All route and shared quantities. |
| `src/hooks/use-web-pull-refresh.ts` | New touch-only web pull gesture and cleanup. |
| `src/services/catalogService.ts` | Accept valid empty top-selling responses. |
| `src/hooks/use-catalog-screen.ts` | Offers endpoint mode and loading/retry state handling. |
| `src/app/category-products.tsx` | Fixed header/tabs, one spinner, stable loading geometry, quantity controls and exported reusable screen. |
| `src/app/department-categories.tsx` | Same retained/virtualized department presentation improvements. |
| `src/app/offers.tsx` | New dedicated all-offers route. |
| `src/app/cart.tsx` | Hide progress in the empty branch only. |
| `src/services/shopping-state.ts` | Serialized/coalesced inline absolute quantities and uncertain-write readback. |
| `src/hooks/use-shopping.ts` | Shared adjustment action and confirmed-success feedback. |
| `src/components/quantity-selector.tsx` | New synchronized, accessible inline selector. |
| `src/components/add-to-cart-button.tsx` | Reuse existing initial button and shared quantity selector. |
| `src/components/product-feedback.tsx` | Remove misleading icon, pass-through notice and dismiss control. |
| `src/app/search.tsx` | Shared quantities and responsive price/action wrapping. |
| `src/app/favorites.tsx` | Shared inline quantities. |
| `src/app/product-details.tsx` | Shared inline quantities. |
| `scripts/customer-final-ux.test.cjs` | Seven new focused intent/gesture/quantity/failure regressions. |
| `scripts/customer-final-ux-browser.cjs` | Nine new browser checks with local fixtures. |
| `scripts/shopping-state.test.cjs` | Confirmation timing assertions and one new confirmed-success test. |
| `scripts/shopping-fixture.cjs` | Match add quantity semantics. |
| `scripts/customer-interactions.test.cjs` | Nonblocking feedback placement, replacement and dismissal coverage. |
| `scripts/final-polish.test.cjs` | Empty-cart/See All assertions and selector fixture. |
| `scripts/product-loading.test.cjs` | Accept legitimate empty sections while malformed data still fails. |
| `scripts/security-check.cjs` | New root login-intent dependency fixture. |
| `scripts/phase3-browser.cjs` | Replace removed refresh-button tests with actual touch gestures; assert failed-request retry. |
| `scripts/ui-ux-browser-smoke.cjs` | Quantity-state selectors and unclipped narrow-width price/action assertions. |
| `BStore-Customer-Final-UX-Report.md` | This report. |

No backend change was necessary. The existing offers endpoint already selects available discounted products and permits public metadata; the defect was the additional client filter after privacy stripping. Existing cart endpoints already support add quantities, updates and removal.

## Remaining device and deployed-site acceptance

No physical device, emulator interaction, live production account, real notification delivery, APK/AAB or deployment was used.

1. On a separately approved Android build, test cold/warm login, protected Cart/Account/Favorites/direct links, OTP continuation, expired sessions, logout/account replacement and hardware Back. Repeat notification Details > Orders > Home ownership checks.
2. Enter and leave departments at deep Home offsets. Verify status-bar/safe-area geometry, sticky header/tabs and retained product offsets using arrows and hardware Back. Repeat on rotation, large fonts and slower devices. The original tester-observed native shift needs this confirmation.
3. Test native pull refresh and mobile Chrome touch pull, including horizontal slideshow swipes, failure/retry, backgrounding and interrupted gestures. Slideshow resets only on success; desktop browser reload remains available normally.
4. Rapidly add/increase/decrease/remove/re-add across every product surface and Cart, including slow/offline and lost-response scenarios. Confirm touch targets, readable prices, stock restrictions, rollback and authoritative checkout totals for live A/B/C test accounts.
5. Verify empty Cart has no progress/messages, populated threshold transitions remain correct, and Continue Shopping history remains clean. Check notice touch-through and manual/automatic dismissal without blocking quantity controls.
6. On the approved deployed website, test anonymous Home/Offers, direct `/offers` and refresh, all real offers, PWA standalone navigation and actual API/cache behavior. Hosting configuration was not deployed or changed here.

No known actionable code failure remains in the verified automated scope. Physical Android movement, platform touch behavior and live deployed-network behavior remain acceptance items rather than verified outcomes.
