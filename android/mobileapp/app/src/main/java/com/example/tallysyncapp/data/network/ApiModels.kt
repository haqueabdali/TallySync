package com.example.tallysyncapp.data.network

import com.google.gson.annotations.SerializedName

data class ApiResponse<T>(
    val success: Boolean,
    val message: String,
    val data: T
)

data class DashboardData(
    val totalOrders: Int = 0,
    val pendingSync: Int = 0,
    val failedSync: Int = 0,
    val totalSales: Double = 0.0,
    val todayOrders: Int = 0,
    val todaySales: Double = 0.0,
    val totalCustomers: Int = 0,
    val totalProducts: Int = 0,
    val lowStockProducts: Int = 0,
    val recentOrders: List<SalesOrderSummary> = emptyList(),
    val tally: TallyStatus = TallyStatus()
)

data class TallyStatus(
    val connected: Boolean = false,
    val responseTimeMilliseconds: Long? = null,
    val checkedAt: String? = null,
    val companyName: String? = null,
    val error: String? = null
)

data class CustomerListItem(
    val id: String,
    val name: String,
    val phone: String? = null,
    val email: String? = null,
    val address: String? = null
)

data class UpdateActiveStatusRequest(
    val isActive: Boolean
)

data class SaveCustomerRequest(
    val name: String,
    val email: String? = null,
    val phone: String? = null,
    val address: String? = null,
    val tallyLedgerName: String? = null,
    val creditLimit: Double = 0.0
)

data class CustomerRecord(
    val id: String,
    val companyId: String,
    val name: String,
    val email: String? = null,
    val phone: String? = null,
    val address: String? = null,
    val tallyLedgerId: String? = null,
    val tallyLedgerName: String? = null,
    val tallyAlterId: String? = null,
    val creditLimit: Double = 0.0,
    val isActive: Boolean = true,
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val deletedAt: String? = null
)

data class CustomerMasterSyncResult(
    val success: Boolean = false,
    val customerId: String,
    val customerName: String,
    val tallyLedgerName: String,
    val tallyLedgerId: String,
    val tallyAlterId: String? = null
)

