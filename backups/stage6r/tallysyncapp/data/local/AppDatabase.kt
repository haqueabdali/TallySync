package com.example.tallysyncapp.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.example.tallysyncapp.data.local.dao.PendingOrderDao
import com.example.tallysyncapp.data.local.entity.PendingOrderEntity

@Database(
    entities = [PendingOrderEntity::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun pendingOrderDao(): PendingOrderDao
}
