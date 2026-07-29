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

    @Query("SELECT * FROM pending_orders WHERE status IN ('PENDING', 'FAILED') ORDER BY createdAt ASC")
    suspend fun getOrdersReadyForSync(): List<PendingOrderEntity>

    @Query("SELECT COUNT(*) FROM pending_orders WHERE status IN ('PENDING', 'FAILED', 'SYNCING')")
    fun observePendingCount(): Flow<Int>

    @Query("DELETE FROM pending_orders WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("UPDATE pending_orders SET status = :status, lastError = :lastError, updatedAt = :updatedAt WHERE id = :id")
    suspend fun updateStatus(
        id: String,
        status: String,
        lastError: String? = null,
        updatedAt: Long = System.currentTimeMillis()
    )

    @Query("UPDATE pending_orders SET status = 'FAILED', retryCount = retryCount + 1, lastError = :error, updatedAt = :updatedAt WHERE id = :id")
    suspend fun markFailed(
        id: String,
        error: String,
        updatedAt: Long = System.currentTimeMillis()
    )
}
