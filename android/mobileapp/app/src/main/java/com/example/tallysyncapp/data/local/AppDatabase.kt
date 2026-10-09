package com.example.tallysyncapp.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.example.tallysyncapp.data.local.dao.CachedCustomerDao
import com.example.tallysyncapp.data.local.dao.CachedProductDao
import com.example.tallysyncapp.data.local.dao.PendingOrderDao
import com.example.tallysyncapp.data.local.entity.CachedCustomerEntity
import com.example.tallysyncapp.data.local.entity.CachedProductEntity
import com.example.tallysyncapp.data.local.entity.PendingOrderEntity

@Database(
    entities = [
        PendingOrderEntity::class,
        CachedCustomerEntity::class,
        CachedProductEntity::class
    ],
    version = 3,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun pendingOrderDao(): PendingOrderDao
    abstract fun cachedCustomerDao(): CachedCustomerDao
    abstract fun cachedProductDao(): CachedProductDao
}
