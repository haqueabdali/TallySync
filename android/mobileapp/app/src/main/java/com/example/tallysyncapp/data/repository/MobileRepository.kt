package com.example.tallysyncapp.data.repository

import com.example.tallysyncapp.data.network.CreateSalesOrderRequest
import com.example.tallysyncapp.data.network.MobileApi
import com.example.tallysyncapp.data.network.SaveCustomerRequest
import com.example.tallysyncapp.data.network.SaveProductRequest
import com.example.tallysyncapp.data.network.SaveSupplierRequest
import com.example.tallysyncapp.data.network.UpdateActiveStatusRequest
import javax.inject.Inject
import javax.inject.Singleton
import com.example.tallysyncapp.data.network.SavePurchaseOrderRequest

@Singleton
class MobileRepository @Inject constructor(
    private val api: MobileApi
) {
    suspend fun getDashboard() = api.getDashboard()
    suspend fun getCustomers(search: String? = null) = api.getCustomers(search)
    suspend fun createCustomer(request: SaveCustomerRequest) = api.createCustomer(request)
    suspend fun getCustomer(id: String) = api.getCustomer(id)
    suspend fun updateCustomer(id: String, request: SaveCustomerRequest) =
        api.updateCustomer(id, request)
    suspend fun updateCustomerStatus(id: String, isActive: Boolean) =
        api.updateCustomerStatus(id, UpdateActiveStatusRequest(isActive))
    suspend fun syncCustomerMaster(id: String) =
        api.syncCustomerMaster(id)
    suspend fun getProducts(search: String? = null) = api.getProducts(search)
    suspend fun createProduct(request: SaveProductRequest) = api.createProduct(request)
    suspend fun getProduct(id: String) = api.getProduct(id)
    suspend fun updateProduct(id: String, request: SaveProductRequest) =
        api.updateProduct(id, request)
    suspend fun updateProductStatus(id: String, isActive: Boolean) =
        api.updateProductStatus(id, UpdateActiveStatusRequest(isActive))
    suspend fun syncProductMaster(id: String) =
        api.syncProductMaster(id)
    suspend fun getSalesOrders(syncStatus: String? = null, search: String? = null, page: Int = 1) =
        api.getSalesOrders(syncStatus, search, page)
    suspend fun getSalesOrder(id: String) = api.getSalesOrder(id)
    suspend fun createSalesOrder(request: CreateSalesOrderRequest) = api.createSalesOrder(request)
    suspend fun fulfillSalesOrder(id: String) = api.fulfillSalesOrder(id)
    suspend fun syncSalesOrder(id: String) = api.syncSalesOrder(id)
    suspend fun retrySalesOrder(id: String) = api.retrySalesOrder(id)
    suspend fun syncPendingSalesOrders() = api.syncPendingSalesOrders()
    suspend fun getSuppliers(search: String? = null) = api.getSuppliers(search)
    suspend fun getSupplier(id: String) = api.getSupplier(id)
    suspend fun createSupplier(request: SaveSupplierRequest) = api.createSupplier(request)
    suspend fun updateSupplier(id: String, request: SaveSupplierRequest) = api.updateSupplier(id, request)
    suspend fun updateSupplierStatus(id: String,isActive: Boolean) = api.updateSupplierStatus(id,UpdateActiveStatusRequest(isActive))
    suspend fun deleteSupplier(id: String) = api.deleteSupplier(id)
                    suspend fun getWarehouses() =
        api.getWarehouses(
            isActive = true,
            page = 1,
            limit = 100
        )

    suspend fun getPurchaseOrders(
        search: String? = null,
        status: String? = null,
        page: Int = 1
    ) =
        api.getPurchaseOrders(
            search = search,
            status = status,
            page = page
        )

    suspend fun getPurchaseOrder(id: String) =
        api.getPurchaseOrder(id)

    suspend fun createPurchaseOrder(
        request: SavePurchaseOrderRequest
    ) =
        api.createPurchaseOrder(request)

    suspend fun updatePurchaseOrder(
        id: String,
        request: SavePurchaseOrderRequest
    ) =
        api.updatePurchaseOrder(id, request)

    suspend fun sendPurchaseOrder(id: String) =
        api.sendPurchaseOrder(id)

    suspend fun cancelPurchaseOrder(id: String) =
        api.cancelPurchaseOrder(id)

    suspend fun deletePurchaseOrder(id: String) =
        api.deletePurchaseOrder(id)


}
