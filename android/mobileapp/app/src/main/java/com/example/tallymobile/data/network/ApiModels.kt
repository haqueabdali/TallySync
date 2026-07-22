package com.example.tallymobile.data.network

data class ApiResponse<T>(
    val success: Boolean,
    val message: String,
    val data: T
)

data class DashboardData(
    val tally: TallyStatus,
    val orders: OrderStatistics,
    val lastSync: LastSync?
)

data class TallyStatus(
    val connected: Boolean,
    val responseTimeMilliseconds: Long?,
    val checkedAt: String,
    val companyName: String?,
    val error: String?
)

data class OrderStatistics(
    val total: Int,
    val pending: Int,
    val syncing: Int,
    val synced: Int,
    val failed: Int
)

data class LastSync(
    val orderId: String,
    val orderNumber: String,
    val syncedAt: String?
)

data class SalesOrderPage(
    val orders: List<SalesOrderSummary>,
    val pagination: Pagination
)

data class Pagination(
    val page: Int,
    val limit: Int,
    val total: Int,
    val totalPages: Int,
    val hasNextPage: Boolean,
    val hasPreviousPage: Boolean
)

data class SalesOrderSummary(
    val id: String,
    val orderNumber: String,
    val orderDate: String?,
    val customerName: String,
    val grandTotal: Double,
    val status: String,
    val syncStatus: String,
    val tallySyncAttempts: Int,
    val tallySyncError: String?,
    val lastSyncedAt: String?,
    val createdAt: String
)

data class SalesOrderDetails(
    val id: String,
    val orderNumber: String,
    val orderDate: String?,
    val expectedDeliveryDate: String?,
    val status: String,
    val syncStatus: String,
    val subtotal: Double,
    val taxTotal: Double,
    val discountTotal: Double,
    val grandTotal: Double,
    val notes: String?,
    val tallyVoucherId: String?,
    val tallyVoucherNumber: String?,
    val tallySyncError: String?,
    val tallySyncAttempts: Int,
    val lastSyncedAt: String?,
    val createdAt: String,
    val updatedAt: String,
    val customer: CustomerSummary,
    val items: List<SalesOrderItem>
)

data class CustomerSummary(
    val id: String,
    val name: String,
    val phone: String?,
    val email: String?,
    val address: String?
)

data class SalesOrderItem(
    val id: String,
    val itemId: String?,
    val itemName: String,
    val sku: String?,
    val quantity: Double,
    val unit: String?,
    val unitPrice: Double,
    val discountPercent: Double,
    val taxPercent: Double,
    val lineSubtotal: Double,
    val lineDiscount: Double,
    val lineTax: Double,
    val lineTotal: Double
)

data class SyncResult(
    val orderId: String?,
    val orderNumber: String?,
    val alreadySynced: Boolean?
)

data class BulkSyncResult(
    val total: Int,
    val synced: Int,
    val alreadySynced: Int,
    val failed: Int,
    val results: List<BulkSyncItem>
)

data class BulkSyncItem(
    val orderId: String,
    val orderNumber: String,
    val status: String,
    val error: String?
)
