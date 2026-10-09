package com.example.tallysyncapp.ui

import com.example.tallysyncapp.data.network.CreateGoodsReceiptRequest
import com.example.tallysyncapp.data.network.GoodsReceiptItemRequest
import com.example.tallysyncapp.data.network.PurchaseOrderRecord
import java.math.BigDecimal
import java.time.LocalDate

data class GoodsReceiptLineInput(
    val purchaseOrderItemId: String,
    val itemId: String,
    val receivedQty: String = "",
    val acceptedQty: String = "",
    val rejectedQty: String = "",
    val unitCost: String = "",
    val remarks: String = ""
)

data class GoodsReceiptFormInput(
    val grnDate: String,
    val remarks: String,
    val lines: List<GoodsReceiptLineInput>
)

data class GoodsReceiptValidationResult(
    val request: CreateGoodsReceiptRequest?,
    val errors: List<String>
) {
    val isValid: Boolean
        get() = request != null && errors.isEmpty()
}

object GoodsReceiptValidation {

    fun validate(
        purchaseOrder: PurchaseOrderRecord,
        input: GoodsReceiptFormInput
    ): GoodsReceiptValidationResult {
        val errors = mutableListOf<String>()

        val status = purchaseOrder.status.lowercase()

        if (
            status != "sent" &&
            status != "partially_received"
        ) {
            errors +=
                "Only sent or partially received purchase orders can receive goods."
        }

        if (!isIsoDate(input.grnDate)) {
            errors += "GRN date must use YYYY-MM-DD."
        }

        if (input.remarks.length > 2000) {
            errors += "Remarks cannot exceed 2000 characters."
        }

        val poItemsById =
            purchaseOrder.items.associateBy { it.id }

        val requestLines =
            mutableListOf<GoodsReceiptItemRequest>()

        input.lines.forEachIndexed { index, line ->
            val row = index + 1

            val poItem =
                poItemsById[line.purchaseOrderItemId]

            if (poItem == null) {
                errors +=
                    "Line $row: purchase order item is invalid."
                return@forEachIndexed
            }

            if (line.itemId != poItem.itemId) {
                errors +=
                    "Line $row: product does not match the purchase order."
                return@forEachIndexed
            }

            val received =
                parseDecimal(
                    line.receivedQty,
                    4
                )

            val accepted =
                parseDecimal(
                    line.acceptedQty,
                    4
                )

            val rejected =
                parseDecimal(
                    line.rejectedQty.ifBlank { "0" },
                    4
                )

            val unitCost =
                parseDecimal(
                    line.unitCost.ifBlank { "0" },
                    6
                )

            val anyEntered =
                line.receivedQty.isNotBlank() ||
                    line.acceptedQty.isNotBlank() ||
                    line.rejectedQty
                        .replace(',', '.')
                        .toBigDecimalOrNull()
                        ?.compareTo(BigDecimal.ZERO) != 0

            if (!anyEntered) {
                return@forEachIndexed
            }

            if (received == null) {
                errors +=
                    "Line $row: received quantity must have maximum 4 decimal places."
                return@forEachIndexed
            }

            if (accepted == null) {
                errors +=
                    "Line $row: accepted quantity must have maximum 4 decimal places."
                return@forEachIndexed
            }

            if (rejected == null) {
                errors +=
                    "Line $row: rejected quantity must have maximum 4 decimal places."
                return@forEachIndexed
            }

            if (unitCost == null) {
                errors +=
                    "Line $row: unit cost must have maximum 6 decimal places."
                return@forEachIndexed
            }

            if (received <= BigDecimal.ZERO) {
                errors +=
                    "Line $row: received quantity must be greater than zero."
            }

            if (accepted < BigDecimal.ZERO) {
                errors +=
                    "Line $row: accepted quantity cannot be negative."
            }

            if (rejected < BigDecimal.ZERO) {
                errors +=
                    "Line $row: rejected quantity cannot be negative."
            }

            if (unitCost < BigDecimal.ZERO) {
                errors +=
                    "Line $row: unit cost cannot be negative."
            }

            if (
                accepted.add(rejected)
                    .compareTo(received) != 0
            ) {
                errors +=
                    "Line $row: accepted quantity plus rejected quantity must equal received quantity."
            }

            val ordered =
                BigDecimal.valueOf(
                    poItem.quantity
                )

            val alreadyReceived =
                BigDecimal.valueOf(
                    poItem.receivedQuantity
                )

            val remaining =
                ordered.subtract(
                    alreadyReceived
                )

            if (received > remaining) {
                errors +=
                    "Line $row: received quantity exceeds remaining PO quantity."
            }

            if (line.remarks.length > 1000) {
                errors +=
                    "Line $row: remarks cannot exceed 1000 characters."
            }

            if (
                errors.none {
                    it.startsWith(
                        "Line $row:"
                    )
                }
            ) {
                requestLines +=
                    GoodsReceiptItemRequest(
                        purchaseOrderItemId =
                            line.purchaseOrderItemId,
                        itemId =
                            line.itemId,
                        receivedQty =
                            received.toDouble(),
                        acceptedQty =
                            accepted.toDouble(),
                        rejectedQty =
                            rejected.toDouble(),
                        unitCost =
                            unitCost.toDouble(),
                        remarks =
                            line.remarks
                                .trim()
                                .takeIf {
                                    it.isNotEmpty()
                                }
                    )
            }
        }

        if (requestLines.isEmpty()) {
            errors +=
                "Enter a received quantity for at least one purchase order line."
        }

        if (errors.isNotEmpty()) {
            return GoodsReceiptValidationResult(
                request = null,
                errors = errors.distinct()
            )
        }

        return GoodsReceiptValidationResult(
            request =
                CreateGoodsReceiptRequest(
                    purchaseOrderId =
                        purchaseOrder.id,
                    warehouseId =
                        purchaseOrder.warehouseId,
                    grnDate =
                        input.grnDate,
                    remarks =
                        input.remarks
                            .trim()
                            .takeIf {
                                it.isNotEmpty()
                            },
                    items =
                        requestLines
                ),
            errors = emptyList()
        )
    }

    private fun parseDecimal(
        value: String,
        maxScale: Int
    ): BigDecimal? {
        val normalized =
            value.trim()
                .replace(',', '.')

        if (normalized.isBlank()) {
            return null
        }

        val decimal =
            normalized.toBigDecimalOrNull()
                ?: return null

        if (
            decimal.scale()
                .coerceAtLeast(0) > maxScale
        ) {
            return null
        }

        return decimal
    }

    private fun isIsoDate(
        value: String
    ): Boolean {
        if (
            !Regex(
                """\d{4}-\d{2}-\d{2}"""
            ).matches(value)
        ) {
            return false
        }

        return try {
            LocalDate.parse(value)
            true
        } catch (_: Exception) {
            false
        }
    }
}