data class ProductMasterSyncResult(
    val success: Boolean = false,
    val itemId: String,
    val itemName: String,
    val tallyItemName: String,
    val tallyStockItemId: String,
    val tallyAlterId: String? = null,
    val syncStatus: String = "pending"
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

data class SaveProductRequest(
    val sku: String,
    val barcode: String? = null,
    val name: String,
    val description: String? = null,
    val unit: String = "PCS",
    val purchasePrice: Double = 0.0,
    val sellingPrice: Double = 0.0,
    val taxRate: Double = 0.0,
    val openingStock: Double = 0.0,
    val minimumStock: Double = 0.0,
    val trackInventory: Boolean = true,
    val hsnCode: String? = null,
    val isActive: Boolean = true
)

data class ProductRecord(
    val id: String,
    val companyId: String,
    val categoryId: String? = null,
    val sku: String,
    val barcode: String? = null,
    val name: String,
    val description: String? = null,
    val unit: String = "PCS",
    val purchasePrice: Double = 0.0,
    val sellingPrice: Double = 0.0,
    val taxRate: Double = 0.0,
    val openingStock: Double = 0.0,
    val currentStock: Double = 0.0,
    val minimumStock: Double = 0.0,
    val trackInventory: Boolean = true,
    val hsnCode: String? = null,
    val tallyStockItemId: String? = null,
    val syncStatus: String = "pending",
    val syncError: String? = null,
    val lastSyncedAt: String? = null,
    val isActive: Boolean = true,
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val deletedAt: String? = null,
    val isLowStock: Boolean = false,
    val isOutOfStock: Boolean = false
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

data class SalesOrderLifecycleResult(
    val id: String,
    val orderNumber: String,
    val status: String,
    val grandTotal: Double = 0.0
)

data class SyncResult(
    val alreadySynced: Boolean? = null,
    val synced: Int? = null,
    val failed: Int? = null
)

data class SupplierListItem(
    val id: String,
    val companyId: String? = null,
    val supplierCode: String,
    val name: String,
    val companyName: String? = null,
    val contactPerson: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val mobile: String? = null,
    val taxNumber: String? = null,
    val vatNumber: String? = null,
    val billingAddress: String? = null,
    val shippingAddress: String? = null,
    val city: String? = null,
    val state: String? = null,
    val postalCode: String? = null,
    val country: String? = null,
    val creditLimit: Double = 0.0,
    val openingBalance: Double = 0.0,
    val currentBalance: Double = 0.0,
    val currency: String = "EUR",
    val paymentTerms: Int = 0,
    val notes: String? = null,
    val isActive: Boolean = true,
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val deletedAt: String? = null
)

data class SaveSupplierRequest(
    val name: String,
    val companyName: String? = null,
    val contactPerson: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val mobile: String? = null,
    val taxNumber: String? = null,
    val vatNumber: String? = null,
    val billingAddress: String? = null,
    val shippingAddress: String? = null,
    val city: String? = null,
    val state: String? = null,
    val postalCode: String? = null,
    val country: String? = null,
    val creditLimit: Double = 0.0,
    val openingBalance: Double = 0.0,
    val currency: String = "EUR",
    val paymentTerms: Int = 0,
    val notes: String? = null,
    val isActive: Boolean = true
)

data class WarehouseListItem(
    val id: String,
    val companyId: String,
    val warehouseCode: String,
    val name: String,
    val description: String? = null,
    val contactPerson: String? = null,
    val phone: String? = null,
    val email: String? = null,
    val address: String? = null,
    val city: String? = null,
    val state: String? = null,
    val postalCode: String? = null,
    val country: String? = null,
    val isDefault: Boolean = false,
    val isActive: Boolean = true,
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val deletedAt: String? = null
)

data class WarehousesPage(
    val data: List<WarehouseListItem> = emptyList(),
    val meta: Pagination = Pagination()
)

data class PurchaseOrderItemRequest(
    val itemId: String,
    val quantity: Double,
    val unitPrice: Double,

    @SerializedName("discountPercent")
    val discountPercentage: Double = 0.0,

    @SerializedName("taxPercent")
    val taxRate: Double = 0.0
)

data class SavePurchaseOrderRequest(
    val supplierId: String,
    val warehouseId: String,
    val poDate: String,

    @SerializedName("expectedDate")
    val expectedDeliveryDate: String? = null,

    val currency: String = "EUR",

    @SerializedName("shippingTotal")
    val shippingAmount: Double = 0.0,

    val notes: String? = null,
    val items: List<PurchaseOrderItemRequest>
)

data class PurchaseOrderItemRecord(
    val id: String,
    val purchaseOrderId: String? = null,
    val itemId: String,
    val itemName: String? = null,
    val itemSku: String? = null,
    val quantity: Double = 0.0,
    val receivedQuantity: Double = 0.0,
    val unitPrice: Double = 0.0,

    @SerializedName("discountPercent")
    val discountPercentage: Double = 0.0,

    val discountAmount: Double = 0.0,

    @SerializedName("taxPercent")
    val taxRate: Double = 0.0,

    val taxAmount: Double = 0.0,
    val lineSubtotal: Double = 0.0,
    val lineTotal: Double = 0.0
)

data class PurchaseOrderRecord(
    val id: String,
    val companyId: String? = null,
    val poNumber: String,
    val supplierId: String,
    val supplierName: String? = null,
    val warehouseId: String,
    val warehouseName: String? = null,
    val poDate: String,

    @SerializedName("expectedDate")
    val expectedDeliveryDate: String? = null,

    val status: String = "draft",
    val currency: String = "EUR",
    val subtotal: Double = 0.0,

    @SerializedName("discountTotal")
    val discountAmount: Double = 0.0,

    @SerializedName("taxTotal")
    val taxAmount: Double = 0.0,

    @SerializedName("shippingTotal")
    val shippingAmount: Double = 0.0,

    val grandTotal: Double = 0.0,
    val notes: String? = null,
    val items: List<PurchaseOrderItemRecord> = emptyList(),
    val createdAt: String? = null,
    val updatedAt: String? = null
)

data class PurchaseOrdersPage(
    val data: List<PurchaseOrderRecord> = emptyList(),
    val meta: Pagination = Pagination()
)