import type {
  InventoryAgingBucketResult,
  InventoryAgingMovement,
  InventoryAgingRemainingLayer,
} from './interfaces/inventory-aging-layer.interface';

export const INVENTORY_AGING_BUCKET_KEYS = [
  'days0To30',
  'days31To60',
  'days61To90',
  'days91To180',
  'days181To365',
  'daysOver365',
] as const;

export type InventoryAgingBucketKey = (typeof INVENTORY_AGING_BUCKET_KEYS)[number];

export type InventoryAgingBuckets = Record<InventoryAgingBucketKey, InventoryAgingBucketResult>;

export function calculateRemainingFifoLayers(
  movements: readonly InventoryAgingMovement[],
): InventoryAgingRemainingLayer[] {
  const layers: Array<InventoryAgingRemainingLayer & { remainingQuantity: number }> = [];

  const ordered = [...movements].sort((left, right) => {
    const dateDifference = left.transactionDate.getTime() - right.transactionDate.getTime();
    return dateDifference !== 0 ? dateDifference : left.id.localeCompare(right.id);
  });

  for (const movement of ordered) {
    if (!Number.isFinite(movement.quantity) || movement.quantity < 0) {
      throw new Error('Inventory aging movement quantity must be a non-negative finite number.');
    }

    if (movement.direction === 'in') {
      if (movement.quantity === 0) continue;
      const unitCost = movement.quantity === 0
        ? 0
        : movement.totalCost / movement.quantity;
      layers.push({
        transactionDate: movement.transactionDate,
        quantity: movement.quantity,
        remainingQuantity: movement.quantity,
        unitCost: Number.isFinite(unitCost) ? unitCost : movement.unitCost,
        value: movement.totalCost,
      });
      continue;
    }

    let quantityToConsume = movement.quantity;
    for (const layer of layers) {
      if (quantityToConsume <= 0) break;
      if (layer.remainingQuantity <= 0) continue;
      const consumed = Math.min(layer.remainingQuantity, quantityToConsume);
      layer.remainingQuantity -= consumed;
      quantityToConsume -= consumed;
    }

    if (quantityToConsume > 0.000001) {
      throw new Error('Inventory aging cannot allocate outbound quantity beyond available inbound layers.');
    }
  }

  return layers
    .filter((layer) => layer.remainingQuantity > 0.000001)
    .map((layer) => ({
      transactionDate: layer.transactionDate,
      quantity: round4(layer.remainingQuantity),
      unitCost: round4(layer.unitCost),
      value: round4(layer.remainingQuantity * layer.unitCost),
    }));
}

export function classifyInventoryAging(
  layers: readonly InventoryAgingRemainingLayer[],
  asOfDate: Date,
): InventoryAgingBuckets {
  const buckets = createEmptyBuckets();

  for (const layer of layers) {
    const ageDays = Math.max(
      0,
      Math.floor((asOfDate.getTime() - layer.transactionDate.getTime()) / 86_400_000),
    );
    const key = getBucketKey(ageDays);
    buckets[key].quantity = round4(buckets[key].quantity + layer.quantity);
    buckets[key].value = round4(buckets[key].value + layer.value);
  }

  return buckets;
}

function getBucketKey(ageDays: number): InventoryAgingBucketKey {
  if (ageDays <= 30) return 'days0To30';
  if (ageDays <= 60) return 'days31To60';
  if (ageDays <= 90) return 'days61To90';
  if (ageDays <= 180) return 'days91To180';
  if (ageDays <= 365) return 'days181To365';
  return 'daysOver365';
}

function createEmptyBuckets(): InventoryAgingBuckets {
  return {
    days0To30: { quantity: 0, value: 0 },
    days31To60: { quantity: 0, value: 0 },
    days61To90: { quantity: 0, value: 0 },
    days91To180: { quantity: 0, value: 0 },
    days181To365: { quantity: 0, value: 0 },
    daysOver365: { quantity: 0, value: 0 },
  };
}

function round4(value: number): number {
  return Math.round((value + Number.EPSILON) * 10_000) / 10_000;
}
