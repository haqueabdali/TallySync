package com.example.tallysyncapp.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.tallysyncapp.data.network.CustomerListItem
import com.example.tallysyncapp.data.network.CustomerPaymentAllocationRequest
import com.example.tallysyncapp.data.network.SalesInvoiceRecord
import com.example.tallysyncapp.data.network.SaveCustomerPaymentRequest
import java.math.BigDecimal
import java.time.LocalDate
import java.util.Locale

private fun customerPaymentMoney(amount: Double, currency: String): String =
    "$currency ${String.format(Locale.US, "%.2f", amount)}"

private fun customerPaymentDecimal(value: String): BigDecimal? =
    value.trim().replace(',', '.').toBigDecimalOrNull()?.takeIf {
        it.scale().coerceAtLeast(0) <= 2
    }

@Composable
fun CustomerPaymentsScreen(
    state: AppUiState,
    onSearchChange: (String) -> Unit,
    onSearch: () -> Unit,
    onOpen: (String) -> Unit,
    onAdd: () -> Unit,
    onBack: () -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            TextButton(onClick = onBack) { Text("Back") }
            Text("Customer payments", fontWeight = FontWeight.Bold)
            OutlinedTextField(
                value = state.customerPaymentSearch,
                onValueChange = onSearchChange,
                label = { Text("Search payments") },
                modifier = Modifier.fillMaxWidth()
            )
            Button(onClick = onSearch, modifier = Modifier.fillMaxWidth()) { Text("Search") }
            Button(onClick = onAdd, modifier = Modifier.fillMaxWidth()) { Text("New customer payment") }
        }

        if (state.customerPayments.isEmpty() && !state.loading) {
            item { Text("No customer payments found.") }
        }

        items(state.customerPayments, key = { it.id }) { payment ->
            Card(modifier = Modifier.fillMaxWidth(), onClick = { onOpen(payment.id) }) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(payment.paymentNumber, fontWeight = FontWeight.Bold)
                    Text(payment.paymentDate)
                    Text(payment.paymentMethod)
                    Text("Status: ${payment.status}")
                    Text("Amount: ${customerPaymentMoney(payment.amount, payment.currency)}")
                    Text("Unallocated: ${customerPaymentMoney(payment.unallocatedAmount, payment.currency)}")
                }
            }
        }
    }
}

@Composable
fun CustomerPaymentDetailsScreen(
    state: AppUiState,
    paymentId: String,
    onBack: () -> Unit,
    onPost: () -> Unit,
    onCancel: () -> Unit,
    onDelete: () -> Unit,
    onReverse: (String) -> Unit
) {
    val payment = state.customerPaymentRecord?.takeIf { it.id == paymentId }
    var showReverse by remember { mutableStateOf(false) }
    var reason by rememberSaveable { mutableStateOf("") }

    if (payment == null) {
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            Text("Loading customer payment...")
            TextButton(onClick = onBack) { Text("Back") }
        }
        return
    }

    val status = payment.status.lowercase()
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            TextButton(onClick = onBack) { Text("Back") }
            Text(payment.paymentNumber, fontWeight = FontWeight.Bold)
            Text("Status: ${payment.status}")
            Text("Date: ${payment.paymentDate}")
            Text("Method: ${payment.paymentMethod}")
            Text("Amount: ${customerPaymentMoney(payment.amount, payment.currency)}")
            Text("Allocated: ${customerPaymentMoney(payment.allocatedAmount, payment.currency)}")
            Text("Unallocated: ${customerPaymentMoney(payment.unallocatedAmount, payment.currency)}")
            payment.referenceNumber?.let { Text("Reference: $it") }
            payment.reversalReason?.let { Text("Reversal reason: $it") }
        }

        item { Text("Allocations", fontWeight = FontWeight.Bold) }
        items(payment.allocations, key = { it.id }) { allocation ->
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text("Invoice: ${allocation.salesInvoiceId}")
                    Text("Allocated: ${customerPaymentMoney(allocation.allocatedAmount, payment.currency)}")
                    Text("Balance before: ${customerPaymentMoney(allocation.invoiceBalanceBefore, payment.currency)}")
                    Text("Balance after: ${customerPaymentMoney(allocation.invoiceBalanceAfter, payment.currency)}")
                }
            }
        }

        item {
            if (status == "draft") {
                Button(
                    onClick = onPost,
                    enabled = !state.isChangingCustomerPaymentStatus,
                    modifier = Modifier.fillMaxWidth()
                ) { Text("Post customer payment") }
                OutlinedButton(
                    onClick = onCancel,
                    enabled = !state.isChangingCustomerPaymentStatus,
                    modifier = Modifier.fillMaxWidth()
                ) { Text("Cancel payment") }
                OutlinedButton(
                    onClick = onDelete,
                    enabled = !state.isChangingCustomerPaymentStatus,
                    modifier = Modifier.fillMaxWidth()
                ) { Text("Delete draft") }
            }
            if (status == "posted") {
                OutlinedButton(
                    onClick = { showReverse = true },
                    enabled = !state.isChangingCustomerPaymentStatus,
                    modifier = Modifier.fillMaxWidth()
                ) { Text("Reverse payment") }
            }
        }
    }

    if (showReverse) {
        AlertDialog(
            onDismissRequest = { showReverse = false },
            title = { Text("Reverse customer payment?") },
            text = {
                OutlinedTextField(
                    value = reason,
                    onValueChange = { reason = it },
                    label = { Text("Reason (minimum 3 characters)") },
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                TextButton(
                    enabled = reason.trim().length >= 3,
                    onClick = {
                        showReverse = false
                        onReverse(reason.trim())
                    }
                ) { Text("Reverse") }
            },
            dismissButton = { TextButton(onClick = { showReverse = false }) { Text("Back") } }
        )
    }
}

