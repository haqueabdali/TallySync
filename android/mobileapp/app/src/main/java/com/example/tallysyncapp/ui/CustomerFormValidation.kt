package com.example.tallysyncapp.ui

private val CUSTOMER_EMAIL_REGEX =
    Regex("^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$")

data class CustomerFormValidationResult(
    val nameError: String? = null,
    val emailError: String? = null,
    val phoneError: String? = null,
    val addressError: String? = null,
    val tallyLedgerNameError: String? = null,
    val creditLimitError: String? = null
) {
    val isValid: Boolean
        get() =
            nameError == null &&
                emailError == null &&
                phoneError == null &&
                addressError == null &&
                tallyLedgerNameError == null &&
                creditLimitError == null
}

fun normalizeCustomerName(value: String): String =
    value.trim()

fun normalizeOptionalCustomerText(value: String): String? =
    value.trim().takeIf { it.isNotEmpty() }

fun normalizeCustomerEmail(value: String): String? =
    value.trim().takeIf { it.isNotEmpty() }

fun parseCustomerCreditLimit(value: String): Double? =
    value
        .trim()
        .replace(',', '.')
        .toDoubleOrNull()

fun validateCustomerForm(
    name: String,
    email: String,
    phone: String,
    address: String,
    tallyLedgerName: String,
    creditLimit: String
): CustomerFormValidationResult {
    val normalizedName = name.trim()
    val normalizedEmail = email.trim()
    val normalizedPhone = phone.trim()
    val normalizedAddress = address.trim()
    val normalizedTallyLedgerName = tallyLedgerName.trim()
    val parsedCreditLimit = parseCustomerCreditLimit(creditLimit)

    return CustomerFormValidationResult(
        nameError = when {
            normalizedName.isEmpty() ->
                "Customer name is required."

            normalizedName.length > 255 ->
                "Customer name must not exceed 255 characters."

            else -> null
        },

        emailError = when {
            normalizedEmail.length > 255 ->
                "Email must not exceed 255 characters."

            normalizedEmail.isNotEmpty() &&
                !CUSTOMER_EMAIL_REGEX.matches(normalizedEmail) ->
                "Enter a valid email address."

            else -> null
        },

        phoneError =
            if (normalizedPhone.length > 32) {
                "Phone must not exceed 32 characters."
            } else {
                null
            },

        addressError =
            if (normalizedAddress.length > 2000) {
                "Address must not exceed 2000 characters."
            } else {
                null
            },

        tallyLedgerNameError =
            if (normalizedTallyLedgerName.length > 255) {
                "Tally ledger name must not exceed 255 characters."
            } else {
                null
            },

        creditLimitError = when {
            parsedCreditLimit == null ->
                "Enter a valid credit limit."

            parsedCreditLimit < 0 ->
                "Credit limit cannot be negative."

            !hasAtMostCustomerDecimalPlaces(creditLimit, 2) ->
                "Credit limit supports up to 2 decimal places."

            else -> null
        }
    )
}

private fun hasAtMostCustomerDecimalPlaces(
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