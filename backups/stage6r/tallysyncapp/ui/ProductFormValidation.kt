package com.example.tallysyncapp.ui

private val PRODUCT_SKU_REGEX =
    Regex("^[A-Za-z0-9._/-]+$")

data class ProductFormValidationResult(
    val skuError: String? = null,
    val nameError: String? = null,
    val unitError: String? = null,
    val barcodeError: String? = null,
    val descriptionError: String? = null,
    val hsnCodeError: String? = null,
    val purchasePriceError: String? = null,
    val sellingPriceError: String? = null,
    val taxRateError: String? = null,
    val openingStockError: String? = null,
    val minimumStockError: String? = null
) {
    val isValid: Boolean
        get() =
            skuError == null &&
                nameError == null &&
                unitError == null &&
                barcodeError == null &&
                descriptionError == null &&
                hsnCodeError == null &&
                purchasePriceError == null &&
                sellingPriceError == null &&
                taxRateError == null &&
                openingStockError == null &&
                minimumStockError == null
}

data class ProductFormNumbers(
    val purchasePrice: Double,
    val sellingPrice: Double,
    val taxRate: Double,
    val openingStock: Double,
    val minimumStock: Double
)

fun normalizeProductSku(value: String): String =
    value.trim().uppercase()

fun normalizeProductName(value: String): String =
    value.trim()

fun normalizeProductUnit(value: String): String =
    value.trim().uppercase()

fun normalizeOptionalProductText(value: String): String? =
    value.trim().takeIf { it.isNotEmpty() }

fun parseProductNumber(value: String): Double? =
    value
        .trim()
        .replace(',', '.')
        .toDoubleOrNull()

fun validateProductForm(
    sku: String,
    name: String,
    unit: String,
    barcode: String,
    description: String,
    hsnCode: String,
    purchasePrice: String,
    sellingPrice: String,
    taxRate: String,
    openingStock: String,
    minimumStock: String
): ProductFormValidationResult {
    val normalizedSku = normalizeProductSku(sku)
    val normalizedName = normalizeProductName(name)
    val normalizedUnit = normalizeProductUnit(unit)

    val normalizedBarcode = barcode.trim()
    val normalizedDescription = description.trim()
    val normalizedHsnCode = hsnCode.trim()

    val purchase = parseProductNumber(purchasePrice)
    val selling = parseProductNumber(sellingPrice)
    val tax = parseProductNumber(taxRate)
    val opening = parseProductNumber(openingStock)
    val minimum = parseProductNumber(minimumStock)

    return ProductFormValidationResult(
        skuError = when {
            normalizedSku.isEmpty() ->
                "SKU is required."

            normalizedSku.length > 50 ->
                "SKU must not exceed 50 characters."

            !PRODUCT_SKU_REGEX.matches(normalizedSku) ->
                "Use only letters, numbers, dots, underscores, slashes and hyphens."

            else -> null
        },

        nameError = when {
            normalizedName.length < 2 ->
                "Product name must contain at least 2 characters."

            normalizedName.length > 200 ->
                "Product name must not exceed 200 characters."

            else -> null
        },

        unitError = when {
            normalizedUnit.isEmpty() ->
                "Unit is required."

            normalizedUnit.length > 30 ->
                "Unit must not exceed 30 characters."

            else -> null
        },

        barcodeError =
            if (normalizedBarcode.length > 100) {
                "Barcode must not exceed 100 characters."
            } else {
                null
            },

        descriptionError =
            if (normalizedDescription.length > 2000) {
                "Description must not exceed 2000 characters."
            } else {
                null
            },

        hsnCodeError =
            if (normalizedHsnCode.length > 50) {
                "HSN code must not exceed 50 characters."
            } else {
                null
            },

        purchasePriceError = validateMoney(
            purchasePrice,
            purchase,
            "purchase price"
        ),

        sellingPriceError = validateMoney(
            sellingPrice,
            selling,
            "selling price"
        ),

        taxRateError = when {
            tax == null ->
                "Enter a valid tax rate."

            tax !in 0.0..100.0 ->
                "Tax rate must be between 0 and 100."

            !hasAtMostDecimalPlaces(taxRate, 2) ->
                "Tax rate supports up to 2 decimal places."

            else -> null
        },

        openingStockError = validateStock(
            openingStock,
            opening,
            "opening stock"
        ),

        minimumStockError = validateStock(
            minimumStock,
            minimum,
            "minimum stock"
        )
    )
}

fun productFormNumbersOrNull(
    purchasePrice: String,
    sellingPrice: String,
    taxRate: String,
    openingStock: String,
    minimumStock: String
): ProductFormNumbers? {
    val purchase = parseProductNumber(purchasePrice) ?: return null
    val selling = parseProductNumber(sellingPrice) ?: return null
    val tax = parseProductNumber(taxRate) ?: return null
    val opening = parseProductNumber(openingStock) ?: return null
    val minimum = parseProductNumber(minimumStock) ?: return null

    return ProductFormNumbers(
        purchasePrice = purchase,
        sellingPrice = selling,
        taxRate = tax,
        openingStock = opening,
        minimumStock = minimum
    )
}

private fun validateMoney(
    rawValue: String,
    value: Double?,
    fieldName: String
): String? =
    when {
        value == null ->
            "Enter a valid $fieldName."

        value < 0 ->
            "${fieldName.replaceFirstChar { it.uppercase() }} cannot be negative."

        !hasAtMostDecimalPlaces(rawValue, 2) ->
            "${fieldName.replaceFirstChar { it.uppercase() }} supports up to 2 decimal places."

        else -> null
    }

private fun validateStock(
    rawValue: String,
    value: Double?,
    fieldName: String
): String? =
    when {
        value == null ->
            "Enter a valid $fieldName."

        value < 0 ->
            "${fieldName.replaceFirstChar { it.uppercase() }} cannot be negative."

        !hasAtMostDecimalPlaces(rawValue, 3) ->
            "${fieldName.replaceFirstChar { it.uppercase() }} supports up to 3 decimal places."

        else -> null
    }

private fun hasAtMostDecimalPlaces(
    value: String,
    maximumPlaces: Int
): Boolean {
    val normalized = value.trim().replace(',', '.')

    if (normalized.isEmpty()) {
        return false
    }

    val separatorIndex = normalized.indexOf('.')

    if (separatorIndex == -1) {
        return true
    }

    if (normalized.indexOf('.', separatorIndex + 1) != -1) {
        return false
    }

    return normalized.length - separatorIndex - 1 <= maximumPlaces
}