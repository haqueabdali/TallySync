package com.example.tallysyncapp.data.network

data class CreateSalesOrderRequest(
    val customerId: String,
    val notes: String? = null,
    val items: List<CreateSalesOrderItemRequest>
)

data class CreateSalesOrderItemRequest(
    val productId: String,
    val quantity: Int,
    val unitPrice: Double
)