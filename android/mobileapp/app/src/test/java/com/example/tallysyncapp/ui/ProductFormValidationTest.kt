package com.example.tallysyncapp.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ProductFormValidationTest {

    @Test
    fun `valid product passes validation`() {
        val result = validForm()

        assertTrue(result.isValid)
    }

    @Test
    fun `invalid sku is rejected`() {
        val result = validForm(
            sku = "BAD SKU!"
        )

        assertFalse(result.isValid)
        assertEquals(
            "Use only letters, numbers, dots, underscores, slashes and hyphens.",
            result.skuError
        )
    }

    @Test
    fun `short product name is rejected`() {
        val result = validForm(
            name = "A"
        )

        assertFalse(result.isValid)
        assertEquals(
            "Product name must contain at least 2 characters.",
            result.nameError
        )
    }

    @Test
    fun `money rejects more than two decimals`() {
        val result = validForm(
            sellingPrice = "25.999"
        )

        assertFalse(result.isValid)
        assertEquals(
            "Selling price supports up to 2 decimal places.",
            result.sellingPriceError
        )
    }

    @Test
    fun `stock allows three decimal places`() {
        val result = validForm(
            openingStock = "10.123"
        )

        assertTrue(result.isValid)
        assertNull(result.openingStockError)
    }

    @Test
    fun `stock rejects more than three decimal places`() {
        val result = validForm(
            openingStock = "10.1234"
        )

        assertFalse(result.isValid)
        assertEquals(
            "Opening stock supports up to 3 decimal places.",
            result.openingStockError
        )
    }

    @Test
    fun `tax outside zero to one hundred is rejected`() {
        val result = validForm(
            taxRate = "101"
        )

        assertFalse(result.isValid)
        assertEquals(
            "Tax rate must be between 0 and 100.",
            result.taxRateError
        )
    }

    @Test
    fun `comma decimal separator is accepted`() {
        assertEquals(
            25.99,
            parseProductNumber("25,99") ?: 0.0,
            0.000001
        )
    }

    @Test
    fun `normalization trims and uppercases sku and unit`() {
        assertEquals(
            "STAGE6G-001",
            normalizeProductSku("  stage6g-001  ")
        )

        assertEquals(
            "PCS",
            normalizeProductUnit(" pcs ")
        )

        assertEquals(
            "Stage 6G Product",
            normalizeProductName("  Stage 6G Product  ")
        )
    }

    @Test
    fun `numbers preserve purchase and minimum stock values`() {
        val numbers = productFormNumbersOrNull(
            purchasePrice = "20.00",
            sellingPrice = "25.99",
            taxRate = "0",
            openingStock = "10.123",
            minimumStock = "2"
        )

        requireNotNull(numbers)

        assertEquals(
            20.0,
            numbers.purchasePrice,
            0.000001
        )

        assertEquals(
            25.99,
            numbers.sellingPrice,
            0.000001
        )

        assertEquals(
            10.123,
            numbers.openingStock,
            0.000001
        )

        assertEquals(
            2.0,
            numbers.minimumStock,
            0.000001
        )
    }

    private fun validForm(
        sku: String = "STAGE6G-001",
        name: String = "Stage 6G Product",
        unit: String = "PCS",
        barcode: String = "",
        description: String = "",
        hsnCode: String = "",
        purchasePrice: String = "20.00",
        sellingPrice: String = "25.99",
        taxRate: String = "22",
        openingStock: String = "10.123",
        minimumStock: String = "2"
    ): ProductFormValidationResult =
        validateProductForm(
            sku = sku,
            name = name,
            unit = unit,
            barcode = barcode,
            description = description,
            hsnCode = hsnCode,
            purchasePrice = purchasePrice,
            sellingPrice = sellingPrice,
            taxRate = taxRate,
            openingStock = openingStock,
            minimumStock = minimumStock
        )
}
