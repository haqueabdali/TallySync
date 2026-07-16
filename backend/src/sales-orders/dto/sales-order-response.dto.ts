import {
  SalesOrderStatus,
  SalesOrderSyncStatus,
} from '../entities/sales-order.entity';

export class CustomerResponseDto {
  id: string;

  companyId: string;

  name: string;

  email: string | null;

  phone: string | null;

  address: string | null;

  tallyLedgerName: string | null;

  creditLimit: number;

  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}

export class PaginatedCustomersResponseDto {
  data: CustomerResponseDto[];

  page: number;

  limit: number;

  total: number;

  totalPages: number;
}

export class SalesOrderCustomerSummaryDto {
  id: string;

  name: string;

  email: string | null;

  phone: string | null;

  tallyLedgerName: string | null;
}

export class SalesOrderItemResponseDto {
  id: string;

  itemId: string;

  itemName: string;

  sku: string | null;

  quantity: number;

  unit: string;

  unitPrice: number;

  discountPercent: number;

  taxPercent: number;

  lineSubtotal: number;

  lineDiscount: number;

  lineTax: number;

  lineTotal: number;
}

export class SalesOrderResponseDto {
  id: string;

  companyId: string;

  customerId: string;

  createdBy: string;

  orderNumber: string;

  orderDate: string;

  expectedDeliveryDate: string | null;

  status: SalesOrderStatus;

  subtotal: number;

  taxTotal: number;

  discountTotal: number;

  grandTotal: number;

  notes: string | null;

  approvalRequired: boolean;

  approvedBy: string | null;

  approvedAt: Date | null;

  rejectionReason: string | null;

  syncStatus: SalesOrderSyncStatus;

  lastSyncedAt: Date | null;

  customer: SalesOrderCustomerSummaryDto;

  items: SalesOrderItemResponseDto[];

  createdAt: Date;

  updatedAt: Date;
}

export class PaginatedSalesOrdersResponseDto {
  data: SalesOrderResponseDto[];

  page: number;

  limit: number;

  total: number;

  totalPages: number;
}

export class SalesOrderSummaryResponseDto {
  totalOrders: number;

  draftOrders: number;

  submittedOrders: number;

  approvedOrders: number;

  rejectedOrders: number;

  fulfilledOrders: number;

  cancelledOrders: number;

  pendingSyncOrders: number;

  syncedOrders: number;

  failedSyncOrders: number;

  totalSalesValue: number;
}

export class MessageResponseDto {
  message: string;
}
