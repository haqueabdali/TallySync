package com.example.tallysyncapp.di

import android.content.Context
import androidx.room.Room
import androidx.work.WorkManager
import com.example.tallysyncapp.data.local.AppDatabase
import com.example.tallysyncapp.data.local.dao.PendingOrderDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    @Provides
    @Singleton
    fun provideAppDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            "tallysync-mobile.db"
        ).fallbackToDestructiveMigration().build()

    @Provides
    fun providePendingOrderDao(database: AppDatabase): PendingOrderDao =
        database.pendingOrderDao()

    @Provides
    @Singleton
    fun provideWorkManager(@ApplicationContext context: Context): WorkManager =
        WorkManager.getInstance(context)
}
