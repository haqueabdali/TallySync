package com.example.tallysyncapp.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.example.tallysyncapp.data.network.ProductListItem

@Entity(tableName = "cached_products")
data class CachedProductEntity(
    @PrimaryKey val id: String,
    val name: String,
    val sku: String? = null,
    val barcode: String? = null,
    val sellingPrice: Double = 0.0,
    val stock: Double = 0.0,
    val unit: String? = null,
    val cachedAt: Long = System.currentTimeMillis()
) {
    fun toNetworkModel() = ProductListItem(
        id = id,
        name = name,
        sku = sku,
        barcode = barcode,
        sellingPrice = sellingPrice,
        stock = stock,
        unit = unit
    )

    companion object {
        fun fromNetwork(value: ProductListItem) =
            CachedProductEntity(
                id = value.id,
                name = value.name,
                sku = value.sku,
                barcode = value.barcode,
                sellingPrice = value.sellingPrice,
                stock = value.stock,
                unit = value.unit
            )
    }
}
