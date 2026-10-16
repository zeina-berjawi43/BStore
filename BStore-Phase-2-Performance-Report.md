# BStore Phase 2 performance and caching report

Date: 15 October 2026

Phase 2 only. Phase 1 navigation and Phase 1.1 regression repairs are retained. No commit, push, deployment, APK/AAB, service worker, PWA, dependency installation, backend change or production-data operation was performed.

## Diagnosis and previous behavior

1. Department loading bypassed the existing catalog service, fetching the whole product catalog again. Department categories had no shared cache. Both catalog screens used a static styled ring as their product loader and lacked a usable retry action. Phase 1 correctly retained screen state on Back, but its once-per-instance loading guard also prevented later revalidation. The replacement hook preserves retained state and performs independent, bounded product/category loads with real ActivityIndicator spinners and retry.
2. The existing catalog service already deduplicated product requests and held a token-scoped memory snapshot for 60 seconds. Its public disk cache intentionally contains metadata without prices. Screens initialized from metadata, or bypassed the service, so complete cached prices were unavailable during revisits. The implementation exposes the complete current-session memory snapshot, reuses it in catalog screens, Home and Search, and keeps the existing metadata-only disk behavior. No new persistent offline cache was added.
3. Personal Care is one department containing Shampoo and Hair Care. Both catalog screens rendered every matching product through ScrollView/map. In a local 600-product Personal Care fixture, this mounted 600 expensive cards and 12,236 DOM nodes. Filtering repeatedly scanned category membership for each product; filtering and price sorting ran again on shopping-state renders. Returned products also received new object identities after each request. This explains avoidable rendering and repeated synchronous work. Images and framing already used shared ProductImage; image decoding on real customer assets was not measured, so it is not claimed as a confirmed bottleneck.

## Implementation

Both grids now use FlatList on web and native: two columns, stable product IDs, 12 initial rows/items as interpreted by FlatList's multi-column implementation (24 visible card instances in the measured web run), batches of eight rows, and a five-viewport window. Native clipping is disabled to avoid missing retained views after Back. Existing card markup, styles, images/framing, price helper, favorite and Add to Cart actions are preserved. The list does not impose a product cap.

Product cards are memoized. Stable action callbacks delegate to current handlers. Favorites membership uses a Set. Category membership is computed once per filtering pass with a Set, making filtering linear in products plus categories. Filtering and sorting are memoized by catalog/category/filter inputs. Identical server products reuse their previous objects; an identical response also reuses the entire array. Changed items receive new objects. Stable keys preserve card identity during updates.

The shared catalog-screen hook owns independently progressing category/product loads, errors, retry, focus/foreground revalidation, and cleanup. Selection is never reset to ALL by loading or refresh. Category state carries its endpoint/department ID, so changing route identifiers cannot display the old department's category list. Blur and session/operation guards prevent late responses from changing an inactive or superseded view. The existing route-keyed screen instances remain in place.

## Cache lifecycle and pricing isolation

- Products and Home sections: one full in-memory snapshot per catalog/section for the active token context, fresh for 60 seconds. Complete snapshots can initialize a revisited screen for up to five minutes. Product fields from authenticated responses, including prices, discounts, category, brand, availability and image framing, remain together; existing server data is not recalculated using a separate pricing formula.
- Categories: memory-only, keyed by the stable department endpoint or the legacy categories endpoint; fresh for 60 seconds, reusable for five minutes, with at most 32 completed entries and LRU eviction. Identical concurrent endpoint loads share a pending request. Product/section request maps also deduplicate concurrent reads.
- Revalidation: stale data refreshes on catalog focus and app foreground, and every 60 seconds while the catalog screen remains focused and the app/document is active. Fresh revisits reuse snapshots without another product request. Explicit retry forces revalidation. Home and Search reuse complete snapshots and revalidate through their existing focus/refresh loaders.
- Failure: existing visible content stays on screen, with a retry message. Cold failures end loading and expose retry. Catalog/category requests use an eight-second header deadline and the request service's separate eight-second body deadline; authentication restoration can add its own existing wait. These are not promises of an eight-second end-to-end load.
- Logout/login/account replacement clears price snapshots and pending ownership through existing session events. Old generations are rejected before results can be consumed, including Home sections. Secure credentials never enter persistent cache keys.
- Saving a profile whose priceClass changes emits a separate pricing event. It clears full snapshots, rejects older responses, and clears/reloads mounted catalog, Home and Search price displays. It does not change the navigation revision, reset filters or remount the session. Tests cover A/B/C replacement and real profile-save invalidation.
- Anonymous product/section responses are stripped of cached prices and discounts while preserving availability. Existing public disk metadata remains price-free. Full price snapshots are not written to disk.
- Remote price, discount, class-percentage and class changes become visible on the next successful revalidation; there is no new server push invalidation channel. Observed profile-class changes invalidate immediately. During a temporary outage, already mounted content can remain stale beyond its normal reuse window. Displayed prices remain informational; Cart focus refresh, checkout synchronization and backend authoritative calculations are unchanged.

No business pricing rule, class percentage, minimum threshold, delivery fee/free-delivery rule, discount formula, order total or authorization endpoint was changed. Cart/Favorites/Checkout/Orders were not modified in Phase 2. Phase 1.1 Class C empty-cart progress remains covered by the complete suite.

## Measurements and browser coverage

Reproduction: `node scripts/catalog-browser.cjs` against a fresh `.navigation-check/web` export. Chrome is headless at 412 × 450, using 600 generated products, two categories and one local fixture image. All backend requests receive local fixtures. This is not a production catalog or Android measurement. The earlier pre-edit benchmark is retained in `.navigation-check/catalog-baseline.json`; the final benchmark and assertions are in `catalog-after.json`.

