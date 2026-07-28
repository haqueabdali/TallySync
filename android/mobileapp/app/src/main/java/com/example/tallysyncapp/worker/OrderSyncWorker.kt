package com.example.tallysyncapp.worker

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.example.tallysyncapp.data.local.dao.PendingOrderDao
import com.example.tallysyncapp.data.local.entity.PendingOrderEntity
import com.example.tallysyncapp.data.network.CreateSalesOrderRequest
import com.example.tallysyncapp.data.repository.MobileRepository
import com.google.gson.Gson
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import retrofit2.HttpException
import java.io.IOException

@HiltWorker
class OrderSyncWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted workerParameters: WorkerParameters,
    private val dao: PendingOrderDao,
    private val repository: MobileRepository,
    private val gson: Gson
) : CoroutineWorker(appContext, workerParameters) {

    override suspend fun doWork(): Result {
        val orders = dao.getOrdersReadyForSync()
        if (orders.isEmpty()) return Result.success()

        var retryRequired = false

        for (order in orders) {
            dao.updateStatus(order.id, PendingOrderEntity.STATUS_SYNCING)
            try {
                val request = gson.fromJson(order.requestJson, CreateSalesOrderRequest::class.java)
                repository.createSalesOrder(request)
                dao.deleteById(order.id)
            } catch (error: IOException) {
                dao.markFailed(order.id, error.message ?: "Network unavailable")
                retryRequired = true
                break
            } catch (error: HttpException) {
                dao.markFailed(order.id, "Server error ${error.code()}")
                if (error.code() >= 500) retryRequired = true
            } catch (error: Exception) {
                dao.markFailed(order.id, error.message ?: "Unable to sync order")
            }
        }

        return if (retryRequired) Result.retry() else Result.success()
    }

    companion object {
        const val UNIQUE_WORK_NAME = "offline-order-sync"
    }
}
