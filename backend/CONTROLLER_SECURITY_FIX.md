# Controller security findings

The audit found mutation endpoints in these controllers without a detected
JwtAuthGuard/AuthGuard:

- src/background-jobs/background-jobs.controller.ts
- src/bill-of-materials/bill-of-materials.controller.ts
- src/landed-costs/landed-costs.controller.ts
- src/mobile/mobile.controller.ts
- src/production-orders/production-orders.controller.ts
- src/tally-sync/tally-sync.controller.ts

## Baseline fix

For ERP mutation APIs, authentication should be required unless a route is
explicitly designed to be public.

For each controller that is not intentionally public:

```ts
import {
  // existing imports...
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
```

Then add at class level:

```ts
@UseGuards(JwtAuthGuard)
```

Example:

```ts
@Controller('production-orders')
@UseGuards(JwtAuthGuard)
export class ProductionOrdersController {
  // ...
}
```

Do not add `@Roles(...)` blindly. Role restrictions should follow the business
permission model for each operation.
