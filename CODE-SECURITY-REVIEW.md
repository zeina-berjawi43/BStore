# Code and security review — 2026-09-19

Follow-up: the two high-priority backend findings below now have local implementations and unit coverage in [backend/SECURITY-CHANGES.md](../backend/SECURITY-CHANGES.md). Password changes keep the current device signed in. The app now persists checkout request IDs. The findings below describe the initial audit; transaction integration testing, deployment and the other remaining findings are still outstanding. Current regression counts: 14 backend tests and 16 customer-app tests passed. TypeScript and the Android JavaScript/Hermes export also passed.

Latest customer-app update: search now has Add to Cart and Favorite actions, loading/error feedback, out-of-stock handling and per-action request locks. Results use a virtualized two-column list. Home/search share product requests and a 60-second in-memory snapshot; only public metadata (no prices) is persisted for immediate display while refreshing. Pull-to-refresh bypasses freshness. Images use Expo Image disk/memory caching. The loading route no longer waits four seconds, and staggered product animation delays were removed. Customer regression coverage is now 20 passing tests; TypeScript passed. Actual first-load latency still depends on the network/backend and has not been measured on a device.

Scope: customer application in `mystore`; read-only inspection of relevant local backend authentication, cart, product and order code. Existing uncommitted work was retained. Store listing, dependency upgrades and publication were excluded following the scope clarification.

## Remaining findings

| Priority | Finding and evidence | Required follow-up |
| --- | --- | --- |
| High | Backend access JWTs last 30 days (`../backend/controllers/authController.js:395`). Protected and optional authentication verify the signature without checking current account existence, role or session revocation (`../backend/middleware/authMiddleware.js`, `optionalAuthMiddleware.js`, and the separate middleware in `routes/authRoutes.js`). Logout/password reset revoke refresh tokens, but a previously issued access token can continue authenticating until expiry. | Implement consistent server-side session/account validation and revocation across authentication middleware, with shorter access-token lifetimes. Test deleted accounts, demoted administrators, logout and password reset. This cannot be secured by client checks. |
| High | Checkout saves the order before clearing the cart, without a transaction or idempotency key (`../backend/routes/orderRoutes.js:353`, `:362`). Concurrent requests or a failure between writes can create duplicate orders. | Add durable server-side idempotency and atomic order/cart changes. Verify transaction support in the deployed database and test simultaneous requests. The client tap lock is only a partial mitigation. |
| Resolved locally | Access/refresh credentials now use Expo SecureStore through `src/services/tokenStorage.ts`. Existing credentials migrate before plaintext copies are removed; all screen invalidations use the shared logout helper. Profile cache remains in AsyncStorage. | Rebuild the native application and verify migration/login/logout on a physical device. |
| Medium | Push registration helper exists but has no caller in `src` (`utils/notifications.js`). The notification screen currently saves a preference; that alone does not register a physical device to receive pushes. | Integrate permission/device registration and backend token lifecycle, including account switching and logout, then test on a physical device. |
| Medium | Several screen helpers swallow refresh/network failures and return `null`; some screens interpret both HTTP 401 and 403 as expired sessions. | Separate permission errors, temporary connectivity failures and actual session expiry consistently across screens. The service now preserves credentials on temporary refresh failures, but not every screen has a distinct offline UI. |
| Medium | Cart/favorite optimistic updates still use component state and whole-list responses. Cross-item requests and stale responses need device/concurrency validation. | Test rapid edits on multiple products with delayed/out-of-order responses; serialize mutations or reconcile by request revision where needed. |

## Changes made

- Share simultaneous refresh requests instead of sending one per screen request.
- Preserve the stored session when refresh returns 429/5xx, malformed success or a network error; reject the operation instead of returning an authentication failure.
- Discard refresh responses when the stored refresh credential changed while the request was in progress. Clear local credentials before the logout network call.
- Refresh tokens on home loading and order details; authenticate search requests so signed-in users get the appropriate product data.
- Refresh home product/offer lists on focus, including after login/logout.
- Route application HTTP calls through a shared 30-second request timeout and forward caller cancellation. No automatic retries of mutations. The deadline covers fetch resolution; it is not a separate response-body deadline.
- Guard customer application debug logs with `__DEV__`; remove push-token logging. Debug builds still log diagnostic data and should not be distributed as production builds.
- Add an immediate checkout tap lock and clarify that a connection failure may leave an order already placed.
- Reject blank, fractional, unsafe and negative manual cart quantities without deleting the item.
- Prevent overlapping notification preference writes, disable changes until loading completes, and show failed-load/save messages.
- Stop the loading-screen animation on unmount and update the unused notification helper's foreground presentation flags.

## Validation

- TypeScript: `node node_modules/typescript/bin/tsc --noEmit` — passed.
- Regression tests: `node --test scripts/security-check.cjs` — 13 passed. Covers valid tokens, concurrent refresh, temporary failures, malformed responses, invalid-session cleanup, late responses after logout/account change, failed-server logout, cancellation and mutation timeout without retry.
- Android JavaScript/Hermes export: `node node_modules/expo/bin/cli export --platform android --output-dir .release-check/android --max-workers 1` — passed. This is not a signed native build or a device test.
- No matching embedded private-key/service-role/live-payment-key patterns were found in the scanned customer source/config files; this is a limited pattern scan, not proof that no secrets exist.
- The inspected backend calculates order prices from current products and scopes customer order lookup/cancellation to the authenticated user. These are positive static findings, not live penetration-test results.

No real accounts, orders, SMS messages or production records were created or changed. No backend files were modified. Runtime end-to-end testing, native device testing, dependency vulnerability auditing and deployed-backend verification remain outstanding. This review does not certify the application as fully secure or ready for publication.

## Secure token storage follow-up ? 2026-09-20

- Installed the SDK-compatible `expo-secure-store` module and config plugin (default Android backup exclusion).
- Native credentials are stored together in a single secure record. Serialized migration and conditional refresh updates prevent stale refresh responses from restoring or replacing a newer session. Logout stores an empty record before removing legacy credentials and profile markers.
- Password changes continue replacing the current session without logging this device out. Phone updates preserve the refresh credential.
- Web keeps tokens in memory only; reloading the page requires signing in again. There is no plaintext persistence fallback on native storage failures.
- Basic regression suite: 27 tests, including secure migration, failed migration, legacy precedence, login/logout, refresh races and password changes. TypeScript passed. Native device testing remains outstanding; this native dependency requires a new application build.

## Customer notification follow-up ? 2026-09-20

Device registration, session ownership, permission UI, notification tap handling, customer order-status pushes and receipt cleanup now have local implementations. See [NOTIFICATIONS-REVIEW.md](./NOTIFICATIONS-REVIEW.md) for validation and the remaining Firebase/deployment/device-test requirements. Current basic suites: 32 app tests and 25 backend tests pass. Offline logout revocations are retained securely until acknowledged by the backend.
