package com.example.tallysyncapp.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.tallysyncapp.data.repository.MobileRepository
import com.example.tallysyncapp.data.repository.OfflineOrderRepository
import com.example.tallysyncapp.data.network.CartItem
import com.example.tallysyncapp.data.network.CreateSalesOrderItemRequest
import com.example.tallysyncapp.data.network.CreateSalesOrderRequest
import com.example.tallysyncapp.data.network.CustomerListItem
import com.example.tallysyncapp.data.network.DashboardData
import com.example.tallysyncapp.data.network.ProductListItem
import com.example.tallysyncapp.data.network.SalesOrderDetails
import com.example.tallysyncapp.data.network.SalesOrderSummary
import com.example.tallysyncapp.data.network.SaveCustomerRequest
import com.example.tallysyncapp.data.network.SaveProductRequest
import com.example.tallysyncapp.data.network.SaveSupplierRequest
import com.example.tallysyncapp.data.network.SupplierListItem
import com.example.tallysyncapp.report.ReportRange
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import javax.inject.Inject
import com.example.tallysyncapp.data.network.SavePurchaseOrderRequest
import android.util.Log


@HiltViewModel
class AppViewModel @Inject constructor(
    private val repository: MobileRepository,
    private val offlineOrderRepository: OfflineOrderRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(AppUiState())
    val uiState: StateFlow<AppUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            offlineOrderRepository.pendingOrders.collectLatest { orders ->
                _uiState.value = _uiState.value.copy(
                    localPendingOrders = orders.size,
                    localPendingOrderItems = orders
                )
            }
        }
    }

    fun retryOfflineOrders() {
        offlineOrderRepository.enqueueSync()
        _uiState.value = _uiState.value.copy(
            message = "Local order upload has been queued."
        )
    }

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

    fun loadSuppliers(search: String = _uiState.value.supplierSearch) {
        _uiState.value = _uiState.value.copy(supplierSearch = search)
        launchRequest {
            val response = repository.getSuppliers(search.trim().takeIf(String::isNotEmpty))
            _uiState.value = _uiState.value.copy(suppliers = response.data, message = response.message)
        }
    }

    fun updateSupplierSearch(search: String) {
        _uiState.value = _uiState.value.copy(supplierSearch = search)
    }

    fun saveSupplier(
    request: SaveSupplierRequest,
    onSuccess: () -> Unit
) {
    if (request.name.isBlank()) {
        return setError("Supplier name is required.")
    }

    viewModelScope.launch {
        _uiState.value = _uiState.value.copy(
            isSavingSupplier = true,
            error = null
        )

        try {
            repository.createSupplier(request)

            val suppliers = repository.getSuppliers()

            _uiState.value = _uiState.value.copy(
                suppliers = suppliers.data,
                isSavingSupplier = false,
                message = "Supplier created successfully."
            )

            onSuccess()
        } catch (error: Exception) {
            _uiState.value = _uiState.value.copy(
                isSavingSupplier = false,
                error = error.message
                    ?: "Unable to create supplier."
            )
        }
    }
}

fun updateSupplier(
    supplierId: String,
    request: SaveSupplierRequest,
    onSuccess: () -> Unit
) {
    if (supplierId.isBlank()) return

    if (request.name.isBlank()) {
        return setError("Supplier name is required.")
    }

    viewModelScope.launch {
        _uiState.value = _uiState.value.copy(
            isSavingSupplier = true,
            error = null
        )

        try {
            val response =
                repository.updateSupplier(
                    supplierId,
                    request
                )

            val suppliers = repository.getSuppliers()

            _uiState.value = _uiState.value.copy(
                supplierRecord = response.data,
                suppliers = suppliers.data,
                isSavingSupplier = false,
                message = "Supplier updated successfully."
            )

            onSuccess()
        } catch (error: Exception) {
            _uiState.value = _uiState.value.copy(
                isSavingSupplier = false,
                error = error.message
                    ?: "Unable to update supplier."
            )
        }
    }
}

