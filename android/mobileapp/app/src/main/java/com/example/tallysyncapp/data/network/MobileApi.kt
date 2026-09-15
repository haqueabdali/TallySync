package com.example.tallysyncapp.data.network

import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface MobileApi {
    @GET("mobile/dashboard")
    suspend fun getDashboard(): ApiResponse<DashboardData>

    @GET("mobile/customers")
    suspend fun getCustomers(@Query("search") search: String? = null): ApiResponse<List<CustomerListItem>>

    @POST("customers")
    suspend fun createCustomer(@Body request: SaveCustomerRequest): CustomerRecord

    @GET("customers/{id}")
    suspend fun getCustomer(@Path("id") id: String): CustomerRecord

    @PATCH("customers/{id}")
    suspend fun updateCustomer(
        @Path("id") id: String,
        @Body request: SaveCustomerRequest
    ): CustomerRecord

    @PATCH("customers/{id}/status")
    suspend fun updateCustomerStatus(
        @Path("id") id: String,
        @Body request: UpdateActiveStatusRequest
    ): CustomerRecord

    @POST("tally/masters/customers/{id}/sync")
    suspend fun syncCustomerMaster(
        @Path("id") id: String
    ): CustomerMasterSyncResult

    @GET("mobile/products")
    suspend fun getProducts(@Query("search") search: String? = null): ApiResponse<List<ProductListItem>>

    @POST("items")
    suspend fun createProduct(@Body request: SaveProductRequest): ProductRecord

    @GET("items/{id}")
    suspend fun getProduct(@Path("id") id: String): ProductRecord

    @PATCH("items/{id}")
    suspend fun updateProduct(
        @Path("id") id: String,
        @Body request: SaveProductRequest
    ): ProductRecord

    @PATCH("items/{id}/status")
    suspend fun updateProductStatus(
        @Path("id") id: String,
        @Body request: UpdateActiveStatusRequest
    ): ProductRecord

    @POST("tally/masters/items/{id}/sync")
    suspend fun syncProductMaster(
        @Path("id") id: String
    ): ProductMasterSyncResult

    @GET("mobile/sales-orders")
    suspend fun getSalesOrders(
        @Query("syncStatus") syncStatus: String? = null,
        @Query("search") search: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): ApiResponse<SalesOrdersPage>

    @GET("mobile/sales-orders/{id}")
    suspend fun getSalesOrder(@Path("id") id: String): ApiResponse<SalesOrderDetails>

    @POST("mobile/sales-orders")
    suspend fun createSalesOrder(@Body request: CreateSalesOrderRequest): ApiResponse<CreateSalesOrderResult>

    @POST("sales-orders/{id}/fulfill")
    suspend fun fulfillSalesOrder(@Path("id") id: String): SalesOrderLifecycleResult

    @POST("mobile/sales-orders/{id}/sync")
    suspend fun syncSalesOrder(@Path("id") id: String): ApiResponse<SyncResult>

    @POST("mobile/sales-orders/{id}/retry")
    suspend fun retrySalesOrder(@Path("id") id: String): ApiResponse<SyncResult>

    @POST("mobile/sales-orders/sync-pending")
    suspend fun syncPendingSalesOrders(): ApiResponse<SyncResult>

    @GET("suppliers")
    suspend fun getSuppliers(@Query("search") search: String? = null): ApiResponse<List<SupplierListItem>>

    @GET("suppliers/{id}")suspend fun getSupplier(@Path("id") id: String): SupplierListItem
   
    @POST("suppliers")
    suspend fun createSupplier(@Body request: SaveSupplierRequest): ApiResponse<SupplierListItem>

    @PATCH("suppliers/{id}")
    suspend fun updateSupplier(@Path("id") id: String, @Body request: SaveSupplierRequest): ApiResponse<SupplierListItem>

    @PATCH("suppliers/{id}/status")
    suspend fun updateSupplierStatus(
    @Path("id") id: String,
    @Body request: UpdateActiveStatusRequest
    ): ApiResponse<SupplierListItem>
    
    @DELETE("suppliers/{id}")
    suspend fun deleteSupplier(@Path("id") id: String)
                    @GET("warehouses")
    suspend fun getWarehouses(
        @Query("isActive") isActive: Boolean? = true,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 100
    ): WarehousesPage

    @GET("purchase-orders")
    suspend fun getPurchaseOrders(
        @Query("search") search: String? = null,
        @Query("status") status: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): PurchaseOrdersPage

    @GET("purchase-orders/{id}")
    suspend fun getPurchaseOrder(
        @Path("id") id: String
    ): PurchaseOrderRecord

    @POST("purchase-orders")
    suspend fun createPurchaseOrder(
        @Body request: SavePurchaseOrderRequest
    ): PurchaseOrderRecord

    @PATCH("purchase-orders/{id}")
    suspend fun updatePurchaseOrder(
        @Path("id") id: String,
        @Body request: SavePurchaseOrderRequest
    ): PurchaseOrderRecord

    @PATCH("purchase-orders/{id}/send")
    suspend fun sendPurchaseOrder(
        @Path("id") id: String
    ): PurchaseOrderRecord

    @PATCH("purchase-orders/{id}/cancel")
    suspend fun cancelPurchaseOrder(
        @Path("id") id: String
    ): PurchaseOrderRecord

    @DELETE("purchase-orders/{id}")
    suspend fun deletePurchaseOrder(
        @Path("id") id: String
    )




    @GET("goods-receipts")
    suspend fun getGoodsReceipts(
        @Query("purchaseOrderId") purchaseOrderId: String? = null,
        @Query("warehouseId") warehouseId: String? = null,
        @Query("status") status: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): GoodsReceiptsPage

    @GET("goods-receipts/{id}")
    suspend fun getGoodsReceipt(
        @Path("id") id: String
    ): GoodsReceiptRecord

    @POST("goods-receipts")
    suspend fun createGoodsReceipt(
        @Body request: CreateGoodsReceiptRequest
    ): GoodsReceiptRecord

    @POST("goods-receipts/{id}/post")
    suspend fun postGoodsReceipt(
        @Path("id") id: String
    ): GoodsReceiptRecord

    @POST("goods-receipts/{id}/reverse")
    suspend fun reverseGoodsReceipt(
        @Path("id") id: String
    ): GoodsReceiptRecord

    @DELETE("goods-receipts/{id}")
    suspend fun deleteGoodsReceipt(
        @Path("id") id: String
    )



    // Stage 6N - Purchase Invoices

    @GET("purchase-invoices")
    suspend fun getPurchaseInvoices(
        @Query("search") search: String? = null,
        @Query("supplierId") supplierId: String? = null,
        @Query("purchaseOrderId") purchaseOrderId: String? = null,
        @Query("goodsReceiptId") goodsReceiptId: String? = null,
        @Query("status") status: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): PurchaseInvoicesPage

    @GET("purchase-invoices/{id}")
    suspend fun getPurchaseInvoice(
        @Path("id") id: String
    ): PurchaseInvoiceRecord

    @POST("purchase-invoices")
    suspend fun createPurchaseInvoice(
        @Body request: SavePurchaseInvoiceRequest
    ): PurchaseInvoiceRecord

    @PATCH("purchase-invoices/{id}")
    suspend fun updatePurchaseInvoice(
        @Path("id") id: String,
        @Body request: SavePurchaseInvoiceRequest
    ): PurchaseInvoiceRecord

    @POST("purchase-invoices/{id}/post")
    suspend fun postPurchaseInvoice(
        @Path("id") id: String
    ): PurchaseInvoiceRecord

    @POST("purchase-invoices/{id}/cancel")
    suspend fun cancelPurchaseInvoice(
        @Path("id") id: String
    ): PurchaseInvoiceRecord

    @DELETE("purchase-invoices/{id}")
    suspend fun deletePurchaseInvoice(
        @Path("id") id: String
    )

    // Stage 6N - Supplier Payments

    @GET("supplier-payments")
    suspend fun getSupplierPayments(
        @Query("search") search: String? = null,
        @Query("supplierId") supplierId: String? = null,
        @Query("status") status: String? = null,
        @Query("paymentMethod") paymentMethod: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): SupplierPaymentsPage

    @GET("supplier-payments/{id}")
    suspend fun getSupplierPayment(
        @Path("id") id: String
    ): SupplierPaymentRecord

    @POST("supplier-payments")
    suspend fun createSupplierPayment(
        @Body request: SaveSupplierPaymentRequest
    ): SupplierPaymentRecord

    @PATCH("supplier-payments/{id}")
    suspend fun updateSupplierPayment(
        @Path("id") id: String,
        @Body request: SaveSupplierPaymentRequest
    ): SupplierPaymentRecord

    @POST("supplier-payments/{id}/post")
    suspend fun postSupplierPayment(
        @Path("id") id: String
    ): SupplierPaymentRecord

    @POST("supplier-payments/{id}/cancel")
    suspend fun cancelSupplierPayment(
        @Path("id") id: String
    ): SupplierPaymentRecord

    @DELETE("supplier-payments/{id}")
    suspend fun deleteSupplierPayment(
        @Path("id") id: String
    )


    // Stage 6Q - Sales Invoices

    @GET("sales-invoices")
    suspend fun getSalesInvoices(
        @Query("search") search: String? = null,
        @Query("customerId") customerId: String? = null,
        @Query("salesOrderId") salesOrderId: String? = null,
        @Query("deliveryNoteId") deliveryNoteId: String? = null,
        @Query("status") status: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): SalesInvoicesPage

    @GET("sales-invoices/{id}")
    suspend fun getSalesInvoice(
        @Path("id") id: String
    ): SalesInvoiceRecord

    @POST("sales-invoices")
    suspend fun createSalesInvoice(
        @Body request: SaveSalesInvoiceRequest
    ): SalesInvoiceRecord

    @PATCH("sales-invoices/{id}")
    suspend fun updateSalesInvoice(
        @Path("id") id: String,
        @Body request: SaveSalesInvoiceRequest
    ): SalesInvoiceRecord

    @POST("sales-invoices/{id}/post")
    suspend fun postSalesInvoice(
        @Path("id") id: String
    ): SalesInvoiceRecord

    @POST("sales-invoices/{id}/cancel")
    suspend fun cancelSalesInvoice(
        @Path("id") id: String
    ): SalesInvoiceRecord

    @DELETE("sales-invoices/{id}")
    suspend fun deleteSalesInvoice(
        @Path("id") id: String
    )

    // Stage 6R - Customer Payments

    @GET("customer-payments")
    suspend fun getCustomerPayments(
        @Query("search") search: String? = null,
        @Query("customerId") customerId: String? = null,
        @Query("status") status: String? = null,
        @Query("paymentMethod") paymentMethod: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): CustomerPaymentsPage

    @GET("customer-payments/{id}")
    suspend fun getCustomerPayment(@Path("id") id: String): CustomerPaymentRecord

    @POST("customer-payments")
    suspend fun createCustomerPayment(@Body request: SaveCustomerPaymentRequest): CustomerPaymentRecord

    @PATCH("customer-payments/{id}")
    suspend fun updateCustomerPayment(
        @Path("id") id: String,
        @Body request: SaveCustomerPaymentRequest
    ): CustomerPaymentRecord

    @POST("customer-payments/{id}/post")
    suspend fun postCustomerPayment(@Path("id") id: String): CustomerPaymentRecord

    @POST("customer-payments/{id}/reverse")
    suspend fun reverseCustomerPayment(
        @Path("id") id: String,
        @Body request: ReverseCustomerPaymentRequest
    ): CustomerPaymentRecord

    @POST("customer-payments/{id}/cancel")
    suspend fun cancelCustomerPayment(@Path("id") id: String): CustomerPaymentRecord

    @DELETE("customer-payments/{id}")
    suspend fun deleteCustomerPayment(@Path("id") id: String)


    // Stage 6S - Accounting Reports
    @GET("aged-receivables")
    suspend fun getAgedReceivables(
        @Query("asOfDate") asOfDate: String,
        @Query("customerId") customerId: String? = null,
        @Query("currency") currency: String? = "EUR",
        @Query("includeNotYetDue") includeNotYetDue: Boolean = true,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 200
    ): AgedReceivablesReport

    @GET("aged-payables")
    suspend fun getAgedPayables(
        @Query("asOfDate") asOfDate: String,
        @Query("supplierId") supplierId: String? = null,
        @Query("currency") currency: String? = "EUR",
        @Query("includeNotYetDue") includeNotYetDue: Boolean = true,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 200
    ): AgedPayablesReport

    @GET("customer-statements")
    suspend fun getCustomerStatement(
        @Query("customerId") customerId: String,
        @Query("dateFrom") dateFrom: String,
        @Query("dateTo") dateTo: String,
        @Query("currency") currency: String? = "EUR",
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 500
    ): CustomerStatementReport

    @GET("supplier-statements")
    suspend fun getSupplierStatement(
        @Query("supplierId") supplierId: String,
        @Query("dateFrom") dateFrom: String,
        @Query("dateTo") dateTo: String,
        @Query("currency") currency: String? = "EUR",
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 500
    ): SupplierStatementReport

}

