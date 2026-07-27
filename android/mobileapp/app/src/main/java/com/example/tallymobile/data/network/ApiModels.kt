package com.example.tallymobile.data.network

import com.google.gson.annotations.SerializedName

data class ApiResponse<T>(
    val success: Boolean,
    val message: String,
    val data: T
)

data class DashboardData(
    val tally: TallyStatus = TallyStatus(),
    val orders: DashboardOrders = DashboardOrders()
)

data class TallyStatus(
    val connected: Boolean = false,
    val responseTimeMilliseconds: Long? = null,
    val checkedAt: String? = null,
    val companyName: String? = null,
    val error: String? = null
)

data class DashboardOrders(
    val pending: Int = 0,
    val failed: Int = 0,
    val synced: Int = 0,
    val total: Int = 0
)

data class CustomerListItem(
    val id: String,
    val name: String,
    val phone: String? = null,
    val email: String? = null,
    val address: String? = null
)

data class ProductListItem(
    val id: String,
    val name: String,
    val sku: String? = null,
    val barcode: String? = null,
    val sellingPrice: Double = 0.0,
    val stock: Double = 0.0,
    val unit: String? = null
)

data class CartItem(
    val product: ProductListItem,
    val quantity: Int = 1
) {
    val subtotal: Double get() = product.sellingPrice * quantity
}

data class CreateSalesOrderRequest(
    val customerId: String,
    val items: List<CreateSalesOrderItemRequest>,
    val notes: String? = null
)

data class CreateSalesOrderItemRequest(
    val productId: String,
    val quantity: Int,
    val unitPrice: Double
)

data class CreateSalesOrderResult(
    val id: String,
    val orderNumber: String,
    val totalAmount: Double = 0.0,
    val syncStatus: String
)

data class SalesOrdersPage(
    val orders: List<SalesOrderSummary> = emptyList(),
    val pagination: Pagination = Pagination()
)

data class Pagination(
    val page: Int = 1,
    val limit: Int = 20,
    val total: Int = 0,
    val totalPages: Int = 0,
    val hasNextPage: Boolean = false,
    val hasPreviousPage: Boolean = false
)

data class SalesOrderSummary(
    val id: String,
    val orderNumber: String,
    val orderDate: String? = null,
    val customerName: String = "Unknown customer",
    val grandTotal: Double = 0.0,
    val status: String = "",
    val syncStatus: String = "pending",
    val tallySyncAttempts: Int = 0,
    val tallySyncError: String? = null,
    val lastSyncedAt: String? = null,
    val createdAt: String? = null
)

data class SalesOrderDetails(
    val id: String,
    val orderNumber: String,
    val orderDate: String? = null,
    val expectedDeliveryDate: String? = null,
    val status: String = "",
    val syncStatus: String = "pending",
    val subtotal: Double = 0.0,
    val taxTotal: Double = 0.0,
    val discountTotal: Double = 0.0,
    val grandTotal: Double = 0.0,
    val notes: String? = null,
    val tallyVoucherId: String? = null,
    val tallyVoucherNumber: String? = null,
    val tallySyncError: String? = null,
    val tallySyncAttempts: Int = 0,
    val lastSyncedAt: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val customer: CustomerListItem,
    val items: List<SalesOrderItemDetails> = emptyList()
)

data class SalesOrderItemDetails(
    val id: String,
    val itemId: String? = null,
    val itemName: String = "",
    val sku: String? = null,
    val quantity: Double = 0.0,
    val unit: String? = null,
    val unitPrice: Double = 0.0,
    val discountPercent: Double = 0.0,
    val taxPercent: Double = 0.0,
    val lineSubtotal: Double = 0.0,
    val lineDiscount: Double = 0.0,
    val lineTax: Double = 0.0,
    val lineTotal: Double = 0.0
)

data class SyncResult(
    val alreadySynced: Boolean? = null,
    val synced: Int? = null,
    val failed: Int? = null
)
