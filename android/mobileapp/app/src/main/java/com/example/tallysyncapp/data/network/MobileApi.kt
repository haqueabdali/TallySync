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



}

