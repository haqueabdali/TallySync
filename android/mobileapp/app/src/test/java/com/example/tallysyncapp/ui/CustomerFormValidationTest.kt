package com.example.tallysyncapp.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CustomerFormValidationTest {

    @Test
    fun `valid customer passes validation`() {
        assertTrue(validForm().isValid)
    }

    @Test
    fun `blank customer name is rejected`() {
        val result = validForm(name = "   ")

        assertFalse(result.isValid)
        assertEquals(
            "Customer name is required.",
            result.nameError
        )
    }

    @Test
    fun `valid email is accepted`() {
        val result = validForm(
            email = "accounts@example.com"
        )

        assertTrue(result.isValid)
        assertNull(result.emailError)
    }

    @Test
    fun `invalid email is rejected`() {
        val result = validForm(
            email = "not-an-email"
        )

        assertFalse(result.isValid)
        assertEquals(
            "Enter a valid email address.",
            result.emailError
        )
    }

    @Test
    fun `blank optional email is accepted`() {
        val result = validForm(email = "")

        assertTrue(result.isValid)
        assertNull(result.emailError)
    }

    @Test
    fun `negative credit limit is rejected`() {
        val result = validForm(
            creditLimit = "-1"
        )

        assertFalse(result.isValid)
        assertEquals(
            "Credit limit cannot be negative.",
            result.creditLimitError
        )
    }

    @Test
    fun `credit limit rejects more than two decimals`() {
        val result = validForm(
            creditLimit = "100.999"
        )

        assertFalse(result.isValid)
        assertEquals(
            "Credit limit supports up to 2 decimal places.",
            result.creditLimitError
        )
    }

    @Test
    fun `comma credit limit is parsed`() {
        assertEquals(
            1500.25,
            parseCustomerCreditLimit("1500,25") ?: 0.0,
            0.000001
        )
    }

    @Test
    fun `optional values are trimmed`() {
        assertEquals(
            "+39 035 1234567",
            normalizeOptionalCustomerText(
                "  +39 035 1234567  "
            )
        )

        assertNull(
            normalizeOptionalCustomerText("   ")
        )
    }

    @Test
    fun `customer name is trimmed`() {
        assertEquals(
            "Stage 6H Customer",
            normalizeCustomerName(
                "  Stage 6H Customer  "
            )
        )
    }

    private fun validForm(
        name: String = "Stage 6H Customer",
        email: String = "customer@example.com",
        phone: String = "+39 035 1234567",
        address: String = "Bergamo, Italy",
        tallyLedgerName: String = "",
        creditLimit: String = "1500.25"
    ): CustomerFormValidationResult =
        validateCustomerForm(
            name = name,
            email = email,
            phone = phone,
            address = address,
            tallyLedgerName = tallyLedgerName,
            creditLimit = creditLimit
        )
}
