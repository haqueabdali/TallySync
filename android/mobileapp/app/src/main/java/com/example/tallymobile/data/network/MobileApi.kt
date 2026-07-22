package com.example.tallymobile.data.network

import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface MobileApi {
    @GET("mobile/dashboard")
    suspend fun getDashboard(): ApiResponse<DashboardData>

    @GET("mobile/sales-orders")
    suspend fun getSalesOrders(
        @Query("syncStatus") syncStatus: String? = null,
        @Query("search") search: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): ApiResponse<SalesOrderPage>

    @GET("mobile/sales-orders/{id}")
    suspend fun getSalesOrder(
        @Path("id") id: String
    ): ApiResponse<SalesOrderDetails>

    @POST("mobile/sales-orders/{id}/sync")
    suspend fun syncSalesOrder(
        @Path("id") id: String
    ): ApiResponse<SyncResult>

    @POST("mobile/sales-orders/{id}/retry")
    suspend fun retrySalesOrder(
        @Path("id") id: String
    ): ApiResponse<SyncResult>

    @POST("mobile/sales-orders/sync-pending")
    suspend fun syncPendingSalesOrders(): ApiResponse<BulkSyncResult>

    @GET("mobile/tally/status")
    suspend fun getTallyStatus(): ApiResponse<TallyStatus>
}
