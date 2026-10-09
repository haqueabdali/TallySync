#!/usr/bin/env bash
set -euo pipefail

echo "=== Stage 6U pre-patch verification ==="

required=(
"backend/src/mobile/dto/create-mobile-sales-order.dto.ts"
"backend/src/mobile/mobile.service.ts"
"backend/src/sales-orders/entities/sales-order.entity.ts"
"android/mobileapp/app/src/main/java/com/example/tallysyncapp/data/local/entity/PendingOrderEntity.kt"
"android/mobileapp/app/src/main/java/com/example/tallysyncapp/data/local/dao/PendingOrderDao.kt"
"android/mobileapp/app/src/main/java/com/example/tallysyncapp/data/repository/OfflineOrderRepository.kt"
"android/mobileapp/app/src/main/java/com/example/tallysyncapp/worker/OrderSyncWorker.kt"
"android/mobileapp/app/src/main/java/com/example/tallysyncapp/ui/AppViewModel.kt"
)

for f in "${required[@]}"; do
    if [ -f "$f" ]; then
        echo "OK: $f"
    else
        echo "MISSING: $f"
        exit 1
    fi
done

echo
echo "All Stage 6U source files found."
