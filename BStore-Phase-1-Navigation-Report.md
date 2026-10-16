# BStore Phase 1 navigation report

Date: 14 October 2026

Follow-up: [Phase 1.1 regression report](BStore-Phase-1.1-Regression-Report.md) resolves the six failures recorded below. The original Phase 1 results remain here as historical evidence; the customer suite now passes all 173 tests.

## Root causes and fixes

1. **Product Details Back:** the existing details arrow correctly pops the previous screen. Both catalog screens, however, call loadData on every focus. Their category fetch resets selectedSubCategory to ALL, changing the list and potentially clamping its scroll offset after Back. Each retained catalog instance now loads once; product Back leaves its selected category, products, and scroll view intact. Route-keyed catalog instances still initialize when the department changes. Shared cart/favorites updates continue through useShopping, and account changes still remount screens through the existing session revision. Product Details keeps its existing history-aware Back and direct-entry Home fallback.
2. **Order notifications:** the listener pushed details onto whichever stack happened to exist, without Orders beneath it. It also cleared signed-out notification responses without retaining the destination. The listener now waits for the mounted navigator, retains signed-out responses through authentication, revalidates the destination using the existing user-ID checks, and resets native order entry to Home > Orders > actual Order Details. Duplicate response identifiers are ignored. Startup and Login routes are absent from that stack. Initial order URLs are captured before mounting the navigator, including custom-scheme URL hostnames. On web, cold order entry creates actual Home/Orders/Details browser entries in sequence because resetting navigator state alone does not create browser history. Login and OTP completion no longer issue a competing Home replacement; the existing root session reset owns successful authentication navigation and can resume the intended order.
3. **Settings loop:** Notifications used push('/settings') for Back, creating Home > Settings > Notifications > Settings. Privacy had the same pattern. Their arrows now pop existing history and replace with Settings only for a standalone entry. Settings retains its normal history-aware Back. Android and browser Back use the same underlying history rather than a custom hardware interception.
4. **Empty orders Start Shopping:** replace('/') removes only Orders, retains Account underneath, and creates a fresh Home whose own initial data loading can show startup artwork. Start Shopping now dismisses to the retained Home instance. Cart uses the same helper; Favorites' empty state previously used generic Back, which could return to Account, and now explicitly starts shopping. The root route anchor supplies Home for direct entries. No session, cart, favorites, pricing, or data cache is cleared.

## Exact files changed

All paths below are relative to mystore/.

| File | Purpose |
| --- | --- |
| src/app/_layout.tsx | Home anchor, initial order URL capture, authenticated intent continuation, native order parent stack, real browser order history, notification deduplication and signed-out intent retention. |
| src/services/navigation.ts | Shared Settings Back fallback, Start Shopping action, and native notification order state builder. |
| src/app/category-products.tsx | Avoid reloading and resetting the retained category on product Back. |
| src/app/department-categories.tsx | Preserve the retained department/category list on product Back. |
| src/app/notifications.tsx | Pop Settings history instead of pushing another Settings screen. |
| src/app/privacy.tsx | Correct the related Settings Back loop. |
| src/app/orders.tsx | Dismiss empty orders directly to existing Home. |
| src/app/cart.tsx | Use the shared Start Shopping helper. |
| src/app/favorites.tsx | Empty-state Start Shopping goes to Home rather than generic Back. |
| src/app/login.tsx | Let the existing session-reset effect own successful login navigation, preventing it from overwriting the resumed order. |
| src/app/verify-otp.tsx | Apply the same navigation ownership after registration verification. |
| scripts/navigation.test.cjs | Eight focused navigation regressions, including installed Expo StackRouter GO_BACK behavior. |
| scripts/navigation-browser.cjs | Repeatable headless Chrome tests against a fresh web export with local API fixtures, including mocked login. |
| scripts/security-check.cjs | Extend root-layout test mocks for the new initial-link dependency and state builder. |
| .gitignore | Exclude local exports, browser profiles, and verification logs under .navigation-check/. |
| BStore-Phase-1-Navigation-Report.md | This report. |

