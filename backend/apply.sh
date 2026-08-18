#!/usr/bin/env bash
set -euo pipefail
TARGET="${1:-}"
if [[ -z "$TARGET" ]]; then
  echo "Usage: bash apply.sh /e/TallySync/backend"
  exit 1
fi
ROOT="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$TARGET/test/helpers"
cp "$ROOT/src/users/users.service.spec.ts" "$TARGET/src/users/users.service.spec.ts"
cp "$ROOT/src/production-orders/production-orders.controller.completion.spec.ts" "$TARGET/src/production-orders/production-orders.controller.completion.spec.ts"
cp "$ROOT/test/helpers/ensure-e2e-commercial-license.ts" "$TARGET/test/helpers/ensure-e2e-commercial-license.ts"
cp "$ROOT/test/procure-to-pay.e2e-spec.ts" "$TARGET/test/procure-to-pay.e2e-spec.ts"
cp "$ROOT/test/sales-to-cash.e2e-spec.ts" "$TARGET/test/sales-to-cash.e2e-spec.ts"
echo "TallySync full-project compatibility V4 applied to: $TARGET"