fun deleteSupplier(
    supplierId: String,
    onSuccess: () -> Unit
) {
    if (supplierId.isBlank()) return

    viewModelScope.launch {
        _uiState.value = _uiState.value.copy(
            isSavingSupplier = true,
            error = null
        )

        try {
            repository.deleteSupplier(supplierId)

            val suppliers = repository.getSuppliers()

            _uiState.value = _uiState.value.copy(
                supplierRecord = null,
                suppliers = suppliers.data,
                isSavingSupplier = false,
                message = "Supplier deleted successfully."
            )

            onSuccess()
        } catch (error: Exception) {
            _uiState.value = _uiState.value.copy(
                isSavingSupplier = false,
                error = error.message
                    ?: "Unable to delete supplier."
            )
        }
    }
}

    

    fun saveCustomer(
        request: SaveCustomerRequest,
        onSuccess: () -> Unit
    ) {
        if (request.name.isBlank()) {
            return setError("Customer name is required.")
        }

        if (request.creditLimit < 0.0) {
            return setError("Credit limit cannot be negative.")
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isSavingCustomer = true,
                error = null
            )

            try {
                repository.createCustomer(request)

                val response = repository.getCustomers()

                _uiState.value = _uiState.value.copy(
                    customers = response.data,
                    isSavingCustomer = false,
                    message = "Customer created successfully."
                )

                onSuccess()
            } catch (error: Exception) {
                _uiState.value = _uiState.value.copy(
                    isSavingCustomer = false,
                    error = error.message ?: "Unable to create customer."
                )
            }
        }
    }

    fun saveProduct(
        request: SaveProductRequest,
        onSuccess: () -> Unit
    ) {
        if (request.sku.isBlank()) {
            return setError("Product SKU is required.")
        }

        if (request.name.trim().length < 2) {
            return setError("Product name must contain at least 2 characters.")
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isSavingProduct = true,
                error = null
            )

            try {
                repository.createProduct(request)

                val response = repository.getProducts()

                _uiState.value = _uiState.value.copy(
                    products = response.data,
                    isSavingProduct = false,
                    message = "Product created successfully."
                )

                onSuccess()
            } catch (error: Exception) {
                _uiState.value = _uiState.value.copy(
                    isSavingProduct = false,
                    error = error.message ?: "Unable to create product."
                )
            }
        }
    }

    fun loadProductRecord(productId: String) = launchRequest {
        val product = repository.getProduct(productId)
        _uiState.value = _uiState.value.copy(
            productRecord = product
        )
    }

    fun updateProduct(
        productId: String,
        request: SaveProductRequest,
        onSuccess: () -> Unit
    ) {
        if (request.sku.isBlank()) {
            return setError("Product SKU is required.")
        }

        if (request.name.trim().length < 2) {
            return setError("Product name must contain at least 2 characters.")
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isSavingProduct = true,
                error = null
            )

            try {
                val updated = repository.updateProduct(productId, request)
                val products = repository.getProducts()

                _uiState.value = _uiState.value.copy(
                    productRecord = updated,
                    products = products.data,
                    isSavingProduct = false,
                    message = "Product updated. Tally sync is pending."
                )

                onSuccess()
            } catch (error: Exception) {
                _uiState.value = _uiState.value.copy(
                    isSavingProduct = false,
                    error = error.message ?: "Unable to update product."
                )
            }
        }
    }

    fun setProductActive(
        productId: String,
        isActive: Boolean
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isSavingProduct = true,
                error = null
            )

            try {
                val updated = repository.updateProductStatus(
                    productId,
                    isActive
                )
                val products = repository.getProducts()

                _uiState.value = _uiState.value.copy(
                    productRecord = updated,
                    products = products.data,
                    isSavingProduct = false,
                    message = if (isActive) {
                        "Product activated. Tally sync is pending."
                    } else {
                        "Product deactivated. Tally sync is pending."
                    }
                )
            } catch (error: Exception) {
                _uiState.value = _uiState.value.copy(
                    isSavingProduct = false,
                    error = error.message ?: "Unable to change product status."
                )
            }
        }
    }
    fun syncProductWithTally(productId: String) {
        if (_uiState.value.isSyncingTallyMaster) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isSyncingTallyMaster = true,
                error = null
            )

            try {
                repository.syncProductMaster(productId)

                val product = repository.getProduct(productId)
                val products = repository.getProducts()

                _uiState.value = _uiState.value.copy(
                    productRecord = product,
                    products = products.data,
                    message = "Product synchronized with Tally successfully."
                )
            } catch (error: Exception) {
                /*
                 * The backend persists FAILED + syncError before returning
                 * the error. Reload the product so Android shows that
                 * authoritative failure state.
                 */
                try {
                    val product = repository.getProduct(productId)

                    _uiState.value = _uiState.value.copy(
                        productRecord = product,
                        error = product.syncError
                            ?.takeIf(String::isNotBlank)
                            ?: error.message
                            ?: "Unable to synchronize product with Tally."
                    )
                } catch (_: Exception) {
                    _uiState.value = _uiState.value.copy(
                        error = error.message
                            ?: "Unable to synchronize product with Tally."
                    )
                }
            } finally {
                _uiState.value = _uiState.value.copy(
                    isSyncingTallyMaster = false
                )
            }
        }
    }
    fun clearProductRecord() {
        _uiState.value = _uiState.value.copy(
            productRecord = null
        )
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

    fun openCustomer(customerId: String) {
        val customer = _uiState.value.customers.firstOrNull { it.id == customerId }
        _uiState.value = _uiState.value.copy(
            viewedCustomer = customer,
            customerOrders = emptyList()
        )
        customer?.let { loadCustomerOrders(it.name) }
    }

    fun loadCustomerRecord(customerId: String) = launchRequest {
        val customer = repository.getCustomer(customerId)
        _uiState.value = _uiState.value.copy(
            customerRecord = customer
        )
    }

    fun updateCustomer(
        customerId: String,
        request: SaveCustomerRequest,
        onSuccess: () -> Unit
    ) {
        if (request.name.isBlank()) {
            return setError("Customer name is required.")
        }

        if (request.creditLimit < 0.0) {
            return setError("Credit limit cannot be negative.")
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isSavingCustomer = true,
                error = null
            )

            try {
                val updated = repository.updateCustomer(customerId, request)
                val customers = repository.getCustomers()

                _uiState.value = _uiState.value.copy(
                    customerRecord = updated,
                    customers = customers.data,
                    viewedCustomer = customers.data.firstOrNull { it.id == customerId },
                    isSavingCustomer = false,
                    message = "Customer updated successfully."
                )

                onSuccess()
            } catch (error: Exception) {
                _uiState.value = _uiState.value.copy(
                    isSavingCustomer = false,
                    error = error.message ?: "Unable to update customer."
                )
            }
        }
    }

    fun setCustomerActive(
        customerId: String,
        isActive: Boolean
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isSavingCustomer = true,
                error = null
            )

            try {
                val updated = repository.updateCustomerStatus(
                    customerId,
                    isActive
                )
                val customers = repository.getCustomers()

                _uiState.value = _uiState.value.copy(
                    customerRecord = updated,
                    customers = customers.data,
                    viewedCustomer = customers.data.firstOrNull { it.id == customerId },
                    isSavingCustomer = false,
                    message = if (isActive) {
                        "Customer activated."
                    } else {
                        "Customer deactivated."
                    }
                )
            } catch (error: Exception) {
                _uiState.value = _uiState.value.copy(
                    isSavingCustomer = false,
                    error = error.message ?: "Unable to change customer status."
                )
            }
        }
    }

    fun syncCustomerWithTally(customerId: String) {
        if (_uiState.value.isSyncingTallyMaster) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isSyncingTallyMaster = true,
                error = null
            )

            try {
                repository.syncCustomerMaster(customerId)

                val customer = repository.getCustomer(customerId)
                val customers = repository.getCustomers()

                _uiState.value = _uiState.value.copy(
                    customerRecord = customer,
                    customers = customers.data,
                    viewedCustomer = customers.data.firstOrNull {
                        it.id == customerId
                    },
                    message = "Customer synchronized with Tally successfully."
                )
            } catch (error: Exception) {
                _uiState.value = _uiState.value.copy(
                    error = error.message
                        ?: "Unable to synchronize customer with Tally."
                )
            } finally {
                _uiState.value = _uiState.value.copy(
                    isSyncingTallyMaster = false
                )
            }
        }
    }
    fun loadCustomerOrders(customerName: String) = launchRequest {
        val response = repository.getSalesOrders(search = customerName)
        _uiState.value = _uiState.value.copy(
            customerOrders = response.data.orders
        )
    }

    fun clearViewedCustomer() {
        _uiState.value = _uiState.value.copy(
            viewedCustomer = null,
            customerRecord = null,
            customerOrders = emptyList()
        )
    }
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

    fun updateCartUnitPrice(
    productId: String,
    unitPrice: Double
) {
    if (unitPrice < 0.0) {
        return
    }

    _uiState.value = _uiState.value.copy(
        cartItems = _uiState.value.cartItems.map { item ->
            if (item.product.id == productId) {
                item.copy(unitPrice = unitPrice)
            } else {
                item
            }
        }
    )
}

    fun removeCartItem(productId: String) {
        _uiState.value = _uiState.value.copy(cartItems = _uiState.value.cartItems.filterNot { it.product.id == productId })
    }

   fun submitSalesOrder(onSuccess: () -> Unit) {
    val state = _uiState.value

    val customer = state.selectedCustomer
        ?: return setError("Please select a customer.")

    if (state.cartItems.isEmpty()) {
        return setError("Please add at least one product.")
    }

    val invalidPriceItem = state.cartItems.firstOrNull {
        it.unitPrice <= 0.0
    }

    if (invalidPriceItem != null) {
        return setError(
            "Please enter a selling price greater than €0.00 for ${invalidPriceItem.product.name}."
        )
    }

    viewModelScope.launch {
        _uiState.value = _uiState.value.copy(
            isSubmittingOrder = true,
            error = null
        )

        try {
            val request = CreateSalesOrderRequest(
                customerId = customer.id,
                items = state.cartItems.map { item ->
                    CreateSalesOrderItemRequest(
                        productId = item.product.id,
                        quantity = item.quantity,
                        unitPrice = item.unitPrice
                    )
                },
                notes = state.orderNotes
                    .trim()
                    .takeIf(String::isNotEmpty)
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

    fun fulfillOrder(id: String) {
        runOrderAction("Order fulfilled successfully.") {
            repository.fulfillSalesOrder(id)
            refreshOrderData(id)
        }
    }

    fun syncOrder(id: String) {
        runOrderAction("Order synchronized with Tally successfully.") {
            repository.syncSalesOrder(id)
            refreshOrderData(id)
        }
    }

    fun retryOrder(id: String) {
        runOrderAction("Tally synchronization completed successfully.") {
            repository.retrySalesOrder(id)
            refreshOrderData(id)
        }
    }

    fun syncPending() {
        runOrderAction("Pending orders synchronization completed.") {
            repository.syncPendingSalesOrders()
            val dashboardResponse = repository.getDashboard()
            val ordersResponse = repository.getSalesOrders(syncStatus = _uiState.value.selectedFilter)
            _uiState.value = _uiState.value.copy(
                dashboard = dashboardResponse.data,
                orders = ordersResponse.data.orders
            )
        }
    }

    private suspend fun refreshOrderData(id: String) {
        val orderResponse = repository.getSalesOrder(id)
        val dashboardResponse = repository.getDashboard()
        val ordersResponse = repository.getSalesOrders(syncStatus = _uiState.value.selectedFilter)
        _uiState.value = _uiState.value.copy(
            selectedOrder = orderResponse.data,
            dashboard = dashboardResponse.data,
            orders = ordersResponse.data.orders
        )
    }

    private fun runOrderAction(
        successMessage: String,
        action: suspend () -> Unit
    ) {
        if (_uiState.value.loading) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(loading = true, error = null)
            try {
                action()
                _uiState.value = _uiState.value.copy(message = successMessage)
            } catch (error: Exception) {
                setError(error.message ?: "Order action failed.")
            } finally {
                _uiState.value = _uiState.value.copy(loading = false)
            }
        }
    }


    fun updateReportRange(range: ReportRange) {
        _uiState.value = _uiState.value.copy(reportRange = range)
    }

    fun loadReports() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(loading = true, error = null)
            try {
                val first = repository.getSalesOrders(page = 1)
                val allOrders = first.data.orders.toMutableList()
                val totalPages = first.data.pagination.totalPages.coerceAtLeast(1).coerceAtMost(100)
                for (page in 2..totalPages) {
                    allOrders += repository.getSalesOrders(page = page).data.orders
                }
                _uiState.value = _uiState.value.copy(
                    reportOrders = allOrders.distinctBy { it.id },
                    message = first.message
                )
            } catch (error: Exception) {
                setError(error.message ?: "Unable to load reports")
            } finally {
                _uiState.value = _uiState.value.copy(loading = false)
            }
        }
    }

    fun loadSupplierRecord(
    supplierId: String
) {
    if (supplierId.isBlank()) return

    viewModelScope.launch {
        _uiState.value = _uiState.value.copy(
            loading = true,
            error = null
        )

        try {
            val supplier =
                repository.getSupplier(
                    supplierId
                )

            _uiState.value =
                _uiState.value.copy(
                    supplierRecord = supplier,
                    loading = false
                )
        } catch (error: Exception) {
            _uiState.value =
                _uiState.value.copy(
                    supplierRecord = null,
                    loading = false,
                    error = error.message
                        ?: "Unable to load supplier."
                )
        }
    }
}

fun setSupplierActive(
    supplierId: String,
    isActive: Boolean
) {
    viewModelScope.launch {
        _uiState.value = _uiState.value.copy(
            isSavingSupplier = true,
            error = null
        )

        try {
            val response = repository.updateSupplierStatus(
                supplierId,
                isActive
            )

            _uiState.value = _uiState.value.copy(
                supplierRecord = response.data,
                isSavingSupplier = false,
                message = if (isActive) {
                    "Supplier activated successfully."
                } else {
                    "Supplier deactivated successfully."
                }
            )

            loadSuppliers()
        } catch (error: Exception) {
            _uiState.value = _uiState.value.copy(
                isSavingSupplier = false,
                error = error.message
                    ?: "Unable to update supplier status."
            )
        }
    }
}

fun clearSupplierRecord() {
    _uiState.value = _uiState.value.copy(
        supplierRecord = null
    )
}

            fun loadWarehouses() = launchRequest {
        val response = repository.getWarehouses()

        val warehouses = response.data
            .filter { it.isActive }
            .sortedWith(
                compareByDescending<com.example.tallysyncapp.data.network.WarehouseListItem> {
                    it.isDefault
                }.thenBy { it.name.lowercase() }
            )

        _uiState.value = _uiState.value.copy(
            warehouses = warehouses
        )
    }

    fun loadPurchaseOrders(
        search: String = _uiState.value.purchaseOrderSearch,
        status: String? = _uiState.value.purchaseOrderStatusFilter
    ) {
        _uiState.value = _uiState.value.copy(
            purchaseOrderSearch = search,
            purchaseOrderStatusFilter = status
        )

        launchRequest {
            val response = repository.getPurchaseOrders(
                search = search.trim().takeIf(String::isNotEmpty),
                status = status?.takeIf { it.isNotBlank() }
            )

            _uiState.value = _uiState.value.copy(
                purchaseOrders = response.data
            )
        }
    }

    fun updatePurchaseOrderSearch(search: String) {
        _uiState.value = _uiState.value.copy(
            purchaseOrderSearch = search
        )
    }

    fun updatePurchaseOrderStatusFilter(status: String?) {
        _uiState.value = _uiState.value.copy(
            purchaseOrderStatusFilter = status
        )

        loadPurchaseOrders(
            search = _uiState.value.purchaseOrderSearch,
            status = status
        )
    }

    fun loadPurchaseOrderRecord(purchaseOrderId: String) {
        if (purchaseOrderId.isBlank()) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                loading = true,
                error = null,
                purchaseOrderRecord = null
            )

            try {
                val purchaseOrder =
                    repository.getPurchaseOrder(purchaseOrderId)

                _uiState.value = _uiState.value.copy(
                    purchaseOrderRecord = purchaseOrder,
                    loading = false
                )
            } catch (error: Exception) {
                _uiState.value = _uiState.value.copy(
                    purchaseOrderRecord = null,
                    loading = false,
                    error = error.message
                        ?: "Unable to load purchase order."
                )
            }
        }
    }

    fun preparePurchaseOrderForm() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                loading = true,
                error = null
            )

            try {
                val suppliersResponse = repository.getSuppliers()
                val productsResponse = repository.getProducts()
                val warehousesResponse = repository.getWarehouses()

                _uiState.value = _uiState.value.copy(
                    suppliers = suppliersResponse.data
                        .filter { it.isActive },
                    products = productsResponse.data,
                    warehouses = warehousesResponse.data
                        .filter { it.isActive }
                        .sortedWith(
                            compareByDescending<com.example.tallysyncapp.data.network.WarehouseListItem> {
                                it.isDefault
                            }.thenBy { it.name.lowercase() }
                        ),
                    loading = false
                )
            } catch (error: Exception) {
                _uiState.value = _uiState.value.copy(
                    loading = false,
                    error = error.message
                        ?: "Unable to prepare purchase order form."
                )
            }
        }
    }

    fun createPurchaseOrder(
    request: SavePurchaseOrderRequest,
    onSuccess: (String) -> Unit
) {
    Log.d(
        "PO_DEBUG",
        "VIEWMODEL_CREATE_ENTER " +
            "isSaving=${_uiState.value.isSavingPurchaseOrder}"
    )

    if (_uiState.value.isSavingPurchaseOrder) {
        Log.d(
            "PO_DEBUG",
            "VIEWMODEL_CREATE_BLOCKED_IS_SAVING"
        )
        return
    }

    viewModelScope.launch {
        Log.d(
            "PO_DEBUG",
            "VIEWMODEL_COROUTINE_STARTED"
        )

        _uiState.value = _uiState.value.copy(
            isSavingPurchaseOrder = true,
            error = null
        )

        try {
            Log.d(
                "PO_DEBUG",
                "REPOSITORY_CREATE_START"
            )

            val created =
                repository.createPurchaseOrder(request)

            Log.d(
                "PO_DEBUG",
                "REPOSITORY_CREATE_SUCCESS"
            )

            val list =
                repository.getPurchaseOrders()

            _uiState.value = _uiState.value.copy(
                purchaseOrderRecord = created,
                purchaseOrders = list.data,
                isSavingPurchaseOrder = false,
                message = "Purchase order created successfully."
            )

            onSuccess(created.id)
        } catch (error: Exception) {
            Log.e(
                "PO_DEBUG",
                "REPOSITORY_CREATE_FAILED: ${error.message}",
                error
            )

            _uiState.value = _uiState.value.copy(
                isSavingPurchaseOrder = false,
                error = error.message
                    ?: "Unable to create purchase order."
            )
        }
    }
}

    fun updatePurchaseOrder(
        purchaseOrderId: String,
        request: SavePurchaseOrderRequest,
        onSuccess: () -> Unit
    ) {
        if (
            purchaseOrderId.isBlank() ||
            _uiState.value.isSavingPurchaseOrder
        ) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isSavingPurchaseOrder = true,
                error = null
            )

            try {
                val updated =
                    repository.updatePurchaseOrder(
                        purchaseOrderId,
                        request
                    )

                val list =
                    repository.getPurchaseOrders()

                _uiState.value = _uiState.value.copy(
                    purchaseOrderRecord = updated,
                    purchaseOrders = list.data,
                    isSavingPurchaseOrder = false,
                    message = "Purchase order updated successfully."
                )

                onSuccess()
            } catch (error: Exception) {
                _uiState.value = _uiState.value.copy(
                    isSavingPurchaseOrder = false,
                    error = error.message
                        ?: "Unable to update purchase order."
                )
            }
        }
    }

    fun sendPurchaseOrder(purchaseOrderId: String) {
        changePurchaseOrderLifecycle(
            purchaseOrderId = purchaseOrderId,
            successMessage = "Purchase order sent successfully."
        ) {
            repository.sendPurchaseOrder(purchaseOrderId)
        }
    }

    fun cancelPurchaseOrder(purchaseOrderId: String) {
        changePurchaseOrderLifecycle(
            purchaseOrderId = purchaseOrderId,
            successMessage = "Purchase order cancelled successfully."
        ) {
            repository.cancelPurchaseOrder(purchaseOrderId)
        }
    }

    fun deletePurchaseOrder(
        purchaseOrderId: String,
        onSuccess: () -> Unit
    ) {
        if (
            purchaseOrderId.isBlank() ||
            _uiState.value.isChangingPurchaseOrderStatus
        ) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isChangingPurchaseOrderStatus = true,
                error = null
            )

            try {
                repository.deletePurchaseOrder(purchaseOrderId)

                val list = repository.getPurchaseOrders()

                _uiState.value = _uiState.value.copy(
                    purchaseOrderRecord = null,
                    purchaseOrders = list.data,
                    isChangingPurchaseOrderStatus = false,
                    message = "Purchase order deleted successfully."
                )

                onSuccess()
            } catch (error: Exception) {
                _uiState.value = _uiState.value.copy(
                    isChangingPurchaseOrderStatus = false,
                    error = error.message
                        ?: "Unable to delete purchase order."
                )
            }
        }
    }

    private fun changePurchaseOrderLifecycle(
        purchaseOrderId: String,
        successMessage: String,
        request: suspend () ->
            com.example.tallysyncapp.data.network.PurchaseOrderRecord
    ) {
        if (
            purchaseOrderId.isBlank() ||
            _uiState.value.isChangingPurchaseOrderStatus
        ) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isChangingPurchaseOrderStatus = true,
                error = null
            )

            try {
                val updated = request()
                val list = repository.getPurchaseOrders()

                _uiState.value = _uiState.value.copy(
                    purchaseOrderRecord = updated,
                    purchaseOrders = list.data,
                    isChangingPurchaseOrderStatus = false,
                    message = successMessage
                )
            } catch (error: Exception) {
                _uiState.value = _uiState.value.copy(
                    isChangingPurchaseOrderStatus = false,
                    error = error.message
                        ?: "Unable to update purchase order."
                )
            }
        }
    }

    fun clearPurchaseOrderRecord() {
        _uiState.value = _uiState.value.copy(
            purchaseOrderRecord = null
        )
    }

    fun clearNewOrder() {
        _uiState.value = _uiState.value.copy(
            selectedCustomer = null, cartItems = emptyList(), customerSearch = "",
            productSearch = "", orderNotes = "", createdOrder = null, error = null
        )
    }

    fun clearError() { _uiState.value = _uiState.value.copy(error = null) }
    fun clearMessage() { _uiState.value = _uiState.value.copy(message = null) }
    fun showMessage(message: String) { _uiState.value = _uiState.value.copy(message = message) }
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