The backend order endpoint was inspected, not changed: GET /orders/:orderId uses authMiddleware and Order.findOne with both the order ID and req.user.userId. Client notification routing still calls the existing notificationDestination, which validates the signed-in notification recipient. Knowing an order ID does not bypass server ownership checks.

## Commands and results

Commands run from mystore/:

- node node_modules/typescript/bin/tsc --noEmit ? passed.
- npm run lint ? passed with 0 errors and 24 warnings (existing hook dependencies, unused items, and duplicate React imports).
- node --test scripts/navigation.test.cjs ? 8/8 passed. Tests exercise actual handlers and the installed Expo StackRouter; GO_BACK produces Details > Orders > Home and then an unhandled root Back suitable for platform exit handling.
- node --test scripts/*.test.cjs scripts/security-check.cjs ? 169 tests, 163 passed, 6 failed. All six failures were reproduced against original HEAD source through a read-only source substitution preload; no source checkout/reset was performed. Existing failures are missing getSessionSnapshot fixture variables in Home, Category, Search, and a security catalog test; missing productFresh in the product-details fixture; and a cart progress assertion expecting two values but receiving zero. These unrelated tests were not rewritten to hide their failures.
- node node_modules/expo/bin/cli export --platform web --output-dir .navigation-check/web ? passed, 27 static routes. This is a local web export, not a deployment or native build.
- node scripts/navigation-browser.cjs ? passed all 8 browser flow checks, including scroll retention and login resume, with 0 JavaScript exceptions. All backend requests are replaced with local fixture responses.
- git diff --check ? passed.

Evidence is retained locally in .navigation-check/: browser-results.json, final-tests.txt, navigation-results.txt, lint.txt, baseline-results.txt, and security-baseline.txt. The baseline preload and web export are also there.

## Browser coverage

The browser suite checks category selection, scroll retention through repeated Product Details arrows, no repeated product catalog fetch on return, browser Back/Forward, repeated Settings/Notifications loops, empty Orders Start Shopping, Back from Home without Account/Orders/Loading, cold authenticated order entry, cold signed-out order entry, and mocked login resuming the intended order. It records JavaScript exceptions and fails on any exception. Session restoration and account-change isolation also run in the existing security regressions.

## Manual Android acceptance still required

No physical Android device behavior, emulator interaction, real notification delivery, or Google Play installed build was verified. Automated native coverage is router/handler execution, not a device test.

1. In the existing native build, browse several departments/categories, scroll, open details repeatedly, and use both arrows and hardware Back. Repeat from Home, Search, Favorites, and Offers; confirm category selection and scroll return correctly.
2. Tap an order notification with the app terminated, backgrounded, and foregrounded. Confirm the actual order ID and Details > Orders > Home > normal Android exit behavior. Repeat the same notification and then another order.
3. Repeat while signed out, with an expired session, and after switching accounts. Complete login/OTP where required; verify the original order resumes only for its owner. Test another customer's ID and notification payload; order contents must not appear.
4. Repeat Settings > Notifications > Back > Settings > Back > Home with arrows and hardware Back; also test Privacy.
5. From Account > empty Orders, choose Start Shopping and press hardware Back at Home. Repeat Cart and Favorites empty-state shopping actions; verify login, cart, favorites, and pricing class remain intact.
6. Test bstore://order-details?orderId=<valid-id> and direct product links on cold/warm start, and restore a persisted session. Confirm startup/Login screens cannot be reached through Back from the authenticated notification stack.

## Remaining limits

Real push lifecycle timing, native view scroll retention, hardware Back, OTP-provider integration, and device session restoration need the Android acceptance above. The six baseline regression failures remain unresolved and are outside these navigation changes. Web testing uses fixture API responses rather than a production account. Catalog screens now retain their initial snapshot until their route instance or session changes; shared shopping state remains reactive. Browser history before entry to the site is preserved, so Back at Home may leave the site normally.

Phase 1 only. No commit, push, deployment, APK/AAB generation, or production database modification was performed. SDK 57 references consulted: https://docs.expo.dev/versions/v57.0.0/ and https://docs.expo.dev/versions/v57.0.0/sdk/router/.
