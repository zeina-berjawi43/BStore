# BStore Phase 1.1 regression report

Date: 14 October 2026

All 169 existing customer tests now pass, along with four new tests: **173 passed, 0 failed, 0 skipped**. The backend suite also passes **66/66**. No tests were removed or skipped.

## Investigation of the six failures

The original traces were read from `.navigation-check/final-tests.txt` before editing. Line numbers in this table identify the original failing tests and assertions.

| Original test location and name | Classification | Root cause and correction |
| --- | --- | --- |
| `scripts/customer-interactions.test.cjs:58` - `index.tsx: Add to Cart delegates the current product to shared state` | Incomplete fixture | The extracted handler references `getSessionSnapshot`, which the VM context omitted. The product also had no price despite representing a successful authenticated addition. Supply an authenticated session and priced product; preserve the one-call and product-identity assertions. |
| `scripts/customer-interactions.test.cjs:58` - `category-products.tsx: Add to Cart delegates the current product to shared state` | Incomplete fixture | Same missing session dependency and unpriced happy-path product. Supply the current handler dependencies and retain the original delegation assertions. |
| `scripts/customer-interactions.test.cjs:58` - `product-details.tsx: Add to Cart delegates the current product to shared state` | Incomplete fixture | `productFresh` was omitted. Current Product Details intentionally prevents cart additions from cached information until a fresh product response arrives. Supply a fresh ref for the successful-addition case; keep product identity and call-count checks. |
| `scripts/customer-interactions.test.cjs:64` - `Search delegates cart and favorite actions without navigating` | Incomplete fixture | The cart action now checks session and current price, but the fixture omitted `getSessionSnapshot` and a product price. Supply both; retain the exact cart/favorite operation sequence and product references. |
| `scripts/final-polish.test.cjs:246`, assertion at original line 266 - `two-stage Cart fills, colors and totals use current Class C rules only, including zero and decimal boundaries` | Real application defect | The failure was specifically the empty-cart assertion, not the populated-cart cases. The progress element was constructed correctly but only inserted inside the nonempty totals branch. The prior `BStore-Cart-Progress-Order-Numbering-Report.md`, Class C Cart section, explicitly requires zero progress on an empty Class C cart. Render the existing `progress` element in the empty branch. Keep the original expectation of two segments and strengthen it with zero values, zero widths, original colors, and empty A/B/guest exclusion. |
| `scripts/security-check.cjs:193`, handler invocation at original line 199 - `category-products.tsx: shared state blocks duplicate additions and allows retry after failure` | Incomplete fixture | The extracted screen function omitted `getSessionSnapshot`. Its real shared-state product fixture already has valid prices. Supply the authenticated session and a fail-fast unexpected-alert stub; preserve duplicate blocking, independent products, rollback, write counts, and retry checks. |

None of the six required weakening an assertion. In particular, changing the empty-cart expectation from two to zero would have hidden a genuine defect.

## Changes in Phase 1.1

Paths are relative to `mystore/`. Pre-existing Phase 1 working-tree changes remain in place.

| File | Phase 1.1 change |
| --- | --- |
| `src/app/cart.tsx` | Insert the existing `{progress}` element in the empty-cart branch. No style, calculation, navigation, or API changes. |
| `scripts/customer-interactions.test.cjs` | Complete successful-action fixtures. Add four tests covering missing authenticated prices on Home and Category, stale Product Details data and fresh retry, and Search favorite/cart behavior with missing and zero prices. Unexpected happy-path alerts fail the tests. |
| `scripts/security-check.cjs` | Complete the catalog handler context with session and unexpected-alert dependencies. The Phase 1 layout mocks remain intact. |
| `scripts/final-polish.test.cjs` | Preserve the failing two-segment assertion and add checks for empty zero values, widths, red/yellow fills, and A/B/guest exclusion. All populated-cart boundary, fee, total, and decimal assertions remain. |
| `BStore-Phase-1-Navigation-Report.md` | Add a follow-up link so its historical failures are not mistaken for current failures. |
| `BStore-Phase-1.1-Regression-Report.md` | This report. |

Four new tests were added, taking the customer suite from 169 to 173. Existing parameterized tests retain their coverage. No pricing or delivery service, backend implementation, or application handler was changed to accommodate a fixture.

## Validation

Commands run from `mystore/` unless another directory is shown.

| Command | Result |
| --- | --- |
| `node --test scripts/*.test.cjs scripts/security-check.cjs` | **173/173 passed**, 0 failed, 0 skipped. Includes all security, navigation, cart, shopping-state, product loading, startup, and customer pricing/delivery regressions. |
| `node node_modules/typescript/bin/tsc --noEmit` | Passed. |
| `npm run lint` | Passed: 0 errors, 24 existing warnings. |
| `npm test` from `backend/` | **66/66 passed**, including pricing classes A/B/C, minimum boundaries, Class C paid/free delivery, discounts, authoritative checkout totals, historical invoice/order rules, security, and rollback. Uses test fixtures rather than production data. |
| `node node_modules/expo/bin/cli export --platform web --output-dir .navigation-check/web` | Passed; fresh local export of 27 routes. No native build or deployment. |
| `node scripts/navigation-browser.cjs` | All **8 Phase 1 browser flow checks passed**, 0 JavaScript exceptions. |
| `node .navigation-check/phase1-1-cart-browser.cjs` | All **3 local browser checks passed**: empty C shows two zero-width fills and their labels; empty A/B show no progress; 0 JavaScript exceptions. |
| `git diff --check` | Passed. |

Local evidence: `.navigation-check/phase1-1-tests.txt`, `phase1-1-lint.txt`, `phase1-1-export.txt`, `browser-results.json`, and `phase1-1-cart-browser-results.json`. The supplemental Cart browser fixture is retained in `.navigation-check/phase1-1-cart-browser.cjs`; it uses local API responses with the actual `pricing.deliveryRules` response nesting. Backend results were observed directly in the command output.

## Phase 1 preservation

All four navigation fixes remain intact. The navigation tests pass within the full suite, including the installed Expo StackRouter's GO_BACK semantics. A fresh web export passes browser checks for category selection and scroll retention; repeated Settings/Notifications arrows and browser Back/Forward; empty Orders Start Shopping and subsequent Home Back; authenticated cold order entry; signed-out order entry; and login resuming the intended order through Orders to Home. The Phase 1 Cart Start Shopping handler was not changed by Phase 1.1.

## Remaining limits and manual acceptance

There are no remaining automated regression failures or test blockers. Existing lint warnings remain outside this focused task. Physical Android behavior, real push delivery, hardware Back, and actual OTP-provider integration have not been verified; retain the Phase 1 device checklist. Also check the restored empty Class C progress on a narrow Android screen and with large font settings. Browser rendering and component assertions cover the fix, but do not establish physical-device layout behavior.

Phase 2 was not started. No commit, push, deployment, APK/AAB generation, or production data modification was performed.
