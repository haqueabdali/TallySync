package your.package.data.remote.dto

data class CreateSalesOrderRequest(
    val customerId: String,
    val notes: String?,
    val items: List<CreateSalesOrderItemRequest>
)

data class CreateSalesOrderItemRequest(
    val productId: String,
    val quantity: Int,
    val unitPrice: Double
)