import { BadRequestException, ConflictException } from '@nestjs/common';
import type {
  MovingAverageBalanceSnapshot,
  MovingAverageCalculationResult,
} from './interfaces/moving-average-transaction.interface';

export class MovingAverageCalculator {
  calculateReceipt(
    balance: MovingAverageBalanceSnapshot,
    quantity: number,
    unitCost: number,
  ): MovingAverageCalculationResult {
    this.validateBalance(balance);
    this.validateQuantity(quantity);
    this.validateUnitCost(unitCost);

    const totalCost = this.round4(quantity * unitCost);
    const quantityAfter = this.round4(balance.quantity + quantity);
    const inventoryValueAfter = this.round4(
      balance.inventoryValue + totalCost,
    );
    const averageUnitCostAfter = this.round6(
      inventoryValueAfter / quantityAfter,
    );

    return {
      quantity: this.round4(quantity),
      unitCost: this.round6(unitCost),
      totalCost,
      quantityAfter,
      averageUnitCostAfter,
      inventoryValueAfter,
    };
  }

  calculateIssue(
    balance: MovingAverageBalanceSnapshot,
    quantity: number,
  ): MovingAverageCalculationResult {
    this.validateBalance(balance);
    this.validateQuantity(quantity);

    const normalizedQuantity = this.round4(quantity);
    if (normalizedQuantity > balance.quantity) {
      throw new ConflictException(
        'Moving-average issue would create negative warehouse stock.',
      );
    }

    const unitCost = this.round6(balance.averageUnitCost);
    const totalCost = this.round4(normalizedQuantity * unitCost);
    const quantityAfter = this.round4(balance.quantity - normalizedQuantity);
    const inventoryValueAfter =
      quantityAfter === 0
        ? 0
        : this.round4(balance.inventoryValue - totalCost);

    if (inventoryValueAfter < 0) {
      throw new ConflictException(
        'Moving-average issue would create negative inventory value.',
      );
    }

    return {
      quantity: normalizedQuantity,
      unitCost,
      totalCost,
      quantityAfter,
      averageUnitCostAfter: quantityAfter === 0 ? 0 : unitCost,
      inventoryValueAfter,
    };
  }

  private validateBalance(balance: MovingAverageBalanceSnapshot): void {
    if (
      !Number.isFinite(balance.quantity) ||
      !Number.isFinite(balance.averageUnitCost) ||
      !Number.isFinite(balance.inventoryValue) ||
      balance.quantity < 0 ||
      balance.averageUnitCost < 0 ||
      balance.inventoryValue < 0
    ) {
      throw new BadRequestException('Inventory cost balance is invalid.');
    }
  }

  private validateQuantity(quantity: number): void {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than zero.');
    }
  }

  private validateUnitCost(unitCost: number): void {
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      throw new BadRequestException('Unit cost cannot be negative.');
    }
  }

  private round4(value: number): number {
    return Math.round((value + Number.EPSILON) * 10_000) / 10_000;
  }

  private round6(value: number): number {
    return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
  }
}
