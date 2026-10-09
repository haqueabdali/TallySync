package com.example.tallysyncapp.ui

import com.example.tallysyncapp.data.network.PurchaseOrderItemRecord
import com.example.tallysyncapp.data.network.PurchaseOrderRecord
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class GoodsReceiptValidationTest {

    private fun po(
        status: String = "sent",
        quantity: Double = 5.0,
        received: Double = 0.0
    ) = PurchaseOrderRecord(
        id = "po-1",
        poNumber = "PO-1",
        supplierId = "supplier-1",
        warehouseId = "warehouse-1",
        poDate = "2026-09-12",
        status = status,
        items = listOf(
            PurchaseOrderItemRecord(
                id = "line-1",
                itemId = "item-1",
                quantity = quantity,
                receivedQuantity = received,
                unitPrice = 12.5
            )
        )
    )

    private fun input(
        received: String,
        accepted: String,
        rejected: String
    ) = GoodsReceiptFormInput(
        grnDate = "2026-09-12",
        remarks = "",
        lines = listOf(
            GoodsReceiptLineInput(
                purchaseOrderItemId = "line-1",
                itemId = "item-1",
                receivedQty = received,
                acceptedQty = accepted,
                rejectedQty = rejected,
                unitCost = "12.5"
            )
        )
    )

    @Test
    fun validPartialReceipt() {
        val result =
            GoodsReceiptValidation.validate(
                po(),
                input("3", "2", "1")
            )

        assertTrue(result.isValid)

        val line = result.request!!.items.single()

        assertEquals(3.0, line.receivedQty, 0.0001)
        assertEquals(2.0, line.acceptedQty, 0.0001)
        assertEquals(1.0, line.rejectedQty, 0.0001)
    }

    @Test
    fun acceptedAndRejectedMustEqualReceived() {
        val result =
            GoodsReceiptValidation.validate(
                po(),
                input("3", "2", "0")
            )

        assertFalse(result.isValid)
    }

    @Test
    fun overReceiptIsRejected() {
        val result =
            GoodsReceiptValidation.validate(
                po(
                    quantity = 5.0,
                    received = 3.0
                ),
                input("3", "3", "0")
            )

        assertFalse(result.isValid)

        assertTrue(
            result.errors.any {
                it.contains(
                    "exceeds remaining PO quantity"
                )
            }
        )
    }

    @Test
    fun draftPurchaseOrderIsRejected() {
        val result =
            GoodsReceiptValidation.validate(
                po(status = "draft"),
                input("1", "1", "0")
            )

        assertFalse(result.isValid)
    }

    @Test
    fun fourDecimalQuantitiesAreSupported() {
        val result =
            GoodsReceiptValidation.validate(
                po(quantity = 10.0),
                input(
                    "1.2345",
                    "1.1111",
                    "0.1234"
                )
            )

        assertTrue(result.isValid)
    }
}
