package com.example.tallysyncapp.di

import android.content.Context
import androidx.room.Room
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import androidx.work.WorkManager
import com.example.tallysyncapp.data.local.AppDatabase
import com.example.tallysyncapp.data.local.dao.PendingOrderDao
import com.example.tallysyncapp.data.local.dao.CachedProductDao
import com.example.tallysyncapp.data.local.dao.CachedCustomerDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    /*
     * Stage 6U
     *
     * Preserve offline Sales Orders when upgrading the local database
     * from schema version 1 to version 2.
     *
     * Version 2 adds backend identity after WorkManager successfully
     * creates the Sales Order on the server.
     */
    private val MIGRATION_1_2 = object : Migration(1, 2) {
        override fun migrate(db: SupportSQLiteDatabase) {
            db.execSQL(
                "ALTER TABLE pending_orders ADD COLUMN backendOrderId TEXT"
            )
            db.execSQL(
                "ALTER TABLE pending_orders ADD COLUMN backendOrderNumber TEXT"
            )
        }
    }


    /*
     * Stage 6U - schema 2 -> 3
     *
     * Add offline customer/product master caches without touching
     * pending Sales Orders.
     */
    private val MIGRATION_2_3 = object : Migration(2, 3) {
        override fun migrate(db: SupportSQLiteDatabase) {
            db.execSQL(
                """
                CREATE TABLE IF NOT EXISTS cached_customers (
                    id TEXT NOT NULL PRIMARY KEY,
                    name TEXT NOT NULL,
                    phone TEXT,
                    email TEXT,
                    address TEXT,
                    cachedAt INTEGER NOT NULL
                )
                """.trimIndent()
            )

            db.execSQL(
                """
                CREATE TABLE IF NOT EXISTS cached_products (
                    id TEXT NOT NULL PRIMARY KEY,
                    name TEXT NOT NULL,
                    sku TEXT,
                    barcode TEXT,
                    sellingPrice REAL NOT NULL,
                    stock REAL NOT NULL,
                    unit TEXT,
                    cachedAt INTEGER NOT NULL
                )
                """.trimIndent()
            )
        }
    }

    @Provides
    @Singleton
    fun provideAppDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            "tallysync-mobile.db"
        )
            .addMigrations(MIGRATION_1_2, MIGRATION_2_3)
            .build()

    @Provides
    fun providePendingOrderDao(database: AppDatabase): PendingOrderDao =
        database.pendingOrderDao()

    @Provides
    fun provideCachedCustomerDao(database: AppDatabase): CachedCustomerDao =
        database.cachedCustomerDao()

    @Provides
    fun provideCachedProductDao(database: AppDatabase): CachedProductDao =
        database.cachedProductDao()

    @Provides
    @Singleton
    fun provideWorkManager(@ApplicationContext context: Context): WorkManager =
        WorkManager.getInstance(context)
}
