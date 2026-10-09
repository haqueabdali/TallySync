package com.example.tallysyncapp.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.example.tallysyncapp.data.network.CustomerListItem

@Entity(tableName = "cached_customers")
data class CachedCustomerEntity(
    @PrimaryKey val id: String,
    val name: String,
    val phone: String? = null,
    val email: String? = null,
    val address: String? = null,
    val cachedAt: Long = System.currentTimeMillis()
) {
    fun toNetworkModel() = CustomerListItem(
        id = id,
        name = name,
        phone = phone,
        email = email,
        address = address
    )

    companion object {
        fun fromNetwork(value: CustomerListItem) =
            CachedCustomerEntity(
                id = value.id,
                name = value.name,
                phone = value.phone,
                email = value.email,
                address = value.address
            )
    }
}
