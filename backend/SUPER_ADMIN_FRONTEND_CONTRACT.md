# TallySync Super Admin Web — Backend Contract

The future owner-only web dashboard should use these platform endpoints.

## Dashboard

- `GET /api/v1/platform/licenses/dashboard`
- Show total, active, suspended, revoked and expired licenses.

## Companies / Licenses

- `GET /api/v1/platform/licenses`
- `GET /api/v1/platform/licenses/:id`
- `POST /api/v1/platform/licenses`
- `PATCH /api/v1/platform/licenses/:id`
- `POST /api/v1/platform/licenses/:id/activate`
- `POST /api/v1/platform/licenses/:id/suspend`
- `POST /api/v1/platform/licenses/:id/revoke`

## Module switches

- `PUT /api/v1/platform/licenses/:id/features`

The UI should render switches for Accounting, Inventory, Sales, Purchase, Manufacturing, WIP, Costing, VAT, Assets, Bank Reconciliation, Reporting, Mobile, API and Notifications.

## Usage card

- `GET /api/v1/platform/licenses/:id/usage`

Show active users, user limit, remaining seats, utilization percentage, active installations and concurrent-user entitlement.

## Installation authorization

- `POST /api/v1/platform/licenses/:id/activations`
- `POST /api/v1/platform/licenses/:id/activations/:activationId/revoke`

## Version control

License create/update already supports `minimumVersion` and `maximumVersion`.
The customer app can validate its version using:

- `GET /api/v1/licensing/me/version/:version`

## Customer application bootstrap

- `GET /api/v1/licensing/me`

The normal customer web/mobile app should call this after authentication and use the returned feature entitlements to build its navigation. The backend independently enforces the same feature entitlement.