| Metric | Before | Representative completed after run |
| --- | ---: | ---: |
| Mounted department product cards | 600 | 24 |
| Total DOM nodes after entry | 12,236 | 743 |
| Catalog reads, Home then department | 2 | 1 |
| Department category reads | 1 | 1 |
| Polled department entry completion | 591 ms | 307 ms |
| Largest sampled entry animation-frame gap | 366.6 ms | 116.6 ms |

Timing is noisy: earlier after runs ranged from 304–791 ms and approximately 117–433 ms frame gaps. These single-run timings are not statistical evidence of a consistent latency or FPS improvement. The reproducible gains are windowed card/DOM counts and removal of the redundant catalog request. Real scrolling smoothness still requires device acceptance.

Five catalog-browser checks verify:

1. Shampoo shows 300 products and its last product is reachable.
2. Hair Care shows 300 products and its last product is reachable.
3. ALL retains all 600 products; Product Details Back preserves scroll and complete discounted prices without another catalog read.
4. After advancing freshness time and changing the fixture response, background refresh updates content without resetting Shampoo, scroll or complete cached prices.
5. Cold offline department entry stops loading, exposes retry, and retry restores the complete catalog.

The existing eight navigation-browser checks also pass: product/category/scroll Back and browser history, repeated Settings/Notifications arrows and history, empty Orders shopping/Home history, authenticated order deep link parents, signed-out order login, and login continuation. Browser runs record zero JavaScript exceptions.

## Validation

Commands run from mystore:

- `node --test scripts/*.test.cjs scripts/security-check.cjs`: 182 tests passed, zero failed/skipped. Includes all 173 prior tests and nine added cache/pricing regressions. Existing navigation tests now exercise the shared hook fixture instead of the removed per-screen loader; no tests were removed or skipped.
- `node node_modules/typescript/bin/tsc --noEmit`: passed.
- `npm run lint`: zero errors, 22 warnings (remaining existing hook dependencies, unused code and duplicate imports/directives).
- `node node_modules/expo/bin/cli export --platform web --output-dir .navigation-check/web`: passed, 27 static routes.
- `node scripts/navigation-browser.cjs`: eight checks passed, zero JavaScript exceptions.
- `node scripts/catalog-browser.cjs`: five checks passed, zero JavaScript exceptions.
- `git diff --check`: passed. Git emits Windows line-ending conversion notices for the working tree.

The complete suite includes navigation, security, cart/delivery/pricing, shopping-state, product loading and Class C empty-cart progress coverage. No backend files changed, so no new backend test run was required. Test/export/lint evidence is retained in `.navigation-check/phase2-tests.txt`, `phase2-export.txt`, `phase2-lint.txt`, `browser-results.json` and `catalog-after.json`. Browser process spawning and the full parallel test runner required execution outside the process-spawn sandbox; they used only local fixture data.

## Exact Phase 2 files changed

Paths are relative to mystore; earlier uncommitted Phase 1/1.1 files remain in the working tree.

| File | Change |
| --- | --- |
| src/services/resource-cache.ts | Bounded TTL/LRU memory cache, deduplication, invalidation generation and object reconciliation. |
| src/services/catalogService.ts | Complete snapshot peeks, structural sharing, bounded requests, anonymous price stripping, class invalidation and stale-response rejection. |
| src/services/tokenStorage.ts | Separate pricing-change subscription on guarded profile writes. |
| src/hooks/use-catalog-screen.ts | Shared progressive loading, cache lifecycle, retries, selection retention and department/operation guards. |
| src/app/category-products.tsx | Virtual grid, memoized cards, animated loading, retry and shared hook. |
| src/app/department-categories.tsx | Same changes, with department-scoped category membership. |
| src/app/index.tsx | Complete Home section snapshot reuse and observed-class invalidation. |
| src/app/search.tsx | Complete snapshot reuse and observed-class invalidation. |
| scripts/catalog-fixture.cjs | Controlled clock/session/network/shared-hook fixture. |
| scripts/catalog-cache.test.cjs | Eight focused cache/lifecycle/pricing regressions. |
| scripts/security-check.cjs | Real profile A/B/C invalidation regression. |
| scripts/product-loading.test.cjs | Load the actual reconciliation dependency in existing service fixtures. |
| scripts/navigation.test.cjs | Preserve selection and request-count assertions through the real shared hook. |
| scripts/catalog-browser.cjs | Repeatable 600-product Personal Care browser measurements and five behavioral checks. |
| BStore-Phase-2-Performance-Report.md | This report. |

## Remaining acceptance and limits

All four Phase 1 navigation fixes remain intact, supported by the complete router/handler suite and browser checks. Android hardware Back, real notification delivery and native scroll/view retention were not tested on a device.

Before release, use an existing Android test build to scroll long Personal Care Shampoo, Hair Care and ALL lists in both directions; open details repeatedly at deep offsets; return with arrows/hardware Back; background/foreground the app; and repeat on a slower device/network with real image assets. Check variable card heights and window refill during fast flings. Verify live A/B/C accounts, remote price/class-percentage changes, logout/account switching, failed/expired sessions and retry, and compare backend-authoritative checkout totals. Repeat the Phase 1 notification, Settings and Start Shopping acceptance and Phase 1.1 Class C empty-cart progress. No physical device, emulator interaction, installed Google Play build, real push lifecycle or production account was used here.

Phase 3 has not started.
