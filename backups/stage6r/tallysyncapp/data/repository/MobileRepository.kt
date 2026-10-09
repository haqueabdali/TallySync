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



    suspend fun getGoodsReceipts(
        purchaseOrderId: String? = null,
        warehouseId: String? = null,
        status: String? = null,
        page: Int = 1,
        limit: Int = 20
    ) = api.getGoodsReceipts(
        purchaseOrderId = purchaseOrderId,
        warehouseId = warehouseId,
        status = status,
        page = page,
        limit = limit
    )

    suspend fun getGoodsReceipt(
        id: String
    ) = api.getGoodsReceipt(id)

    suspend fun createGoodsReceipt(
        request: com.example.tallysyncapp.data.network.CreateGoodsReceiptRequest
    ) = api.createGoodsReceipt(request)

    suspend fun postGoodsReceipt(
        id: String
    ) = api.postGoodsReceipt(id)

    suspend fun reverseGoodsReceipt(
        id: String
    ) = api.reverseGoodsReceipt(id)

    suspend fun deleteGoodsReceipt(
        id: String
    ) = api.deleteGoodsReceipt(id)



    // Stage 6N - Purchase Invoices

    suspend fun getPurchaseInvoices(
        search: String? = null,
        supplierId: String? = null,
        purchaseOrderId: String? = null,
        goodsReceiptId: String? = null,
        status: String? = null,
        page: Int = 1,
        limit: Int = 20
    ) = api.getPurchaseInvoices(
        search = search,
        supplierId = supplierId,
        purchaseOrderId = purchaseOrderId,
        goodsReceiptId = goodsReceiptId,
        status = status,
        page = page,
        limit = limit
    )

    suspend fun getPurchaseInvoice(id: String) =
        api.getPurchaseInvoice(id)

    suspend fun createPurchaseInvoice(
        request: com.example.tallysyncapp.data.network.SavePurchaseInvoiceRequest
    ) = api.createPurchaseInvoice(request)

    suspend fun updatePurchaseInvoice(
        id: String,
        request: com.example.tallysyncapp.data.network.SavePurchaseInvoiceRequest
    ) = api.updatePurchaseInvoice(id, request)

    suspend fun postPurchaseInvoice(id: String) =
        api.postPurchaseInvoice(id)

    suspend fun cancelPurchaseInvoice(id: String) =
        api.cancelPurchaseInvoice(id)

    suspend fun deletePurchaseInvoice(id: String) =
        api.deletePurchaseInvoice(id)

    // Stage 6N - Supplier Payments

    suspend fun getSupplierPayments(
        search: String? = null,
        supplierId: String? = null,
        status: String? = null,
        paymentMethod: String? = null,
        page: Int = 1,
        limit: Int = 20
    ) = api.getSupplierPayments(
        search = search,
        supplierId = supplierId,
        status = status,
        paymentMethod = paymentMethod,
        page = page,
        limit = limit
    )

    suspend fun getSupplierPayment(id: String) =
        api.getSupplierPayment(id)

    suspend fun createSupplierPayment(
        request: com.example.tallysyncapp.data.network.SaveSupplierPaymentRequest
    ) = api.createSupplierPayment(request)

    suspend fun updateSupplierPayment(
        id: String,
        request: com.example.tallysyncapp.data.network.SaveSupplierPaymentRequest
    ) = api.updateSupplierPayment(id, request)

    suspend fun postSupplierPayment(id: String) =
        api.postSupplierPayment(id)

    suspend fun cancelSupplierPayment(id: String) =
        api.cancelSupplierPayment(id)

    suspend fun deleteSupplierPayment(id: String) =
        api.deleteSupplierPayment(id)


    // Stage 6Q - Sales Invoices

    suspend fun getSalesInvoices(
        search: String? = null,
        customerId: String? = null,
        salesOrderId: String? = null,
        deliveryNoteId: String? = null,
        status: String? = null,
        page: Int = 1,
        limit: Int = 20
    ) = api.getSalesInvoices(
        search = search,
        customerId = customerId,
        salesOrderId = salesOrderId,
        deliveryNoteId = deliveryNoteId,
        status = status,
        page = page,
        limit = limit
    )

    suspend fun getSalesInvoice(id: String) =
        api.getSalesInvoice(id)

    suspend fun createSalesInvoice(
        request: com.example.tallysyncapp.data.network.SaveSalesInvoiceRequest
    ) = api.createSalesInvoice(request)

    suspend fun updateSalesInvoice(
        id: String,
        request: com.example.tallysyncapp.data.network.SaveSalesInvoiceRequest
    ) = api.updateSalesInvoice(id, request)

    suspend fun postSalesInvoice(id: String) =
        api.postSalesInvoice(id)

    suspend fun cancelSalesInvoice(id: String) =
        api.cancelSalesInvoice(id)

    suspend fun deleteSalesInvoice(id: String) =
        api.deleteSalesInvoice(id)
}
