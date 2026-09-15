package com.example.tallysyncapp.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.example.tallysyncapp.data.local.entity.PendingOrderEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface PendingOrderDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(order: PendingOrderEntity)

    @Query(
        """
        SELECT * FROM pending_orders
        WHERE status IN ('PENDING', 'FAILED')
          AND backendOrderId IS NULL
        ORDER BY createdAt ASC
        """
    )
    suspend fun getOrdersReadyForSync(): List<PendingOrderEntity>

    @Query(
        """
        SELECT COUNT(*) FROM pending_orders
        WHERE status IN ('PENDING', 'FAILED', 'SYNCING')
        """
    )
    fun observePendingCount(): Flow<Int>

    @Query("SELECT * FROM pending_orders ORDER BY createdAt DESC")
    fun observePendingOrders(): Flow<List<PendingOrderEntity>>

    @Query("SELECT * FROM pending_orders WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): PendingOrderEntity?

    @Query(
        """
        UPDATE pending_orders
        SET status = :status,
            lastError = :lastError,
            updatedAt = :updatedAt
        WHERE id = :id
        """
    )
    suspend fun updateStatus(
        id: String,
        status: String,
        lastError: String? = null,
        updatedAt: Long = System.currentTimeMillis()
    )

    @Query(
        """
        UPDATE pending_orders
        SET status = 'FAILED',
            retryCount = retryCount + 1,
            lastError = :error,
            updatedAt = :updatedAt
        WHERE id = :id
          AND backendOrderId IS NULL
        """
    )
    suspend fun markFailed(
        id: String,
        error: String,
        updatedAt: Long = System.currentTimeMillis()
    )

    @Query(
        """
        UPDATE pending_orders
        SET status = 'SYNCED',
            backendOrderId = :backendOrderId,
            backendOrderNumber = :backendOrderNumber,
            lastError = NULL,
            updatedAt = :updatedAt
        WHERE id = :id
        """
    )
    suspend fun markSynced(
        id: String,
        backendOrderId: String,
        backendOrderNumber: String,
        updatedAt: Long = System.currentTimeMillis()
    )
}
