package com.example.tallysyncapp.mobile.order

import com.example.tallysyncapp.data.network.CartItem
import com.example.tallysyncapp.data.network.CustomerListItem
import com.example.tallysyncapp.data.network.ProductListItem

data class OrderUiState(

    val customers: List<CustomerListItem> = emptyList(),
    val products: List<ProductListItem> = emptyList(),

    val selectedCustomer: CustomerListItem? = null,
    val cartItems: List<CartItem> = emptyList(),

    val customerSearchQuery: String = "",
    val productSearchQuery: String = "",
    val notes: String = "",

    val isLoadingCustomers: Boolean = false,
    val isLoadingProducts: Boolean = false,
    val isSubmitting: Boolean = false,

    val createdOrderId: String? = null,
    val createdOrderNumber: String? = null,

    val errorMessage: String? = null
) {

    val filteredCustomers: List<CustomerListItem>
        get() =
            if (customerSearchQuery.isBlank()) {
                customers
            } else {
                customers.filter {
                    it.name.contains(customerSearchQuery, ignoreCase = true)
                }
            }

    val filteredProducts: List<ProductListItem>
        get() =
            if (productSearchQuery.isBlank()) {
                products
            } else {
                products.filter {
                    it.name.contains(productSearchQuery, ignoreCase = true) ||
                            it.sku.orEmpty().contains(productSearchQuery, ignoreCase = true) ||
                            it.barcode.orEmpty().contains(productSearchQuery, ignoreCase = true)
                }
            }

    val totalQuantity: Int
        get() = cartItems.sumOf { it.quantity }

    val subtotal: Double
        get() = cartItems.sumOf { it.subtotal }

    val grandTotal: Double
        get() = subtotal

    val canSubmit: Boolean
        get() = selectedCustomer != null &&
                cartItems.isNotEmpty() &&
                !isSubmitting
}