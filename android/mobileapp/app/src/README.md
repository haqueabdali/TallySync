# Auth + Users V1

A simple JWT authentication and user-management foundation for the NestJS ERP backend.

## Features

- Email/password login
- Short-lived access token
- Rotating refresh token
- Logout/revoke refresh token
- Current-user profile endpoint
- User CRUD
- Roles: admin, manager, sales, warehouse, cashier
- Role guard
- Password hashing with bcrypt
- PostgreSQL + TypeORM entities
- Android-friendly API responses through your existing global interceptor

## Required packages

```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm install -D @types/passport-jwt @types/bcrypt
```

## Environment variables

```env
JWT_ACCESS_SECRET=replace-with-a-long-random-secret
JWT_REFRESH_SECRET=replace-with-another-long-random-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
```

## Copy folders

Copy:

```text
auth/
users/
```

into:

```text
src/auth/
src/users/
```

Then add `UsersModule` and `AuthModule` to `AppModule`.

## First administrator

Because user creation is protected for administrators, create the first admin either:

1. through a database seed, or
2. temporarily call `UsersService.create()` from a bootstrap script.

A sample bootstrap seed is included in `FIRST_ADMIN_SEED.ts`.

## Endpoints

```http
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/profile

GET    /api/v1/users
GET    /api/v1/users/:id
POST   /api/v1/users
PATCH  /api/v1/users/:id
DELETE /api/v1/users/:id
```
