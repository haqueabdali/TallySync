# TallySync Admin Web

One site, two workspaces, chosen by who signs in (the backend still enforces every boundary):

| Signs in as | Sees |
|---|---|
| Company administrator (`role = admin`, has a company) | **Business workspace**: dashboard (KPIs, sales vs purchases, order status, top customers/products, low stock, Tally sync health), sales orders, customers, products & stock, purchasing, Tally sync |
| Platform owner (`role = admin`, `companyId = null`) | **Super Admin console** (below) |

The business workspace reads `GET /dashboard/overview` (tenant-scoped, JWT + `reporting` licence feature) and the existing mobile/purchasing endpoints. Light/dark theme toggle; charts are dependency-free inline SVG, so the site is fully static.

### Try it locally

```bash
cd backend && npm run migration:run && npm run seed && npm run seed:demo   # demo data
npm run build && npm run start:prod
cd ../admin-web && python3 -m http.server 8080                              # then open http://localhost:8080
```

Set `CORS_ORIGINS=http://localhost:8080` for the backend. The company needs an **active licence with the `reporting` module** (create one from the Super Admin console).

# Super Admin console

Owner-only control plane for TallySync commercial licensing.

## Included in V8

- Platform-admin login
- Commercial dashboard
- Customer company creation/edit/activation state
- Guided company-to-license onboarding
- License creation and management
- User and concurrent-user limits
- Minimum/maximum application versions
- Per-company module switches
- License activation/suspend/revoke
- Ed25519 license signing
- Installation authorization
- Installation credential issue/rotation
- Installation revocation
- Active user/session usage
- Authentication session revocation

## Security boundary

The backend remains authoritative. The web app hides/controls features for convenience, but `JwtAuthGuard`, `PlatformAdminGuard`, license guards, signed certificates and session controls enforce authorization server-side.

The Super Admin console requires a user with:

- `role = admin`
- `companyId = null`

Create that dedicated identity from the backend after migrations and the
normal customer seed have run:

```bash
export PLATFORM_ADMIN_EMAIL='owner@example.com'
export PLATFORM_ADMIN_PASSWORD='replace-with-a-unique-password-of-at-least-12-characters'
npm run seed:platform-owner
```

Do not reuse the seeded customer administrator's email. The bootstrap command
will reject any email already assigned to a customer company.

## Configure API

Edit `config.js`:

```js
window.TALLY_SYNC_ADMIN_CONFIG = Object.freeze({
  API_BASE_URL: 'https://api.example.com/api/v1',
  APP_NAME: 'TallySync Control',
});
```

For production, configure backend `CORS_ORIGINS` for the exact admin domain.

## Development

From this folder:

```bash
python -m http.server 5174
```

Open `http://localhost:5174`.

The backend normally runs at `http://localhost:3000`.

## Production deployment

Serve this folder as static HTTPS content behind Nginx, Caddy, Cloudflare Pages, S3/CloudFront, or another static host. Do not expose the license signing private key to this web application. The private key belongs only on the protected backend/control server.

The current frontend keeps its token bundle in `sessionStorage` rather than persistent `localStorage`. A later hardening phase can move refresh authentication to secure HttpOnly cookies if desired.
