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

data class AppUiState(
    val loading: Boolean = false,
    val dashboard: DashboardData? = null,
    val orders: List<SalesOrderSummary> = emptyList(),
    val selectedOrder: SalesOrderDetails? = null,
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
