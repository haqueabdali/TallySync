# TallySync Android app

Jetpack Compose + Hilt + Room + WorkManager client for the TallySync NestJS backend.
Sales reps can take orders offline, scan barcodes, and sync to Tally; managers can
review purchasing, customers, suppliers, stock and reports.

## What's in the app

| Area | Screens / features |
|---|---|
| Auth | Email/password login, refresh-token rotation (`TokenAuthenticator`); tokens are kept in app-private `SharedPreferences` (see Known gaps) |
| Dashboard | Sales/orders KPIs, low-stock count, Tally connection, recent orders, quick actions |
| Sales | Product catalogue, barcode scanner (CameraX + ML Kit), cart, customer selection, order review, order success, order details, invoice PDF + print |
| Offline | Room-backed offline orders with `OrderSyncWorker` retrying in the background |
| Customers | List, details, create/edit, activate/deactivate, push master to Tally |
| Products | List, details, create/edit, activate/deactivate, push master to Tally |
| Suppliers | List, details, create/edit, activate/deactivate, delete |
| Purchasing | Purchase orders: list, create/edit, send, cancel, delete |
| Reports | Summary reports with CSV export |
| Settings | Account, server and sync status |

## Run it

1. Start the backend (`backend/`: `npm run migration:run && npm run seed && npm run seed:demo && npm run build && npm run start:prod`).
   The company must have an **active licence** with the `mobile_app` module (plus `purchase` for suppliers and purchase orders), created in the admin web's Super Admin console.
2. Set the server in `app/src/main/java/com/example/tallysyncapp/data/network/ApiConfig.kt`
   (`10.0.2.2` for the Android emulator, or your computer's LAN IP for a phone on the same Wi-Fi).
3. Open `android/mobileapp` in Android Studio (JDK 17+, compileSdk 37) and run the `app` configuration.

Debug builds allow cleartext HTTP for local development. **Use HTTPS and remove
`usesCleartextTraffic` for any real deployment.**

## Tests

```bash
./gradlew testDebugUnitTest
```

- `*ValidationTest` – form validation rules (customers, products, suppliers, purchase orders).
- `ApiContractTest` – parses real backend responses (`app/src/test/resources/contract/*.json`,
  captured from the demo data) with the app's own Gson models and fails if any non-null Kotlin
  property would arrive as `null`. Re-capture the fixtures when a backend response changes.

## Known gaps

- Tokens are not encrypted at rest (plain app-private `SharedPreferences`); move them to Android Keystore-backed storage before a public release.
- Release builds are not minified (`isMinifyEnabled = false`) and cleartext HTTP is enabled for local development.
- This README's build/run steps and the Compose screens were not compiled in CI here: the Android SDK could not be installed in the authoring environment, so only the JVM unit tests (validation + API contract) were executed.
