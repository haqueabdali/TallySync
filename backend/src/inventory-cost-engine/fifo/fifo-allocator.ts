import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  FifoAllocationResult,
  FifoLayerSnapshot,
} from './interfaces/fifo-transaction.interface';

@Injectable()
export class FifoAllocator {
  allocate(
    layers: readonly FifoLayerSnapshot[],
    requestedQuantity: number,
  ): FifoAllocationResult[] {
    this.assertPositive(requestedQuantity, 'Issue quantity');

    let remaining = this.roundQuantity(requestedQuantity);
    const allocations: FifoAllocationResult[] = [];

    for (const layer of layers) {
      if (remaining <= 0) break;
      if (layer.remainingQuantity <= 0) continue;

      const quantity = this.roundQuantity(
        Math.min(layer.remainingQuantity, remaining),
      );
      const totalCost = this.roundValue(quantity * layer.unitCost);

      allocations.push({
        costLayerId: layer.id,
        quantity,
        unitCost: this.roundUnitCost(layer.unitCost),
        totalCost,
      });
      remaining = this.roundQuantity(remaining - quantity);
    }

    if (remaining > 0) {
      throw new BadRequestException(
        `Insufficient FIFO stock. Missing quantity: ${remaining.toFixed(4)}.`,
      );
    }

    return allocations;
  }

  private assertPositive(value: number, label: string): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new BadRequestException(`${label} must be greater than zero.`);
    }
  }

  private roundQuantity(value: number): number {
    return Number(value.toFixed(4));
  }

  private roundUnitCost(value: number): number {
    return Number(value.toFixed(6));
  }

  private roundValue(value: number): number {
    return Number(value.toFixed(4));
  }
}
