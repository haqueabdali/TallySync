import {
  getMetadataArgsStorage,
} from 'typeorm';

import { ItemEntity } from './item.entity';

describe('Inventory ItemEntity compatibility mapping', () => {
  const columns =
    getMetadataArgsStorage()
      .columns
      .filter(
        (column) =>
          column.target === ItemEntity,
      );

  const databaseNameFor = (
    propertyName: string,
  ): string | undefined => {
    const column =
      columns.find(
        (candidate) =>
          candidate.propertyName ===
          propertyName,
      );

    return typeof column?.options.name ===
      'string'
      ? column.options.name
      : column?.propertyName;
  };

  it('maps legacy salePrice to canonical selling_price', () => {
    expect(
      databaseNameFor('salePrice'),
    ).toBe('selling_price');
  });

  it('maps legacy stockQty to canonical current_stock', () => {
    expect(
      databaseNameFor('stockQty'),
    ).toBe('current_stock');
  });

  it('maps legacy reorderLevel to canonical minimum_stock', () => {
    expect(
      databaseNameFor(
        'reorderLevel',
      ),
    ).toBe('minimum_stock');
  });

  it('uses the canonical item sync enum name', () => {
    const syncColumn =
      columns.find(
        (column) =>
          column.propertyName ===
          'syncStatus',
      );

    expect(
      syncColumn?.options.enumName,
    ).toBe(
      'items_sync_status_enum',
    );
  });
});
