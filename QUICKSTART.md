# TallySync quick start (about 15 minutes)

Backend + admin web + Android app, with demo data and a licence already in place.

## 1. Backend (needs Node 22 and PostgreSQL 14+)

```bash
cd backend
npm ci
cp .env.multi-instance.example .env      # then set DATABASE_*, JWT_SECRET, JWT_REFRESH_SECRET (32+ chars each)
echo 'SEED_ADMIN_EMAIL=admin@demo.test'            >> .env
echo 'SEED_ADMIN_PASSWORD=Demo@12345678'           >> .env
echo 'CORS_ORIGINS=http://localhost:8080'          >> .env
npm run migration:run:safe && npm run seed && npm run seed:demo
npm run build && npm run start:prod                # API on http://localhost:3000/api/v1
```

`seed:demo` creates sample customers, products, orders and an active all-module licence for the demo
company. Sign in as `admin@demo.test` / `Demo@12345678`.

## 2. Admin web

```bash
cd admin-web && python3 -m http.server 8080        # open http://localhost:8080
```

Company admins get the business dashboard; a platform owner (`npm run seed:platform-owner`) gets the
Super Admin licensing console.

## 3. Android app (no Android Studio needed)

The APK is built by GitHub Actions with your backend address baked in:

1. Find your computer's LAN IP (e.g. `192.168.1.20`); the phone must be on the same Wi-Fi and the
   firewall must allow port 3000.
2. GitHub -> **Actions** -> **Android** -> **Run workflow**, set `api_base_url` to
   `http://192.168.1.20:3000/api/v1/` -> wait ~6 minutes.
3. Open the finished run, download the **tallysync-debug-apk** artifact, unzip, copy
   `app-debug.apk` to the phone and install it (allow "install unknown apps").
4. Log in with `admin@demo.test` / `Demo@12345678`.

Emulator? Use the default build (`http://10.0.2.2:3000/api/v1/`); every push already builds one.
Building locally instead: `cd android/mobileapp && ./gradlew assembleDebug -PapiBaseUrl=http://<ip>:3000/api/v1/`.

Debug builds allow plain HTTP for local use. Use HTTPS for anything real.

## Troubleshooting

| Symptom | Fix |
|---|---|
| App says "No active default warehouse" when saving an order | `cd backend && npm run seed:demo` (it now repairs the default warehouse; safe to re-run) |
| Tally sync returns 503 "Tally is not configured" | Add `TALLY_COMPANY_NAME=<your Tally company>` to `backend/.env` and restart. Syncing to Tally also needs the Tally agent / RabbitMQ; orders can be created and fulfilled without it |
| Phone cannot log in / "failed to connect" | Wrong `api_base_url` baked into the APK, different Wi-Fi, or port 3000 blocked by the firewall. Check `http://<ip>:3000/api/v1/health` from the phone's browser |
| 403 licence error in app or web | `npm run seed:demo` ensures an active all-module licence |
| `python3` not found on Windows Git Bash | use `python -m http.server 8080` or `npx serve admin-web -l 8080` |
| Port 3000 busy | stop the old process (`netstat -ano \| findstr :3000`, then `taskkill /PID <pid> /F`) |
