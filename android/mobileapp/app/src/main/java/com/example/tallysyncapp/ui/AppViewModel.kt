package com.example.tallymobile.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.tallymobile.data.MobileRepository
import com.example.tallymobile.data.network.CartItem
import com.example.tallymobile.data.network.CreateSalesOrderItemRequest
import com.example.tallymobile.data.network.CreateSalesOrderRequest
import com.example.tallymobile.data.network.CreateSalesOrderResult
import com.example.tallymobile.data.network.CustomerListItem
import com.example.tallymobile.data.network.DashboardData
import com.example.tallymobile.data.network.ProductListItem
import com.example.tallymobile.data.network.SalesOrderDetails
import com.example.tallymobile.data.network.SalesOrderSummary
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

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

@HiltViewModel
class AppViewModel @Inject constructor(
    private val repository: MobileRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(AppUiState())
    val uiState: StateFlow<AppUiState> = _uiState.asStateFlow()

    fun loadDashboard() = launchRequest {
        val response = repository.getDashboard()
        _uiState.value = _uiState.value.copy(dashboard = response.data, message = response.message)
    }

    fun loadCustomers(search: String = _uiState.value.customerSearch) {
        _uiState.value = _uiState.value.copy(customerSearch = search)
        launchRequest {
            val response = repository.getCustomers(search.trim().takeIf(String::isNotEmpty))
            _uiState.value = _uiState.value.copy(customers = response.data, message = response.message)
        }
    }

    fun loadProducts(search: String = _uiState.value.productSearch) {
        _uiState.value = _uiState.value.copy(productSearch = search)
        launchRequest {
            val response = repository.getProducts(search.trim().takeIf(String::isNotEmpty))
            _uiState.value = _uiState.value.copy(products = response.data, message = response.message)
        }
    }

    fun loadOrders(filter: String? = _uiState.value.selectedFilter) {
        _uiState.value = _uiState.value.copy(selectedFilter = filter)
        launchRequest {
            val response = repository.getSalesOrders(syncStatus = filter)
            _uiState.value = _uiState.value.copy(orders = response.data.orders, message = response.message)
        }
    }

    fun loadOrder(id: String) = launchRequest {
        val response = repository.getSalesOrder(id)
        _uiState.value = _uiState.value.copy(selectedOrder = response.data, message = response.message)
    }

    fun updateCustomerSearch(search: String) { _uiState.value = _uiState.value.copy(customerSearch = search) }
    fun updateProductSearch(search: String) { _uiState.value = _uiState.value.copy(productSearch = search) }
    fun updateOrderNotes(notes: String) { _uiState.value = _uiState.value.copy(orderNotes = notes) }
    fun selectCustomer(customer: CustomerListItem) { _uiState.value = _uiState.value.copy(selectedCustomer = customer) }
    fun clearSelectedCustomer() { _uiState.value = _uiState.value.copy(selectedCustomer = null) }

    fun addProductToCart(product: ProductListItem) {
        val items = _uiState.value.cartItems.toMutableList()
        val index = items.indexOfFirst { it.product.id == product.id }
        if (index >= 0) items[index] = items[index].copy(quantity = items[index].quantity + 1)
        else items += CartItem(product)
        _uiState.value = _uiState.value.copy(cartItems = items, message = "${product.name} added to cart")
    }

    fun increaseCartQuantity(productId: String) {
        _uiState.value = _uiState.value.copy(cartItems = _uiState.value.cartItems.map {
            if (it.product.id == productId) it.copy(quantity = it.quantity + 1) else it
        })
    }

    fun decreaseCartQuantity(productId: String) {
        _uiState.value = _uiState.value.copy(cartItems = _uiState.value.cartItems.mapNotNull {
            when {
                it.product.id != productId -> it
                it.quantity > 1 -> it.copy(quantity = it.quantity - 1)
                else -> null
            }
        })
    }

    fun removeCartItem(productId: String) {
        _uiState.value = _uiState.value.copy(cartItems = _uiState.value.cartItems.filterNot { it.product.id == productId })
    }

    fun submitSalesOrder(onSuccess: () -> Unit) {
        val state = _uiState.value
        val customer = state.selectedCustomer ?: return setError("Please select a customer.")
        if (state.cartItems.isEmpty()) return setError("Please add at least one product.")

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmittingOrder = true, error = null)
            try {
                val request = CreateSalesOrderRequest(
                    customerId = customer.id,
                    items = state.cartItems.map {
                        CreateSalesOrderItemRequest(it.product.id, it.quantity, it.product.sellingPrice)
                    },
                    notes = state.orderNotes.trim().takeIf(String::isNotEmpty)
                )
                val response = repository.createSalesOrder(request)
                _uiState.value = _uiState.value.copy(
                    isSubmittingOrder = false,
                    createdOrder = response.data,
                    message = response.message
                )
                onSuccess()
            } catch (error: Exception) {
                _uiState.value = _uiState.value.copy(
                    isSubmittingOrder = false,
                    error = error.message ?: "Unable to create order."
                )
            }
        }
    }

    fun syncOrder(id: String) = launchRequest {
        val response = repository.syncSalesOrder(id)
        _uiState.value = _uiState.value.copy(message = response.message)
        loadOrder(id); loadDashboard()
    }

    fun retryOrder(id: String) = launchRequest {
        val response = repository.retrySalesOrder(id)
        _uiState.value = _uiState.value.copy(message = response.message)
        loadOrder(id); loadDashboard()
    }

    fun syncPending() = launchRequest {
        val response = repository.syncPendingSalesOrders()
        _uiState.value = _uiState.value.copy(message = response.message)
        loadDashboard(); loadOrders()
    }

    fun clearNewOrder() {
        _uiState.value = _uiState.value.copy(
            selectedCustomer = null, cartItems = emptyList(), customerSearch = "",
            productSearch = "", orderNotes = "", createdOrder = null, error = null
        )
    }

    fun clearError() { _uiState.value = _uiState.value.copy(error = null) }
    fun clearMessage() { _uiState.value = _uiState.value.copy(message = null) }
    private fun setError(message: String) { _uiState.value = _uiState.value.copy(error = message) }

    private fun launchRequest(block: suspend () -> Unit) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(loading = true, error = null)
            try { block() }
            catch (error: Exception) { setError(error.message ?: "Request failed") }
            finally { _uiState.value = _uiState.value.copy(loading = false) }
        }
    }
}
