import { BadRequestException } from '@nestjs/common';
import { FifoAllocator } from './fifo-allocator';

describe('FifoAllocator', () => {
  const allocator = new FifoAllocator();

  it('consumes the oldest layers first', () => {
    const result = allocator.allocate(
      [
        { id: 'layer-1', remainingQuantity: 5, unitCost: 10 },
        { id: 'layer-2', remainingQuantity: 7, unitCost: 12 },
      ],
      8,
    );

    expect(result).toEqual([
      { costLayerId: 'layer-1', quantity: 5, unitCost: 10, totalCost: 50 },
      { costLayerId: 'layer-2', quantity: 3, unitCost: 12, totalCost: 36 },
    ]);
  });

  it('rejects an issue larger than available FIFO layers', () => {
    expect(() =>
      allocator.allocate(
        [{ id: 'layer-1', remainingQuantity: 2, unitCost: 10 }],
        3,
      ),
    ).toThrow(BadRequestException);
  });

  it('rejects non-positive quantities', () => {
    expect(() => allocator.allocate([], 0)).toThrow(BadRequestException);
  });
});
