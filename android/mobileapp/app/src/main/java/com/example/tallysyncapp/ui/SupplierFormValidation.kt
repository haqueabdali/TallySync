package com.example.tallysyncapp.ui

private val SUPPLIER_FORM_EMAIL_REGEX = Regex(
    "^[A-Za-z0-9.!#\$%&'*+/=?^_`{|}~-]+" +
        "@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?" +
        "(?:\\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$"
)

data class SupplierFormValidation(
    val nameError: String? = null,
    val companyNameError: String? = null,
    val contactPersonError: String? = null,
    val emailError: String? = null,
    val phoneError: String? = null,
    val mobileError: String? = null,
    val taxNumberError: String? = null,
    val vatNumberError: String? = null,
    val billingAddressError: String? = null,
    val shippingAddressError: String? = null,
    val cityError: String? = null,
    val stateError: String? = null,
    val postalCodeError: String? = null,
    val countryError: String? = null,
    val creditLimitError: String? = null,
    val openingBalanceError: String? = null,
    val currencyError: String? = null,
    val paymentTermsError: String? = null,
    val notesError: String? = null
) {
    val isValid: Boolean
        get() =
            nameError == null &&
                companyNameError == null &&
                contactPersonError == null &&
                emailError == null &&
                phoneError == null &&
                mobileError == null &&
                taxNumberError == null &&
                vatNumberError == null &&
                billingAddressError == null &&
                shippingAddressError == null &&
                cityError == null &&
                stateError == null &&
                postalCodeError == null &&
                countryError == null &&
                creditLimitError == null &&
                openingBalanceError == null &&
                currencyError == null &&
                paymentTermsError == null &&
                notesError == null
}

fun validateSupplierForm(
    name: String,
    companyName: String,
    contactPerson: String,
    email: String,
    phone: String,
    mobile: String,
    taxNumber: String,
    vatNumber: String,
    billingAddress: String,
    shippingAddress: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    creditLimit: String,
    openingBalance: String,
    currency: String,
    paymentTerms: String,
    notes: String
): SupplierFormValidation {
    val parsedCredit =
        parseSupplierNumber(creditLimit)

    val parsedOpeningBalance =
        parseSupplierNumber(openingBalance)

    val parsedPaymentTerms =
        paymentTerms.trim().toIntOrNull()

    val normalizedEmail =
        email.trim()

    val normalizedCurrency =
        currency.trim().uppercase()

    return SupplierFormValidation(
        nameError = when {
            name.trim().isEmpty() ->
                "Supplier name is required."

            name.trim().length > 150 ->
                "Supplier name must not exceed 150 characters."

            else -> null
        },

        companyNameError =
            maxLengthError(
                companyName,
                180,
                "Company name"
            ),

        contactPersonError =
            maxLengthError(
                contactPerson,
                150,
                "Contact person"
            ),

        emailError = when {
            normalizedEmail.length > 180 ->
                "Email must not exceed 180 characters."

            normalizedEmail.isNotEmpty() &&
                !SUPPLIER_FORM_EMAIL_REGEX.matches(
                    normalizedEmail
                ) ->
                "Enter a valid email address."

            else -> null
        },

        phoneError =
            maxLengthError(
                phone,
                40,
                "Phone"
            ),

        mobileError =
            maxLengthError(
                mobile,
                40,
                "Mobile"
            ),

        taxNumberError =
            maxLengthError(
                taxNumber,
                80,
                "Tax number"
            ),

        vatNumberError =
            maxLengthError(
                vatNumber,
                80,
                "VAT number"
            ),

        billingAddressError =
            maxLengthError(
                billingAddress,
                1000,
                "Billing address"
            ),

        shippingAddressError =
            maxLengthError(
                shippingAddress,
                1000,
                "Shipping address"
            ),

        cityError =
            maxLengthError(
                city,
                100,
                "City"
            ),

        stateError =
            maxLengthError(
                state,
                100,
                "State"
            ),

        postalCodeError =
            maxLengthError(
                postalCode,
                30,
                "Postal code"
            ),

        countryError =
            maxLengthError(
                country,
                100,
                "Country"
            ),

        creditLimitError = when {
            parsedCredit == null ->
                "Enter a valid credit limit."

            parsedCredit < 0 ->
                "Credit limit cannot be negative."

            !hasAtMostSupplierDecimalPlaces(
                creditLimit,
                2
            ) ->
                "Credit limit supports up to 2 decimal places."

            else -> null
        },

        openingBalanceError = when {
            parsedOpeningBalance == null ->
                "Enter a valid opening balance."

            !hasAtMostSupplierDecimalPlaces(
                openingBalance,
                2
            ) ->
                "Opening balance supports up to 2 decimal places."

            else -> null
        },

        currencyError = when {
            normalizedCurrency.length != 3 ->
                "Currency must contain exactly 3 characters."

            !normalizedCurrency.all(Char::isLetter) ->
                "Currency must contain letters only."

            else -> null
        },

        paymentTermsError = when {
            parsedPaymentTerms == null ->
                "Enter valid payment terms."

            parsedPaymentTerms < 0 ->
                "Payment terms cannot be negative."

            else -> null
        },

        notesError =
            maxLengthError(
                notes,
                2000,
                "Notes"
            )
    )
}

private fun maxLengthError(
    value: String,
    maximumLength: Int,
    label: String
): String? =
    if (value.trim().length > maximumLength) {
        "$label must not exceed $maximumLength characters."
    } else {
        null
    }

fun parseSupplierNumber(
    value: String
): Double? =
    value
        .trim()
        .replace(',', '.')
        .toDoubleOrNull()

private fun hasAtMostSupplierDecimalPlaces(
    value: String,
    maximumPlaces: Int
): Boolean {
    val normalized =
        value
            .trim()
            .replace(',', '.')

    if (normalized.isEmpty()) {
        return false
    }

    val separatorIndex =
        normalized.indexOf('.')

    if (separatorIndex == -1) {
        return true
    }

    if (
        normalized.indexOf(
            '.',
            separatorIndex + 1
        ) != -1
    ) {
        return false
    }

    return normalized.length -
        separatorIndex -
        1 <= maximumPlaces
}

fun optionalSupplierText(
    value: String
): String? =
    value
        .trim()
        .takeIf { it.isNotEmpty() }