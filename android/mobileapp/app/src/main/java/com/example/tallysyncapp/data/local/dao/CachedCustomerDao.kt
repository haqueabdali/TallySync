package com.example.tallysyncapp.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.example.tallysyncapp.data.local.entity.CachedCustomerEntity

@Dao
interface CachedCustomerDao {

    @Query("SELECT * FROM cached_customers ORDER BY name COLLATE NOCASE")
    suspend fun getAll(): List<CachedCustomerEntity>

    @Query(
        """
        SELECT * FROM cached_customers
        WHERE name LIKE '%' || :search || '%'
           OR phone LIKE '%' || :search || '%'
           OR email LIKE '%' || :search || '%'
        ORDER BY name COLLATE NOCASE
        """
    )
    suspend fun search(search: String): List<CachedCustomerEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(items: List<CachedCustomerEntity>)

    @Query("DELETE FROM cached_customers")
    suspend fun deleteAll()
}
