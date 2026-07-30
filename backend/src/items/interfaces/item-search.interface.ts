import { ItemSyncStatus } from '../enums/item-sync-status.enum';

export type ItemSearchSortField =
  | 'name'
  | 'sku'
  | 'sellingPrice'
  | 'purchasePrice'
  | 'currentStock'
  | 'createdAt'
  | 'updatedAt';

export type ItemSearchSortOrder = 'ASC' | 'DESC';

export interface ItemSearchOptions {
  companyId: string;
  page: number;
  limit: number;
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  lowStock?: boolean;
  outOfStock?: boolean;
  trackInventory?: boolean;
  syncStatus?: ItemSyncStatus;
  sortBy?: ItemSearchSortField;
  sortOrder?: ItemSearchSortOrder;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}
