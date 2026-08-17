# TallySync Success Map — Executable Readiness Stage

Instead of manually maintaining percentages, use:

```bash
npm run release:readiness
```

as the authoritative current state.

## Required production-candidate gates

```text
Build                               REQUIRED
Security audit                      REQUIRED
Entity ↔ DB audit                   REQUIRED
Accounting idempotency              REQUIRED
Manufacturing fix analyzer          REQUIRED when installed
Manufacturing contract report       REQUIRED when installed
Unit suite                          REQUIRED
Sales-to-Cash E2E                   REQUIRED when installed
Procure-to-Pay E2E                  REQUIRED when installed
```

## Manufacturing promotion gates

```text
Manufacturing E2E                   OPTIONAL until implemented
Manufacturing release gate          OPTIONAL until implemented
```

Once those two pass, change them to required in
`production-readiness-gate.ts`.

## Current conceptual map

```text
Core platform                       ~97%
Commercial ERP                      ~93%
Accounting                          ~94%
Inventory / costing                 ~90%
Returns                             ~80–85%
Manufacturing functionality         ~88%
Manufacturing integration           ~60–65%
Reporting                           ~85%
Security / release quality          ~91%
Deployment                          ~72%
```

But from this stage onward, the generated readiness report should be treated as
more important than these estimates.

## Promotion levels

```text
< 80% gate score
    NOT READY

80–89%
    STABILIZATION

90–99%
    RELEASE CANDIDATE, remaining failures visible

100% required + optional manufacturing failures
    COMMERCIAL PRODUCTION CANDIDATE

100% all gates
    BACKEND PRODUCTION CANDIDATE
```

Docker/container deployment remains a separate infrastructure gate until local
virtualization is available.
