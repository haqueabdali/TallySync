package com.example.tallysyncapp.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "pending_orders")
data class PendingOrderEntity(
    @PrimaryKey val id: String,
    val localOrderNumber: String,
    val requestJson: String,

    // Local upload lifecycle only.
    val status: String = STATUS_PENDING,

    val retryCount: Int = 0,
    val lastError: String? = null,

    // Stable backend identity after a successful create.
    val backendOrderId: String? = null,
    val backendOrderNumber: String? = null,

    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
) {
    companion object {
        const val STATUS_PENDING = "PENDING"
        const val STATUS_SYNCING = "SYNCING"
        const val STATUS_FAILED = "FAILED"
        const val STATUS_SYNCED = "SYNCED"
    }
}
