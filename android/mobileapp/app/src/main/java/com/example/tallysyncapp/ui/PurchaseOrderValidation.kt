package com.example.tallysyncapp.ui

import com.example.tallysyncapp.data.network.PurchaseOrderItemRequest
import com.example.tallysyncapp.data.network.SavePurchaseOrderRequest
import java.math.BigDecimal
import java.math.RoundingMode

data class PurchaseOrderLineInput(
    val itemId: String = "",
    val quantity: String = "1",
    val unitPrice: String = "0",
    val discountPercentage: String = "0",
    val taxRate: String = "0"
)

data class PurchaseOrderFormInput(
    val supplierId: String = "",
    val warehouseId: String = "",
    val poDate: String = "",
    val expectedDeliveryDate: String = "",
    val currency: String = "EUR",
    val shippingAmount: String = "0",
    val notes: String = "",
    val items: List<PurchaseOrderLineInput> = emptyList()
)

data class PurchaseOrderValidationResult(
    val request: SavePurchaseOrderRequest? = null,
    val errors: List<String> = emptyList()
) {
    val isValid: Boolean
        get() = request != null && errors.isEmpty()
}

object PurchaseOrderValidation {

    fun validate(
        input: PurchaseOrderFormInput
    ): PurchaseOrderValidationResult {
        val errors = mutableListOf<String>()

        val supplierId = input.supplierId.trim()
        val warehouseId = input.warehouseId.trim()
        val poDate = input.poDate.trim()
        val expectedDeliveryDate =
            input.expectedDeliveryDate.trim()
        val currency = input.currency.trim().uppercase()
        val notes = input.notes.trim()

        if (supplierId.isEmpty()) {
            errors += "Supplier is required."
        }

        if (warehouseId.isEmpty()) {
            errors += "Warehouse is required."
        }

        if (!isIsoDate(poDate)) {
            errors += "PO date must use YYYY-MM-DD."
        }

        if (
            expectedDeliveryDate.isNotEmpty() &&
            !isIsoDate(expectedDeliveryDate)
        ) {
            errors +=
                "Expected delivery date must use YYYY-MM-DD."
        }

        if (
            expectedDeliveryDate.isNotEmpty() &&
            isIsoDate(poDate) &&
            isIsoDate(expectedDeliveryDate) &&
            expectedDeliveryDate < poDate
        ) {
            errors +=
                "Expected delivery date cannot be before PO date."
        }

        if (
            currency.length != 3 ||
            !currency.all { it.isLetter() }
        ) {
            errors += "Currency must contain exactly 3 letters."
        }

        if (notes.length > 2000) {
            errors += "Notes cannot exceed 2000 characters."
        }

        val shipping = parseDecimal(
            input.shippingAmount,
            scale = 2
        )

        if (shipping == null || shipping < BigDecimal.ZERO) {
            errors +=
                "Shipping amount must be a non-negative number with maximum 2 decimal places."
        }

        if (input.items.isEmpty()) {
            errors += "At least one purchase order item is required."
        }

        val duplicateIds = input.items
            .map { it.itemId.trim() }
            .filter { it.isNotEmpty() }
            .groupingBy { it }
            .eachCount()
            .filterValues { it > 1 }
            .keys

        if (duplicateIds.isNotEmpty()) {
            errors +=
                "The same product cannot be added more than once."
        }

        val requestItems = mutableListOf<PurchaseOrderItemRequest>()

        input.items.forEachIndexed { index, item ->
            val line = index + 1
            val itemId = item.itemId.trim()

            if (itemId.isEmpty()) {
                errors += "Line $line: product is required."
                return@forEachIndexed
            }

            val quantity = parseDecimal(
                item.quantity,
                scale = 4
            )

            val unitPrice = parseDecimal(
                item.unitPrice,
                scale = 4
            )

            val discount = parseDecimal(
                item.discountPercentage,
                scale = 4
            )

            val tax = parseDecimal(
                item.taxRate,
                scale = 4
            )

            if (quantity == null || quantity <= BigDecimal.ZERO) {
                errors +=
                    "Line $line: quantity must be greater than zero with maximum 4 decimal places."
            }

            if (unitPrice == null || unitPrice < BigDecimal.ZERO) {
                errors +=
                    "Line $line: unit price must be non-negative with maximum 4 decimal places."
            }

            if (
                discount == null ||
                discount < BigDecimal.ZERO ||
                discount > BigDecimal("100")
            ) {
                errors +=
                    "Line $line: discount must be between 0 and 100 with maximum 4 decimal places."
            }

            if (
                tax == null ||
                tax < BigDecimal.ZERO ||
                tax > BigDecimal("100")
            ) {
                errors +=
                    "Line $line: tax must be between 0 and 100 with maximum 4 decimal places."
            }

            if (
                quantity != null &&
                quantity > BigDecimal.ZERO &&
                unitPrice != null &&
                unitPrice >= BigDecimal.ZERO &&
                discount != null &&
                discount >= BigDecimal.ZERO &&
                discount <= BigDecimal("100") &&
                tax != null &&
                tax >= BigDecimal.ZERO &&
                tax <= BigDecimal("100")
            ) {
                requestItems += PurchaseOrderItemRequest(
                    itemId = itemId,
                    quantity = quantity.toDouble(),
                    unitPrice = unitPrice.toDouble(),
                    discountPercentage = discount.toDouble(),
                    taxRate = tax.toDouble()
                )
            }
        }

        if (errors.isNotEmpty() || shipping == null) {
            return PurchaseOrderValidationResult(
                errors = errors
            )
        }

        return PurchaseOrderValidationResult(
            request = SavePurchaseOrderRequest(
                supplierId = supplierId,
                warehouseId = warehouseId,
                poDate = poDate,
                expectedDeliveryDate =
                    expectedDeliveryDate.takeIf {
                        it.isNotEmpty()
                    },
                currency = currency,
                shippingAmount = shipping.toDouble(),
                notes = notes.takeIf { it.isNotEmpty() },
                items = requestItems
            )
        )
    }

