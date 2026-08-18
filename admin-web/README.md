# TallySync Super Admin Web

Owner-only control plane for TallySync commercial licensing.

## Included in V8

- Platform-admin login
- Commercial dashboard
- Customer company creation/edit/activation state
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

Super Admin must be a user with:

- `role = admin`
- `companyId = null`

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
