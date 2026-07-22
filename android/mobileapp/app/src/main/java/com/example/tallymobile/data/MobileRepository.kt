package com.example.tallymobile.data

import com.example.tallymobile.data.network.ApiClient

class MobileRepository {
    private val api = ApiClient.mobileApi

    suspend fun getDashboard() = api.getDashboard()

    suspend fun getSalesOrders(
        syncStatus: String? = null,
        search: String? = null,
        page: Int = 1
    ) = api.getSalesOrders(syncStatus, search, page)

    suspend fun getSalesOrder(id: String) = api.getSalesOrder(id)

    suspend fun syncSalesOrder(id: String) = api.syncSalesOrder(id)

    suspend fun retrySalesOrder(id: String) = api.retrySalesOrder(id)

    suspend fun syncPendingSalesOrders() = api.syncPendingSalesOrders()
}
