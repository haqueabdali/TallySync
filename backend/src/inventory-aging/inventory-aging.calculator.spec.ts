import {
  calculateRemainingFifoLayers,
  classifyInventoryAging,
} from './inventory-aging.calculator';

const date = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

describe('inventory aging calculator', () => {
  it('consumes oldest receipt layers first', () => {
    const layers = calculateRemainingFifoLayers([
      { id: '1', transactionDate: date('2025-01-01'), quantity: 10, unitCost: 5, totalCost: 50, direction: 'in' },
      { id: '2', transactionDate: date('2025-02-01'), quantity: 10, unitCost: 7, totalCost: 70, direction: 'in' },
      { id: '3', transactionDate: date('2025-03-01'), quantity: 12, unitCost: 0, totalCost: 0, direction: 'out' },
    ]);

    expect(layers).toEqual([
      { transactionDate: date('2025-02-01'), quantity: 8, unitCost: 7, value: 56 },
    ]);
  });

  it('classifies remaining layers into age buckets', () => {
    const buckets = classifyInventoryAging([
      { transactionDate: date('2025-12-15'), quantity: 2, unitCost: 5, value: 10 },
      { transactionDate: date('2025-06-01'), quantity: 3, unitCost: 8, value: 24 },
    ], date('2026-01-01'));

    expect(buckets.days0To30).toEqual({ quantity: 2, value: 10 });
    expect(buckets.days181To365).toEqual({ quantity: 3, value: 24 });
  });
});