@Composable
fun CustomerPaymentFormScreen(
    customers: List<CustomerListItem>,
    invoices: List<SalesInvoiceRecord>,
    preselectedInvoiceId: String? = null,
    isSaving: Boolean,
    onSave: (SaveCustomerPaymentRequest) -> Unit,
    onBack: () -> Unit
) {
    var invoiceId by rememberSaveable { mutableStateOf(preselectedInvoiceId.orEmpty()) }
    var invoiceMenu by remember { mutableStateOf(false) }
    var customerId by rememberSaveable { mutableStateOf("") }
    var paymentDate by rememberSaveable { mutableStateOf(LocalDate.now().toString()) }
    var paymentMethod by rememberSaveable { mutableStateOf("bank_transfer") }
    var amount by rememberSaveable { mutableStateOf("") }
    var reference by rememberSaveable { mutableStateOf("") }
    var notes by rememberSaveable { mutableStateOf("") }
    var validationError by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(preselectedInvoiceId, invoices) {
        invoices.firstOrNull { it.id == preselectedInvoiceId }?.let { invoice ->
            invoiceId = invoice.id
            customerId = invoice.customerId
            amount = String.format(Locale.US, "%.2f", invoice.balanceDue)
        }
    }

    val outstandingInvoices = invoices.filter {
        it.balanceDue > 0.0 &&
            it.status.lowercase() != "draft" &&
            it.status.lowercase() != "cancelled" &&
            it.status.lowercase() != "paid"
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            TextButton(onClick = onBack) { Text("Back") }
            Text("New customer payment", fontWeight = FontWeight.Bold)

            OutlinedButton(onClick = { invoiceMenu = true }, modifier = Modifier.fillMaxWidth()) {
                val selected = invoices.firstOrNull { it.id == invoiceId }
                Text(selected?.let { "${it.invoiceNumber} - ${customerPaymentMoney(it.balanceDue, it.currency)} due" }
                    ?: "Select outstanding invoice")
            }
            DropdownMenu(expanded = invoiceMenu, onDismissRequest = { invoiceMenu = false }) {
                outstandingInvoices.forEach { invoice ->
                    DropdownMenuItem(
                        text = { Text("${invoice.invoiceNumber} - ${customerPaymentMoney(invoice.balanceDue, invoice.currency)}") },
                        onClick = {
                            invoiceId = invoice.id
                            customerId = invoice.customerId
                            amount = String.format(Locale.US, "%.2f", invoice.balanceDue)
                            invoiceMenu = false
                        }
                    )
                }
            }

            customers.firstOrNull { it.id == customerId }?.let { Text("Customer: ${it.name}") }
            OutlinedTextField(
                value = paymentDate,
                onValueChange = { paymentDate = it },
                label = { Text("Payment date YYYY-MM-DD") },
                modifier = Modifier.fillMaxWidth()
            )
            Text("Payment method", fontWeight = FontWeight.Bold)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("bank_transfer", "cash", "card").forEach { method ->
                    FilterChip(
                        selected = paymentMethod == method,
                        onClick = { paymentMethod = method },
                        label = { Text(method) }
                    )
                }
            }
            OutlinedTextField(
                value = amount,
                onValueChange = { amount = it },
                label = { Text("Payment amount") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = reference,
                onValueChange = { reference = it },
                label = { Text("Reference number") },
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = notes,
                onValueChange = { notes = it },
                label = { Text("Notes") },
                modifier = Modifier.fillMaxWidth()
            )
            validationError?.let { Text(it) }
            Button(
                onClick = {
                    val invoice = invoices.firstOrNull { it.id == invoiceId }
                    val paymentAmount = customerPaymentDecimal(amount)
                    validationError = when {
                        invoice == null -> "Select an outstanding invoice."
                        customerId.isBlank() -> "Customer is required."
                        paymentAmount == null || paymentAmount <= BigDecimal.ZERO -> "Enter a valid payment amount."
                        paymentAmount > BigDecimal.valueOf(invoice.balanceDue) -> "Payment cannot exceed invoice balance."
                        else -> null
                    }
                    if (validationError == null) {
                        onSave(
                            SaveCustomerPaymentRequest(
                                customerId = customerId,
                                paymentDate = paymentDate,
                                paymentMethod = paymentMethod,
                                currency = invoice!!.currency,
                                amount = paymentAmount!!.toDouble(),
                                referenceNumber = reference.trim().takeIf { it.isNotEmpty() },
                                notes = notes.trim().takeIf { it.isNotEmpty() },
                                allocations = listOf(
                                    CustomerPaymentAllocationRequest(
                                        salesInvoiceId = invoice.id,
                                        allocatedAmount = paymentAmount.toDouble()
                                    )
                                )
                            )
                        )
                    }
                },
                enabled = !isSaving,
                modifier = Modifier.fillMaxWidth()
            ) { Text(if (isSaving) "Saving..." else "Create customer payment") }
        }
    }
}
