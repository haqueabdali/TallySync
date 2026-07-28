package com.example.tallysyncapp.ui

import com.example.tallysyncapp.data.network.CartItem
import com.example.tallysyncapp.data.network.CustomerListItem
import com.example.tallysyncapp.data.network.DashboardData
import com.example.tallysyncapp.data.network.ProductListItem
import com.example.tallysyncapp.data.network.SalesOrderSummary
import com.example.tallysyncapp.data.network.SalesOrderDetails
import com.example.tallysyncapp.data.network.CreateSalesOrderResult

data class AppUiState(
    val dashboard: DashboardData? = null,
    val customers: List<CustomerListItem> = emptyList(),
    val products: List<ProductListItem> = emptyList(),
    val orders: List<SalesOrderSummary> = emptyList(),
    val cartItems: List<CartItem> = emptyList(),
    
    val selectedCustomer: CustomerListItem? = null,
    val selectedOrder: SalesOrderDetails? = null,
    val createdOrder: CreateSalesOrderResult? = null,
    
    val customerSearch: String = "",
    val productSearch: String = "",
    val orderNotes: String = "",
    
    val isOnline: Boolean = true,
    val localPendingOrders: Int = 0,
    val loading: Boolean = false,
    val isSubmittingOrder: Boolean = false,
    
    val error: String? = null,
    val message: String? = null
)
