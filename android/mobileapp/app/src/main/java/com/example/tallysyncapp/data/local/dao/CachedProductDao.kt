package com.example.tallysyncapp.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.example.tallysyncapp.data.local.entity.CachedProductEntity

@Dao
interface CachedProductDao {

    @Query("SELECT * FROM cached_products ORDER BY name COLLATE NOCASE")
    suspend fun getAll(): List<CachedProductEntity>

    @Query(
        """
        SELECT * FROM cached_products
        WHERE name LIKE '%' || :search || '%'
           OR sku LIKE '%' || :search || '%'
           OR barcode LIKE '%' || :search || '%'
        ORDER BY name COLLATE NOCASE
        """
    )
    suspend fun search(search: String): List<CachedProductEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(items: List<CachedProductEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(item: CachedProductEntity)

    @Query("DELETE FROM cached_products WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("DELETE FROM cached_products")
    suspend fun deleteAll()
}