    fun normalizeDecimal(value: String): String =
        value.trim().replace(',', '.')

    fun previewLineTotal(
        quantity: String,
        unitPrice: String,
        discountPercentage: String,
        taxRate: String
    ): BigDecimal? {
        val qty = parseDecimal(quantity, 4) ?: return null
        val price = parseDecimal(unitPrice, 4) ?: return null
        val discount =
            parseDecimal(discountPercentage, 4) ?: return null
        val tax = parseDecimal(taxRate, 4) ?: return null

        if (
            qty <= BigDecimal.ZERO ||
            price < BigDecimal.ZERO ||
            discount !in BigDecimal.ZERO..BigDecimal("100") ||
            tax !in BigDecimal.ZERO..BigDecimal("100")
        ) {
            return null
        }

        val base = qty.multiply(price)

        val discountAmount = base
            .multiply(discount)
            .divide(BigDecimal("100"))

        val afterDiscount = base.subtract(discountAmount)

        val taxAmount = afterDiscount
            .multiply(tax)
            .divide(BigDecimal("100"))

        return afterDiscount
            .add(taxAmount)
            .setScale(2, RoundingMode.HALF_UP)
    }

    private fun parseDecimal(
        value: String,
        scale: Int
    ): BigDecimal? {
        val normalized = normalizeDecimal(value)

        if (normalized.isEmpty()) return null

        val decimal = normalized.toBigDecimalOrNull()
            ?: return null

        if (decimal.scale().coerceAtLeast(0) > scale) {
            return null
        }

        return decimal
    }

    private fun isIsoDate(value: String): Boolean {
        if (!Regex("""\d{4}-\d{2}-\d{2}""").matches(value)) {
            return false
        }

        return try {
            java.time.LocalDate.parse(value)
            true
        } catch (_: Exception) {
            false
        }
    }
}