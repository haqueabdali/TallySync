package com.example.tallysyncapp.data.network

data class CartItem(
    val product: ProductListItem,
    val quantity: Int = 1
) {
    val unitPrice: Double
        get() = product.sellingPrice

    val subtotal: Double
        get() = unitPrice * quantity

    val lineTotal: Double
        get() = subtotal
}