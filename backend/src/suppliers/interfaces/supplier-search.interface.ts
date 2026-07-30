import type { SupplierSortField, SupplierSortOrder } from '../dto/supplier-filter.dto';
export interface SupplierSearchOptions { companyId: string; page: number; limit: number; search?: string; city?: string; country?: string; isActive?: boolean; sortBy: SupplierSortField; sortOrder: SupplierSortOrder; }
export interface PaginationMeta { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean; }
export interface PaginatedResult<T> { data: T[]; meta: PaginationMeta; }
