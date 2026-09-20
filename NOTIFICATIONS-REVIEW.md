# Customer notifications ? implementation and remaining deployment steps

Updated 2026-09-20. Scope: mystore customer application and its backend push pipeline. No deployment, real notification send, or device test was performed.

## Implemented

- Authenticated PUT/DELETE /push/device endpoints validate Expo tokens and bind registrations to the authenticated session. One token belongs to one account; multiple devices per account are supported. Rotation removes the old registration for that session. Older sessions cannot replace a newer device registration.
- Customer offers use the new device registry. Order status changes by administrators send a generic customer notification with an order ID; unchanged status does not trigger another send. Notification failures do not roll back saved order changes.
- Before sending, the backend checks the current notification preference, verified user, unexpired session and password credential version. Revoked/expired sessions cannot be selected for future sends. Legacy User.expoPushToken is no longer used for customer sends; existing customers register when opening the updated app.
- Customer push tickets are counted by accepted status. Receipt IDs persist in MongoDB and are checked every minute once they are 15 minutes old. Invalid-device tickets/receipts remove the corresponding registration; a newer registration is protected from an old receipt. Receipts expire after 24 hours.
- App startup, login/session replacement, foreground resume and token rotation synchronize device registration. Product loading does not wait for registration. Native notification permission is requested for enabled accounts; the settings screen reports setup failure and exposes retry/phone settings actions.
- Foreground display and tap navigation check the current account. Only offer/home and validated order-details destinations are allowed. Cold-start and live notification taps are handled. Arbitrary notification URLs are ignored.
- Logout clears usable local credentials immediately. Offline server revocations are retained in SecureStore and retried at the next notification sync; switching accounts also queues revocation of the previous session. Until the server receives an offline logout, it can still send an already eligible notification. Already queued OS notifications cannot be recalled; account checks prevent opening another account's order.
- app.config.js accepts a local google-services.json or the GOOGLE_SERVICES_JSON EAS file environment variable and validates its Android package. Local Firebase config is gitignored.

## Validation completed

- Customer app: 36 basic regression tests passed, including permission denial, authenticated registration, account-safe navigation, logout retry and account switching.
- Backend: 31 tests passed, including session/preference filtering, registration validation and ownership, accepted/rejected tickets and invalid-token receipt cleanup.
- TypeScript passed. Android JavaScript/Hermes export passed. Notification tests use doubles, not a live push service. Checkout additionally passed integration tests against a real isolated MongoDB replica set.

## Required before live delivery can be verified

1. Supply google-services.json for Android package com.zeina43.mystore, either at mystore/google-services.json or through GOOGLE_SERVICES_JSON. No matching file was found locally; the user has been asked for its path.
2. Configure/verify FCM v1 service-account credentials for the existing EAS project. Never commit or paste a service-account private key into source or chat. Official setup: https://docs.expo.dev/push-notifications/fcm-credentials/ . Remote credentials have not been inspected.
3. Deploy the backend changes before distributing the updated app. The new push endpoints and receipt worker must be running with MongoDB access. Build a new native application with the Firebase configuration. Expo Go on Android cannot validate remote push.
4. On a test device/account, verify permission grant/denial, offers, order status changes, foreground/background/closed app taps, preference off, logout, account switch and receipt cleanup. No production customer messages should be used for this verification.

Failed customer submissions now persist in a bounded retry queue. Each retry rechecks the account preference and session; disabling notifications or revoking the session cancels queued work. Delivery remains best-effort: this queue is not a transactional outbox, uncertain network outcomes can produce duplicates, and service acceptance is not proof of device delivery. Receipt monitoring covers the new customer pipeline; existing administrator mobile/web notification code retains its separate lifecycle.
