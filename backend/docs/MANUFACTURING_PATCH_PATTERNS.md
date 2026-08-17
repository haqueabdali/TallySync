# Manufacturing Integrity Patch Patterns

Use these patterns only where the generated
`artifacts/manufacturing-fix-report.md` points to an actual method.

## 1. Atomic Material Consumption

```ts
return this.dataSource.transaction(
  async (manager) => {
    const orderRepository =
      manager.getRepository(
        ProductionOrderEntity,
      );

    const itemRepository =
      manager.getRepository(
        ItemEntity,
      );

    const order =
      await orderRepository
        .createQueryBuilder(
          'productionOrder',
        )
        .setLock(
          'pessimistic_write',
        )
        .where(
          'productionOrder.id = :id',
          { id: productionOrderId },
        )
        .andWhere(
          'productionOrder.company_id = :companyId',
          { companyId },
        )
        .getOne();

    if (!order) {
      throw new NotFoundException(
        'Production order not found',
      );
    }

    for (const line of lines) {
      const item =
        await itemRepository
          .createQueryBuilder(
            'item',
          )
          .setLock(
            'pessimistic_write',
          )
          .where(
            'item.id = :itemId',
            {
              itemId:
                line.itemId,
            },
          )
          .andWhere(
            'item.company_id = :companyId',
            { companyId },
          )
          .getOne();

      if (!item) {
        throw new NotFoundException(
          `Item ${line.itemId} not found`,
        );
      }

      const currentStock =
        Number(
          item.currentStock,
        );

      if (
        currentStock <
        line.quantity
      ) {
        throw new ConflictException(
          `Insufficient stock for ${line.itemId}`,
        );
      }

      item.currentStock =
        currentStock -
        line.quantity;

      await itemRepository.save(
        item,
      );
    }

    // Save consumption header/lines
    // using manager repositories here.

    return savedConsumption;
  },
);
```

## 2. Exactly-once Production Completion

```ts
const existing =
  await this.productionOrderRepository.findOne({
    where: {
      id,
      companyId,
    },
  });

if (!existing) {
  throw new NotFoundException(
    'Production order not found',
  );
}

if (
  existing.status ===
  ProductionOrderStatus.COMPLETED
) {
  return this.toResponse(
    existing,
  );
}

return this.dataSource.transaction(
  async (manager) => {
    const orderRepository =
      manager.getRepository(
        ProductionOrderEntity,
      );

    const itemRepository =
      manager.getRepository(
        ItemEntity,
      );

    const order =
      await orderRepository
        .createQueryBuilder(
          'productionOrder',
        )
        .setLock(
          'pessimistic_write',
        )
        .where(
          'productionOrder.id = :id',
          { id },
        )
        .andWhere(
          'productionOrder.company_id = :companyId',
          { companyId },
        )
        .getOne();

    if (!order) {
      throw new NotFoundException(
        'Production order not found',
      );
    }

    if (
      order.status ===
      ProductionOrderStatus.COMPLETED
    ) {
      return order;
    }

    // Validate valid lifecycle status.

    const finishedItem =
      await itemRepository
        .createQueryBuilder(
          'item',
        )
        .setLock(
          'pessimistic_write',
        )
        .where(
          'item.id = :itemId',
          {
            itemId:
              order.itemId,
          },
        )
        .andWhere(
          'item.company_id = :companyId',
          { companyId },
        )
        .getOne();

    if (!finishedItem) {
      throw new NotFoundException(
        'Finished item not found',
      );
    }

    finishedItem.currentStock =
      Number(
        finishedItem.currentStock,
      ) +
      Number(
        order.quantity,
      );

    await itemRepository.save(
      finishedItem,
    );

    order.status =
      ProductionOrderStatus.COMPLETED;

    order.completedAt =
      new Date();

    return orderRepository.save(
      order,
    );
  },
);
```

## 3. MRP Must Be Read-only

MRP may:

```text
read BOM
read production demand
read currentStock
read open supply
calculate shortage
return recommendations
```

MRP must NOT:

```text
save ItemEntity
change currentStock
create material consumption
complete production
create stock movements
```

If the fix analyzer reports `mrp-mutation`, remove stock writes from that
method and move execution into an explicit production/material transaction.

## 4. Cross-company invariant

Every critical lookup should include:

```ts
where: {
  id,
  companyId,
}
```

or the equivalent query-builder predicate.

Never validate the company only on the production order and then load component
items by bare ID.

## 5. Stock contract

Use only:

```ts
item.currentStock
```

Do not restore:

```text
stockQty
currentQty
quantityOnHand
onHand
```

Historical project errors already showed how parallel stock contracts destabilize
the inventory layer.
