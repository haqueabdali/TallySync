package com.example.tallysyncapp.data.repository

import com.example.tallysyncapp.data.network.CreateSalesOrderRequest
import com.example.tallysyncapp.data.network.MobileApi
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MobileRepository @Inject constructor(
    private val api: MobileApi
) {
    suspend fun getDashboard() = api.getDashboard()
    suspend fun getCustomers(search: String? = null) = api.getCustomers(search)
    suspend fun getProducts(search: String? = null) = api.getProducts(search)
    suspend fun getSalesOrders(syncStatus: String? = null, search: String? = null, page: Int = 1) =
        api.getSalesOrders(syncStatus, search, page)
    suspend fun getSalesOrder(id: String) = api.getSalesOrder(id)
    suspend fun createSalesOrder(request: CreateSalesOrderRequest) = api.createSalesOrder(request)
    suspend fun syncSalesOrder(id: String) = api.syncSalesOrder(id)
    suspend fun retrySalesOrder(id: String) = api.retrySalesOrder(id)
    suspend fun syncPendingSalesOrders() = api.syncPendingSalesOrders()
}