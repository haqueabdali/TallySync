package com.example.tallysyncapp.worker

import android.content.Context
import android.util.Log
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
        Log.i(TAG, "OrderSyncWorker started. attempt=$runAttemptCount")

        val orders = dao.getOrdersReadyForSync()

        Log.i(
            TAG,
            "Ready offline orders=${orders.size}"
        )

        if (orders.isEmpty()) {
            Log.i(TAG, "No eligible offline orders. Worker completed.")
            return Result.success()
        }

        var retryRequired = false

        for (order in orders) {

            Log.i(
                TAG,
                "Processing local order=${order.id}, " +
                    "localNumber=${order.localOrderNumber}, " +
                    "status=${order.status}"
            )

            // Defensive protection:
            // a row that already owns a backend ID must never be created again.
            val latest = dao.getById(order.id)

            if (latest?.backendOrderId != null) {
                continue
            }

            dao.updateStatus(
                id = order.id,
                status = PendingOrderEntity.STATUS_SYNCING
            )

            try {
                val request = gson.fromJson(
                    order.requestJson,
                    CreateSalesOrderRequest::class.java
                )

                /*
                 * IMPORTANT:
                 *
                 * This worker performs ONLY backend Sales Order creation.
                 *
                 * It must never:
                 * - fulfill the order
                 * - call Tally synchronization
                 * - call retrySalesOrder()
                 * - call syncPendingSalesOrders()
                 */

                val response = repository.createSalesOrder(request)

                val result = response.data

                if (result == null || result.id.isBlank()) {
                    dao.markFailed(
                        order.id,
                        "Backend returned no Sales Order identity"
                    )
                    retryRequired = true
                    break
                }

                dao.markSynced(
                    id = order.id,
                    backendOrderId = result.id,
                    backendOrderNumber = result.orderNumber
                )

                Log.i(
                    TAG,
                    "Offline order synchronized. " +
                        "localId=${order.id}, " +
                        "backendId=${result.id}, " +
                        "backendNumber=${result.orderNumber}"
                )

            } catch (error: IOException) {

                dao.markFailed(
                    order.id,
                    error.message ?: "Network unavailable"
                )

                retryRequired = true
                break

            } catch (error: HttpException) {

                val code = error.code()

                dao.markFailed(
                    order.id,
                    "Server error $code"
                )

                // Authentication/validation errors require user intervention.
                // Server failures are safe candidates for WorkManager retry.
                if (code >= 500) {
                    retryRequired = true
                    break
                }

            } catch (error: Exception) {

                dao.markFailed(
                    order.id,
                    error.message ?: "Unable to upload offline order"
                )
            }
        }

        return if (retryRequired) {
            Result.retry()
        } else {
            Result.success()
        }
    }

    companion object {
        const val UNIQUE_WORK_NAME = "offline-order-sync"
        private const val TAG = "OrderSyncWorker"
    }
}
