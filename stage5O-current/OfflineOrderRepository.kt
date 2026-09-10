package com.example.tallysyncapp.data.repository

import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.example.tallysyncapp.data.local.dao.PendingOrderDao
import com.example.tallysyncapp.data.local.entity.PendingOrderEntity
import com.example.tallysyncapp.data.network.CreateSalesOrderRequest
import com.example.tallysyncapp.worker.OrderSyncWorker
import com.google.gson.Gson
import kotlinx.coroutines.flow.Flow
import java.util.UUID
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class OfflineOrderRepository @Inject constructor(
    private val dao: PendingOrderDao,
    private val gson: Gson,
    private val workManager: WorkManager
) {
    val pendingCount: Flow<Int> = dao.observePendingCount()

    suspend fun save(request: CreateSalesOrderRequest): PendingOrderEntity {
        val id = UUID.randomUUID().toString()
        val order = PendingOrderEntity(
            id = id,
            localOrderNumber = "OFF-${System.currentTimeMillis()}",
            requestJson = gson.toJson(request)
        )
        dao.insert(order)
        enqueueSync()
        return order
    }

    fun enqueueSync() {
        val request = OneTimeWorkRequestBuilder<OrderSyncWorker>()
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()
            )
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.SECONDS)
            .build()

        workManager.enqueueUniqueWork(
            OrderSyncWorker.UNIQUE_WORK_NAME,
            ExistingWorkPolicy.KEEP,
            request
        )
    }
}
