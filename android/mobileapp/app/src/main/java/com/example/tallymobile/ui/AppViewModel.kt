package com.example.tallymobile.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.tallymobile.data.MobileRepository
import com.example.tallymobile.data.network.DashboardData
import com.example.tallymobile.data.network.SalesOrderDetails
import com.example.tallymobile.data.network.SalesOrderSummary
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import com.example.tallymobile.data.network.CustomerListItem
import com.example.tallymobile.data.network.CartItem
import com.example.tallymobile.data.network.ProductListItem

import com.example.tallymobile.data.network.CreateSalesOrderItemRequest
import com.example.tallymobile.data.network.CreateSalesOrderRequest
import com.example.tallymobile.data.network.CreateSalesOrderResult

data class AppUiState(
    val loading: Boolean = false,
    
    val dashboard: DashboardData? = null,
    val orders: List<SalesOrderSummary> = emptyList(),
    val selectedOrder: SalesOrderDetails? = null,

    val products: List<ProductListItem> = emptyList(),
    val productSearch: String = "",
    val cartItems: List<CartItem> = emptyList(),

    val customers: List<CustomerListItem> = emptyList(),
    val customerSearch: String = "",
    val selectedCustomer: CustomerListItem? = null,

    val orderNotes: String = "",
    val isSubmittingOrder: Boolean = false,
    val createdOrder: CreateSalesOrderResult? = null,

    val selectedFilter: String? = null,
    val error: String? = null,
    val message: String? = null
)

class AppViewModel : ViewModel() {
    private val repository = MobileRepository()

    private val _uiState = MutableStateFlow(AppUiState())
    val uiState: StateFlow<AppUiState> = _uiState.asStateFlow()

    fun loadDashboard() {
        launchRequest {
            val response = repository.getDashboard()
            _uiState.value = _uiState.value.copy(
                dashboard = response.data,
                message = response.message
            )
        }
    }

    fun loadProducts(
    search: String = _uiState.value.productSearch
) {
    _uiState.value = _uiState.value.copy(
        productSearch = search
    )

    launchRequest {
        val response = repository.getProducts(
            search = search.takeIf { it.isNotBlank() }
        )

        _uiState.value = _uiState.value.copy(
            products = response.data
        )
    }
}

fun addProductToCart(product: ProductListItem) {
    val currentItems = _uiState.value.cartItems.toMutableList()

    val existingIndex = currentItems.indexOfFirst {
        it.product.id == product.id
    }

    if (existingIndex >= 0) {
        val currentItem = currentItems[existingIndex]

        currentItems[existingIndex] = currentItem.copy(
            quantity = currentItem.quantity + 1
        )
    } else {
        currentItems.add(
            CartItem(
                product = product,
                quantity = 1
            )
        )
    }

    _uiState.value = _uiState.value.copy(
        cartItems = currentItems,
        message = "${product.name} added to cart"
    )
}

fun increaseCartQuantity(productId: String) {
    val updatedItems = _uiState.value.cartItems.map { item ->
        if (item.product.id == productId) {
            item.copy(quantity = item.quantity + 1)
        } else {
            item
        }
    }

    _uiState.value = _uiState.value.copy(
        cartItems = updatedItems
    )
}

fun decreaseCartQuantity(productId: String) {
    val updatedItems = _uiState.value.cartItems
        .mapNotNull { item ->
            if (item.product.id != productId) {
                item
            } else if (item.quantity > 1) {
                item.copy(quantity = item.quantity - 1)
            } else {
                null
            }
        }

    _uiState.value = _uiState.value.copy(
        cartItems = updatedItems
    )
}

fun removeCartItem(productId: String) {
    _uiState.value = _uiState.value.copy(
        cartItems = _uiState.value.cartItems.filterNot {
            it.product.id == productId
        }
    )
}

fun clearNewOrder() {
    _uiState.value = _uiState.value.copy(
        selectedCustomer = null,
        cartItems = emptyList(),
        customerSearch = "",
        productSearch = ""
    )
}

fun updateOrderNotes(notes: String) {
    _uiState.value = _uiState.value.copy(
        orderNotes = notes
    )
}

fun submitSalesOrder(
    onSuccess: () -> Unit
) {
    val state = _uiState.value
    val customer = state.selectedCustomer

    if (customer == null) {
        _uiState.value = state.copy(
            error = "Please select a customer."
        )
        return
    }

    if (state.cartItems.isEmpty()) {
        _uiState.value = state.copy(
            error = "Please add at least one product."
        )
        return
    }

    viewModelScope.launch {
        _uiState.value = _uiState.value.copy(
            isSubmittingOrder = true,
            error = null
        )

        try {
            val request = CreateSalesOrderRequest(
                customerId = customer.id,
                items = state.cartItems.map { cartItem ->
                    CreateSalesOrderItemRequest(
                        productId = cartItem.product.id,
                        quantity = cartItem.quantity,
                        unitPrice = cartItem.product.sellingPrice
                    )
                },
                notes = state.orderNotes
                    .trim()
                    .takeIf { it.isNotEmpty() }
            )

            val response = repository.createSalesOrder(request)

            _uiState.value = _uiState.value.copy(
                isSubmittingOrder = false,
                createdOrder = response.data,
                message = response.message
            )

            onSuccess()
        } catch (exception: Exception) {
            _uiState.value = _uiState.value.copy(
                isSubmittingOrder = false,
                error = exception.message ?: "Unable to create order."
            )
        }
    }
}

fun clearNewOrder() {
    _uiState.value = _uiState.value.copy(
        selectedCustomer = null,
        cartItems = emptyList(),
        customerSearch = "",
        productSearch = "",
        orderNotes = "",
        createdOrder = null,
        error = null
    )
}

fun clearError() {
    _uiState.value = _uiState.value.copy(
        error = null
    )
}

fun updateProductSearch(search: String) {
    _uiState.value = _uiState.value.copy(
        productSearch = search
    )
}

