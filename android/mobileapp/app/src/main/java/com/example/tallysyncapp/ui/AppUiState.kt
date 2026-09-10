package com.example.tallysyncapp.ui

import com.example.tallysyncapp.data.local.entity.PendingOrderEntity
import com.example.tallysyncapp.data.network.CartItem
import com.example.tallysyncapp.data.network.CreateSalesOrderResult
import com.example.tallysyncapp.data.network.CustomerListItem
import com.example.tallysyncapp.data.network.CustomerRecord
import com.example.tallysyncapp.data.network.DashboardData
import com.example.tallysyncapp.data.network.ProductListItem
import com.example.tallysyncapp.data.network.ProductRecord
import com.example.tallysyncapp.data.network.SalesOrderDetails
import com.example.tallysyncapp.data.network.SalesOrderSummary
import com.example.tallysyncapp.data.network.SupplierListItem
import com.example.tallysyncapp.report.ReportRange
import com.example.tallysyncapp.data.network.PurchaseOrderRecord
import com.example.tallysyncapp.data.network.WarehouseListItem


data class AppUiState(
    val dashboard: DashboardData? = null,
    val customers: List<CustomerListItem> = emptyList(),
    val products: List<ProductListItem> = emptyList(),
    val orders: List<SalesOrderSummary> = emptyList(),
    val cartItems: List<CartItem> = emptyList(),
    val selectedCustomer: CustomerListItem? = null,
    val selectedOrder: SalesOrderDetails? = null,
    val createdOrder: CreateSalesOrderResult? = null,
    val viewedCustomer: CustomerListItem? = null,
    val customerRecord: CustomerRecord? = null,
    val productRecord: ProductRecord? = null,
    val customerOrders: List<SalesOrderSummary> = emptyList(),
    val customerSearch: String = "",
    val productSearch: String = "",
    val orderNotes: String = "",
    val selectedFilter: String? = null,
    val suppliers: List<SupplierListItem> = emptyList(),
    val selectedSupplier: SupplierListItem? = null,
    val supplierRecord: SupplierListItem? = null,
    val supplierSearch: String = "",
    val isSavingSupplier: Boolean = false,
    val isSavingCustomer: Boolean = false,
    val isSavingProduct: Boolean = false,
    val isSyncingTallyMaster: Boolean = false,
    val reportOrders: List<SalesOrderSummary> = emptyList(),
    val reportRange: ReportRange = ReportRange.LAST_30_DAYS,
    val isOnline: Boolean = true,
    val localPendingOrders: Int = 0,
    val localPendingOrderItems: List<PendingOrderEntity> = emptyList(),
    val loading: Boolean = false,
    val isSubmittingOrder: Boolean = false,
    val error: String? = null,
    val message: String? = null,
    val warehouses: List<WarehouseListItem> = emptyList(),
    val purchaseOrders: List<PurchaseOrderRecord> = emptyList(),
    val purchaseOrderRecord: PurchaseOrderRecord? = null,
    val purchaseOrderSearch: String = "",
    val purchaseOrderStatusFilter: String? = null,
    val isSavingPurchaseOrder: Boolean = false,
    val isChangingPurchaseOrderStatus: Boolean = false,
)
