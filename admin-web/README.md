# TallySync Super Admin Web

Owner-only control plane for TallySync commercial licensing.

## Included in V8

- Platform-admin login
- Commercial dashboard
- Customer company creation/edit/activation state
<<<<<<< HEAD
- Guided company-to-license onboarding
=======
>>>>>>> 3f291bdc4089472223df9e24763ba2efc0e96500
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

<<<<<<< HEAD
Create that dedicated identity from the backend after migrations and the
normal customer seed have run:

```bash
export PLATFORM_ADMIN_EMAIL='owner@example.com'
export PLATFORM_ADMIN_PASSWORD='replace-with-a-unique-password-of-at-least-12-characters'
npm run seed:platform-owner
```

Do not reuse the seeded customer administrator's email. The bootstrap command
will reject any email already assigned to a customer company.

=======
>>>>>>> 3f291bdc4089472223df9e24763ba2efc0e96500
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
