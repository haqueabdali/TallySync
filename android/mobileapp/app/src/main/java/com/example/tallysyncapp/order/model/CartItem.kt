package your.package.mobile.order.model

import your.package.data.remote.dto.ProductListItem

data class CartItem(
    val product: ProductListItem,
    val quantity: Int = 1
) {
    val unitPrice: Double
        get() = product.sellingPrice

    val lineTotal: Double
        get() = unitPrice * quantity
}