package your.package.mobile.order

import your.package.data.remote.dto.CustomerListItem
import your.package.data.remote.dto.ProductListItem
import your.package.mobile.order.model.CartItem

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
        get() {
            if (customerSearchQuery.isBlank()) return customers

            return customers.filter { customer ->
                customer.name.contains(
                    customerSearchQuery,
                    ignoreCase = true
                )
            }
        }

    val filteredProducts: List<ProductListItem>
        get() {
            if (productSearchQuery.isBlank()) return products

            return products.filter { product ->
                product.name.contains(
                    productSearchQuery,
                    ignoreCase = true
                ) || product.code.orEmpty().contains(
                    productSearchQuery,
                    ignoreCase = true
                )
            }
        }

    val totalQuantity: Int
        get() = cartItems.sumOf { it.quantity }

    val subtotal: Double
        get() = cartItems.sumOf { it.lineTotal }

    val grandTotal: Double
        get() = subtotal

    val canSubmit: Boolean
        get() = selectedCustomer != null &&
            cartItems.isNotEmpty() &&
            !isSubmitting
}