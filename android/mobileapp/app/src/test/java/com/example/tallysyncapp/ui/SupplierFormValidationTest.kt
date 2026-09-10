package com.example.tallysyncapp.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SupplierFormValidationTest {

    @Test
    fun validSupplierPassesValidation() {
        val result = validate(
            name = "Stage6I Supplier",
            email = "supplier@example.com",
            creditLimit = "1500.25",
            openingBalance = "-250.50",
            currency = "EUR",
            paymentTerms = "30"
        )

        assertTrue(result.isValid)
    }

    @Test
    fun blankNameIsRejected() {
        val result = validate(
            name = "   "
        )

        assertEquals(
            "Supplier name is required.",
            result.nameError
        )

        assertFalse(result.isValid)
    }

    @Test
    fun supplierNameOver150CharactersIsRejected() {
        val result = validate(
            name = "A".repeat(151)
        )

        assertEquals(
            "Supplier name must not exceed 150 characters.",
            result.nameError
        )
    }

    @Test
    fun blankEmailIsAllowed() {
        val result = validate(
            email = ""
        )

        assertNull(result.emailError)
    }

    @Test
    fun validEmailIsAccepted() {
        val result = validate(
            email = "accounts@example.com"
        )

        assertNull(result.emailError)
    }

    @Test
    fun invalidEmailIsRejected() {
        val result = validate(
            email = "not-an-email"
        )

        assertEquals(
            "Enter a valid email address.",
            result.emailError
        )
    }

    @Test
    fun negativeCreditLimitIsRejected() {
        val result = validate(
            creditLimit = "-1"
        )

        assertEquals(
            "Credit limit cannot be negative.",
            result.creditLimitError
        )
    }

    @Test
    fun creditLimitWithMoreThanTwoDecimalsIsRejected() {
        val result = validate(
            creditLimit = "100.999"
        )

        assertEquals(
            "Credit limit supports up to 2 decimal places.",
            result.creditLimitError
        )
    }

    @Test
    fun commaDecimalCreditLimitIsAccepted() {
        val result = validate(
            creditLimit = "1500,25"
        )

        assertNull(result.creditLimitError)

        assertEquals(
            1500.25,
            parseSupplierNumber("1500,25")!!,
            0.000001
        )
    }

    @Test
    fun negativeOpeningBalanceIsAllowed() {
        val result = validate(
            openingBalance = "-500.25"
        )

        assertNull(result.openingBalanceError)
    }

    @Test
    fun openingBalanceWithMoreThanTwoDecimalsIsRejected() {
        val result = validate(
            openingBalance = "-500.123"
        )

        assertEquals(
            "Opening balance supports up to 2 decimal places.",
            result.openingBalanceError
        )
    }

    @Test
    fun lowercaseThreeLetterCurrencyIsAccepted() {
        val result = validate(
            currency = "eur"
        )

        assertNull(result.currencyError)
    }

    @Test
    fun invalidCurrencyLengthIsRejected() {
        val result = validate(
            currency = "EU"
        )

        assertEquals(
            "Currency must contain exactly 3 characters.",
            result.currencyError
        )
    }

    @Test
    fun numericCurrencyIsRejected() {
        val result = validate(
            currency = "E1R"
        )

        assertEquals(
            "Currency must contain letters only.",
            result.currencyError
        )
    }

    @Test
    fun negativePaymentTermsAreRejected() {
        val result = validate(
            paymentTerms = "-1"
        )

        assertEquals(
            "Payment terms cannot be negative.",
            result.paymentTermsError
        )
    }

    @Test
    fun nonIntegerPaymentTermsAreRejected() {
        val result = validate(
            paymentTerms = "30.5"
        )

        assertEquals(
            "Enter valid payment terms.",
            result.paymentTermsError
        )
    }

    @Test
    fun optionalSupplierTextTrimsAndConvertsBlankToNull() {
        assertNull(
            optionalSupplierText("   ")
        )

        assertEquals(
            "Bergamo",
            optionalSupplierText("  Bergamo  ")
        )
    }

    @Test
    fun textLengthLimitsAreEnforced() {
        val result = validateSupplierForm(
            name = "Supplier",
            companyName = "A".repeat(181),
            contactPerson = "B".repeat(151),
            email = "",
            phone = "1".repeat(41),
            mobile = "2".repeat(41),
            taxNumber = "T".repeat(81),
            vatNumber = "V".repeat(81),
            billingAddress = "A".repeat(1001),
            shippingAddress = "B".repeat(1001),
            city = "C".repeat(101),
            state = "S".repeat(101),
            postalCode = "P".repeat(31),
            country = "I".repeat(101),
            creditLimit = "0",
            openingBalance = "0",
            currency = "EUR",
            paymentTerms = "0",
            notes = "N".repeat(2001)
        )

        assertFalse(result.isValid)

        assertEquals(
            "Company name must not exceed 180 characters.",
            result.companyNameError
        )

        assertEquals(
            "Contact person must not exceed 150 characters.",
            result.contactPersonError
        )

        assertEquals(
            "Phone must not exceed 40 characters.",
            result.phoneError
        )

        assertEquals(
            "Notes must not exceed 2000 characters.",
            result.notesError
        )
    }

    private fun validate(
        name: String = "Supplier",
        email: String = "",
        creditLimit: String = "0",
        openingBalance: String = "0",
        currency: String = "EUR",
        paymentTerms: String = "0"
    ): SupplierFormValidation =
        validateSupplierForm(
            name = name,
            companyName = "",
            contactPerson = "",
            email = email,
            phone = "",
            mobile = "",
            taxNumber = "",
            vatNumber = "",
            billingAddress = "",
            shippingAddress = "",
            city = "",
            state = "",
            postalCode = "",
            country = "",
            creditLimit = creditLimit,
            openingBalance = openingBalance,
            currency = currency,
            paymentTerms = paymentTerms,
            notes = ""
        )
}