package com.example.tallysyncapp.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PurchaseOrderValidationTest {

    private fun validInput() =
        PurchaseOrderFormInput(
            supplierId = "supplier-1",
            warehouseId = "warehouse-1",
            poDate = "2026-09-02",
            expectedDeliveryDate = "2026-09-10",
            currency = "eur",
            shippingAmount = "10.25",
            notes = "Test purchase order",
            items = listOf(
                PurchaseOrderLineInput(
                    itemId = "item-1",
                    quantity = "2",
                    unitPrice = "25.50",
                    discountPercentage = "5",
                    taxRate = "22"
                )
            )
        )

    @Test
    fun validInputBuildsNormalizedRequest() {
        val result =
            PurchaseOrderValidation.validate(validInput())

        assertTrue(result.isValid)
        assertTrue(result.errors.isEmpty())

        val request = result.request
        assertNotNull(request)

        assertEquals("supplier-1", request!!.supplierId)
        assertEquals("warehouse-1", request.warehouseId)
        assertEquals("2026-09-02", request.poDate)
        assertEquals("2026-09-10", request.expectedDeliveryDate)
        assertEquals("EUR", request.currency)
        assertEquals(10.25, request.shippingAmount, 0.00001)
        assertEquals(1, request.items.size)
    }

    @Test
    fun supplierIsRequired() {
        val result =
            PurchaseOrderValidation.validate(
                validInput().copy(supplierId = "")
            )

        assertFalse(result.isValid)
        assertTrue(
            result.errors.any {
                it.contains("Supplier")
            }
        )
    }

    @Test
    fun warehouseIsRequired() {
        val result =
            PurchaseOrderValidation.validate(
                validInput().copy(warehouseId = "")
            )

        assertFalse(result.isValid)
        assertTrue(
            result.errors.any {
                it.contains("Warehouse")
            }
        )
    }

    @Test
    fun atLeastOneItemIsRequired() {
        val result =
            PurchaseOrderValidation.validate(
                validInput().copy(items = emptyList())
            )

        assertFalse(result.isValid)
        assertTrue(
            result.errors.any {
                it.contains("At least one")
            }
        )
    }

    @Test
    fun duplicateProductsAreRejected() {
        val line =
            PurchaseOrderLineInput(
                itemId = "same-product",
                quantity = "1",
                unitPrice = "10"
            )

        val result =
            PurchaseOrderValidation.validate(
                validInput().copy(
                    items = listOf(line, line)
                )
            )

        assertFalse(result.isValid)
        assertTrue(
            result.errors.any {
                it.contains("same product")
            }
        )
    }

    @Test
    fun zeroQuantityIsRejected() {
        val result =
            PurchaseOrderValidation.validate(
                validInput().copy(
                    items = listOf(
                        PurchaseOrderLineInput(
                            itemId = "item-1",
                            quantity = "0",
                            unitPrice = "10"
                        )
                    )
                )
            )

        assertFalse(result.isValid)
    }

    @Test
    fun zeroUnitPriceIsAllowed() {
        val result =
            PurchaseOrderValidation.validate(
                validInput().copy(
                    items = listOf(
                        PurchaseOrderLineInput(
                            itemId = "item-1",
                            quantity = "1",
                            unitPrice = "0"
                        )
                    )
                )
            )

        assertTrue(result.isValid)
    }

    @Test
    fun negativeUnitPriceIsRejected() {
        val result =
            PurchaseOrderValidation.validate(
                validInput().copy(
                    items = listOf(
                        PurchaseOrderLineInput(
                            itemId = "item-1",
                            quantity = "1",
                            unitPrice = "-1"
                        )
                    )
                )
            )

        assertFalse(result.isValid)
    }

    @Test
    fun percentagesMustRemainBetweenZeroAndOneHundred() {
        val result =
            PurchaseOrderValidation.validate(
                validInput().copy(
                    items = listOf(
                        PurchaseOrderLineInput(
                            itemId = "item-1",
                            quantity = "1",
                            unitPrice = "10",
                            discountPercentage = "101",
                            taxRate = "-1"
                        )
                    )
                )
            )

        assertFalse(result.isValid)
    }

    @Test
    fun commaDecimalInputIsAccepted() {
        val result =
            PurchaseOrderValidation.validate(
                validInput().copy(
                    shippingAmount = "10,25",
                    items = listOf(
                        PurchaseOrderLineInput(
                            itemId = "item-1",
                            quantity = "2,5",
                            unitPrice = "10,25",
                            discountPercentage = "0",
                            taxRate = "22"
                        )
                    )
                )
            )

        assertTrue(result.isValid)
        assertEquals(
            10.25,
            result.request!!.shippingAmount,
            0.00001
        )
        assertEquals(
            2.5,
            result.request.items.first().quantity,
            0.00001
        )
    }

    @Test
    fun moreThanFourLineDecimalPlacesAreRejected() {
        val result =
            PurchaseOrderValidation.validate(
                validInput().copy(
                    items = listOf(
                        PurchaseOrderLineInput(
                            itemId = "item-1",
                            quantity = "1.12345",
                            unitPrice = "10"
                        )
                    )
                )
            )

        assertFalse(result.isValid)
    }

    @Test
    fun expectedDeliveryCannotPrecedePoDate() {
        val result =
            PurchaseOrderValidation.validate(
                validInput().copy(
                    poDate = "2026-09-10",
                    expectedDeliveryDate = "2026-09-09"
                )
            )

        assertFalse(result.isValid)
    }

    @Test
    fun previewCalculatesDiscountThenTax() {
        val result =
            PurchaseOrderValidation.previewLineTotal(
                quantity = "2",
                unitPrice = "100",
                discountPercentage = "10",
                taxRate = "20"
            )

        assertEquals("216.00", result.toString())
    }
}