    fun loadOrders(filter: String? = _uiState.value.selectedFilter) {
        _uiState.value = _uiState.value.copy(selectedFilter = filter)

        launchRequest {
            val response = repository.getSalesOrders(syncStatus = filter)
            _uiState.value = _uiState.value.copy(
                orders = response.data.orders,
                message = response.message
            )
        }
    }

    fun loadOrder(id: String) {
        launchRequest {
            val response = repository.getSalesOrder(id)
            _uiState.value = _uiState.value.copy(
                selectedOrder = response.data,
                message = response.message
            )
        }
    }

    fun syncOrder(id: String) {
        launchRequest {
            val response = repository.syncSalesOrder(id)
            _uiState.value = _uiState.value.copy(message = response.message)
            loadOrder(id)
            loadDashboard()
        }
    }

    fun retryOrder(id: String) {
        launchRequest {
            val response = repository.retrySalesOrder(id)
            _uiState.value = _uiState.value.copy(message = response.message)
            loadOrder(id)
            loadDashboard()
        }
    }

    fun syncPending() {
        launchRequest {
            val response = repository.syncPendingSalesOrders()
            _uiState.value = _uiState.value.copy(message = response.message)
            loadDashboard()
            loadOrders()
        }
    }

    fun clearMessage() {
        _uiState.value = _uiState.value.copy(message = null)
    }

    fun loadCustomers(
    search: String = _uiState.value.customerSearch
) {
    _uiState.value = _uiState.value.copy(
        customerSearch = search
    )

    launchRequest {
        val response = repository.getCustomers(
            search = search.takeIf { it.isNotBlank() }
        )

        _uiState.value = _uiState.value.copy(
            customers = response.data
        )
    }
}

fun updateCustomerSearch(search: String) {
    _uiState.value = _uiState.value.copy(
        customerSearch = search
    )
}

fun selectCustomer(customer: CustomerListItem) {
    _uiState.value = _uiState.value.copy(
        selectedCustomer = customer
    )
}

fun clearSelectedCustomer() {
    _uiState.value = _uiState.value.copy(
        selectedCustomer = null
    )
}

    private fun launchRequest(block: suspend () -> Unit) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                loading = true,
                error = null
            )

            try {
                block()
            } catch (error: Exception) {
                _uiState.value = _uiState.value.copy(
                    error = error.message ?: "Request failed"
                )
            } finally {
                _uiState.value = _uiState.value.copy(loading = false)
            }
        }
    }
}
