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
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.tallysyncapp.data.network.CustomerListItem
import com.example.tallysyncapp.data.network.ProductListItem
import com.example.tallysyncapp.data.network.SalesInvoiceItemRequest
import com.example.tallysyncapp.data.network.SalesInvoiceRecord
import com.example.tallysyncapp.data.network.SaveSalesInvoiceRequest
import java.math.BigDecimal
import java.time.LocalDate
import java.util.Locale

private fun salesMoney(amount: Double, currency: String): String =
    "$currency ${String.format(Locale.US, "%.2f", amount)}"

private fun salesDecimal(value: String, maxScale: Int): BigDecimal? {
    val normalized = value.trim().replace(',', '.')
    if (normalized.isBlank()) return null

    val result = normalized.toBigDecimalOrNull() ?: return null
    if (result.scale().coerceAtLeast(0) > maxScale) return null

    return result
}

@Composable
fun SalesInvoicesScreen(
    state: AppUiState,
    onSearchChange: (String) -> Unit,
    onSearch: () -> Unit,
    onStatusFilter: (String?) -> Unit,
    onOpen: (SalesInvoiceRecord) -> Unit,
    onAdd: () -> Unit,
    onBack: () -> Unit,
    onOpenPayments: () -> Unit
) {
    val filters = listOf<String?>(null, "draft", "posted", "partially_paid", "paid", "cancelled")

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                TextButton(onClick = onBack) { Text("Back") }
                Text("Sales invoices", fontWeight = FontWeight.Bold)
            }

            OutlinedTextField(
                value = state.salesInvoiceSearch,
                onValueChange = onSearchChange,
                label = { Text("Search invoices") },
                modifier = Modifier.fillMaxWidth()
            )

            Button(
                onClick = onSearch,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Search")
            }

            Button(
                onClick = onAdd,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("New sales invoice")
            }

            OutlinedButton(
                onClick = onOpenPayments,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Customer payments")
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                filters.take(3).forEach { status ->
                    FilterChip(
                        selected = state.salesInvoiceStatusFilter == status,
                        onClick = { onStatusFilter(status) },
                        label = { Text(status ?: "all") }
                    )
                }
            }
        }

        if (state.salesInvoices.isEmpty() && !state.loading) {
            item { Text("No sales invoices found.") }
        }

        items(
            items = state.salesInvoices,
            key = { it.id }
        ) { invoice ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                onClick = { onOpen(invoice) }
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(invoice.invoiceNumber, fontWeight = FontWeight.Bold)
                    Text("Date: ${invoice.invoiceDate}")
                    Text("Status: ${invoice.status}")
                    Text("Total: ${salesMoney(invoice.grandTotal, invoice.currency)}")
                    Text("Balance due: ${salesMoney(invoice.balanceDue, invoice.currency)}")
                }
            }
        }
    }
}

@Composable
fun SalesInvoiceDetailsScreen(
    state: AppUiState,
    invoiceId: String,
    onBack: () -> Unit,
    onPost: () -> Unit,
    onCancel: () -> Unit,
    onDelete: () -> Unit,
    onReceivePayment: () -> Unit
) {
    val invoice = state.salesInvoiceRecord?.takeIf { it.id == invoiceId }

    if (invoice == null) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
        ) {
            Text("Loading sales invoice...")
            TextButton(onClick = onBack) { Text("Back") }
        }
        return
    }

    val status = invoice.status.lowercase()
    var confirmPost by remember { mutableStateOf(false) }
    var confirmCancel by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            TextButton(onClick = onBack) { Text("Back") }
            Text(invoice.invoiceNumber, fontWeight = FontWeight.Bold)
            Text("Status: ${invoice.status}")
        }

        item {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(5.dp)
                ) {
                    Text("Invoice", fontWeight = FontWeight.Bold)
                    HorizontalDivider()
                    Text("Invoice date: ${invoice.invoiceDate}")
                    Text("Due date: ${invoice.dueDate ?: "Not specified"}")
                    Text("Customer ID: ${invoice.customerId}")
                    Text("Currency: ${invoice.currency}")
                    invoice.customerInvoiceReference?.let {
                        Text("Reference: $it")
                    }
                }
            }
        }

        item { Text("Items", fontWeight = FontWeight.Bold) }

        items(invoice.items, key = { it.id }) { line ->
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        line.itemName ?: line.sku ?: line.itemId,
                        fontWeight = FontWeight.Bold
                    )
                    line.sku?.let { Text("SKU: $it") }
                    Text("Quantity: ${line.quantity}")
                    Text("Unit price: ${salesMoney(line.unitPrice, invoice.currency)}")
                    Text("Line total: ${salesMoney(line.lineTotal, invoice.currency)}")
                }
            }
        }

        item {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text("Totals", fontWeight = FontWeight.Bold)
                    Text("Subtotal: ${salesMoney(invoice.subtotal, invoice.currency)}")
                    Text("Discount: ${salesMoney(invoice.discountTotal, invoice.currency)}")
                    Text("Tax: ${salesMoney(invoice.taxTotal, invoice.currency)}")
                    Text("Shipping: ${salesMoney(invoice.shippingTotal, invoice.currency)}")
                    Text("Grand total: ${salesMoney(invoice.grandTotal, invoice.currency)}")
                    Text("Paid: ${salesMoney(invoice.paidAmount, invoice.currency)}")
                    Text("Balance due: ${salesMoney(invoice.balanceDue, invoice.currency)}")
                }
            }
        }

        if (invoice.balanceDue > 0.0 && status != "draft" && status != "cancelled") {
            item {
                Button(
                    onClick = onReceivePayment,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Receive customer payment")
                }
            }
        }

        if (status == "draft") {
            item {
                Button(
                    onClick = { confirmPost = true },
                    enabled = !state.isChangingSalesInvoiceStatus,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Post invoice")
                }

                OutlinedButton(
                    onClick = { confirmDelete = true },
                    enabled = !state.isChangingSalesInvoiceStatus,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Delete draft")
                }
            }
        }

        if (status != "cancelled" && invoice.paidAmount <= 0.0) {
            item {
                OutlinedButton(
                    onClick = { confirmCancel = true },
                    enabled = !state.isChangingSalesInvoiceStatus,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Cancel invoice")
                }
            }
        }
    }

    if (confirmPost) {
        AlertDialog(
            onDismissRequest = { confirmPost = false },
            title = { Text("Post sales invoice?") },
            text = { Text("Posting creates the accounting receivable entry.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        confirmPost = false
                        onPost()
                    }
                ) { Text("Post") }
            },
            dismissButton = {
                TextButton(onClick = { confirmPost = false }) { Text("Back") }
            }
        )
    }

    if (confirmCancel) {
        AlertDialog(
            onDismissRequest = { confirmCancel = false },
            title = { Text("Cancel sales invoice?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        confirmCancel = false
                        onCancel()
                    }
                ) { Text("Cancel invoice") }
            },
            dismissButton = {
                TextButton(onClick = { confirmCancel = false }) { Text("Back") }
            }
        )
    }

    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text("Delete draft invoice?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        confirmDelete = false
                        onDelete()
                    }
                ) { Text("Delete") }
            },
            dismissButton = {
                TextButton(onClick = { confirmDelete = false }) { Text("Back") }
            }
        )
    }
}

private data class SalesInvoiceLineDraft(
    val key: Long,
    val itemId: String = "",
    val quantity: String = "1",
    val unitPrice: String = "0",
    val discountPercent: String = "0",
    val taxPercent: String = "0"
)

@Composable
fun SalesInvoiceFormScreen(
    customers: List<CustomerListItem>,
    products: List<ProductListItem>,
    isSaving: Boolean,
    onSave: (SaveSalesInvoiceRequest) -> Unit,
    onBack: () -> Unit
) {
    var customerId by rememberSaveable { mutableStateOf("") }
    var customerMenu by remember { mutableStateOf(false) }
    var invoiceDate by rememberSaveable { mutableStateOf(LocalDate.now().toString()) }
    var dueDate by rememberSaveable { mutableStateOf("") }
    var customerReference by rememberSaveable { mutableStateOf("") }
    var currency by rememberSaveable { mutableStateOf("EUR") }
    var shippingTotal by rememberSaveable { mutableStateOf("0") }
    var notes by rememberSaveable { mutableStateOf("") }

    val lines = remember {
        mutableStateListOf(
            SalesInvoiceLineDraft(key = System.nanoTime())
        )
    }

    var validationErrors by remember {
        mutableStateOf<List<String>>(emptyList())
    }

    fun buildRequest(): SaveSalesInvoiceRequest? {
        val errors = mutableListOf<String>()

        if (customerId.isBlank()) errors += "Select a customer."

        runCatching { LocalDate.parse(invoiceDate) }
            .onFailure { errors += "Invoice date must use YYYY-MM-DD." }

        if (dueDate.isNotBlank()) {
            runCatching { LocalDate.parse(dueDate) }
                .onFailure { errors += "Due date must use YYYY-MM-DD." }
        }

        if (currency.trim().length != 3) {
            errors += "Currency must contain 3 letters."
        }

        val shipping = salesDecimal(shippingTotal.ifBlank { "0" }, 2)
        if (shipping == null || shipping < BigDecimal.ZERO) {
            errors += "Shipping must be zero or greater with maximum 2 decimals."
        }

        val requestItems = lines.mapIndexedNotNull { index, line ->
            val row = index + 1

            if (line.itemId.isBlank()) {
                errors += "Line $row: select a product."
                return@mapIndexedNotNull null
            }

            val quantity = salesDecimal(line.quantity, 4)
            val unitPrice = salesDecimal(line.unitPrice, 4)
            val discount = salesDecimal(line.discountPercent, 4)
            val tax = salesDecimal(line.taxPercent, 4)

            if (quantity == null || quantity <= BigDecimal.ZERO) {
                errors += "Line $row: quantity must be greater than zero."
                return@mapIndexedNotNull null
            }

            if (unitPrice == null || unitPrice < BigDecimal.ZERO) {
                errors += "Line $row: unit price must be zero or greater."
                return@mapIndexedNotNull null
            }

            if (discount == null || discount < BigDecimal.ZERO || discount > BigDecimal("100")) {
                errors += "Line $row: discount must be between 0 and 100."
                return@mapIndexedNotNull null
            }

            if (tax == null || tax < BigDecimal.ZERO || tax > BigDecimal("100")) {
                errors += "Line $row: tax must be between 0 and 100."
                return@mapIndexedNotNull null
            }

            val product = products.firstOrNull { it.id == line.itemId }

            SalesInvoiceItemRequest(
                itemId = line.itemId,
                itemName = product?.name,
                sku = product?.sku,
                unit = product?.unit,
                quantity = quantity.toDouble(),
                unitPrice = unitPrice.toDouble(),
                discountPercent = discount.toDouble(),
                taxPercent = tax.toDouble()
            )
        }

        if (requestItems.isEmpty()) errors += "Add at least one valid invoice line."

        validationErrors = errors.distinct()
        if (validationErrors.isNotEmpty()) return null

        return SaveSalesInvoiceRequest(
            customerId = customerId,
            invoiceDate = invoiceDate,
            dueDate = dueDate.trim().takeIf { it.isNotEmpty() },
            currency = currency.uppercase(),
            shippingTotal = shipping?.toDouble() ?: 0.0,
            customerInvoiceReference = customerReference.trim().takeIf { it.isNotEmpty() },
            notes = notes.trim().takeIf { it.isNotEmpty() },
            items = requestItems
        )
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            TextButton(onClick = onBack) { Text("Back") }
            Text("New sales invoice", fontWeight = FontWeight.Bold)

            OutlinedButton(
                onClick = { customerMenu = true },
                modifier = Modifier.fillMaxWidth()
            ) {
                val selected = customers.firstOrNull { it.id == customerId }
                Text(selected?.name ?: "Select customer")
            }

            DropdownMenu(
                expanded = customerMenu,
                onDismissRequest = { customerMenu = false }
            ) {
                customers.forEach { customer ->
                    DropdownMenuItem(
                        text = { Text(customer.name) },
                        onClick = {
                            customerId = customer.id
                            customerMenu = false
                        }
                    )
                }
            }

            OutlinedTextField(
                value = customerReference,
                onValueChange = { customerReference = it },
                label = { Text("Customer reference") },
                modifier = Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = invoiceDate,
                onValueChange = { invoiceDate = it },
                label = { Text("Invoice date YYYY-MM-DD") },
                modifier = Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = dueDate,
                onValueChange = { dueDate = it },
                label = { Text("Due date YYYY-MM-DD") },
                modifier = Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = currency,
                onValueChange = { currency = it },
                label = { Text("Currency") },
                modifier = Modifier.fillMaxWidth()
            )
        }

        items(lines, key = { it.key }) { line ->
            var productMenu by remember(line.key) { mutableStateOf(false) }
            val index = lines.indexOfFirst { it.key == line.key }

            Card(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text("Invoice line ${index + 1}", fontWeight = FontWeight.Bold)

                    OutlinedButton(
                        onClick = { productMenu = true },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        val selected = products.firstOrNull { it.id == line.itemId }
                        Text(
                            selected?.let { "${it.sku ?: ""} ${it.name}" }
                                ?: "Select product"
                        )
                    }

                    DropdownMenu(
                        expanded = productMenu,
                        onDismissRequest = { productMenu = false }
                    ) {
                        products.forEach { product ->
                            DropdownMenuItem(
                                text = { Text("${product.sku ?: ""} - ${product.name}") },
                                onClick = {
                                    lines[index] = line.copy(
                                        itemId = product.id,
                                        unitPrice = product.sellingPrice.toString()
                                    )
                                    productMenu = false
                                }
                            )
                        }
                    }

                    OutlinedTextField(
                        value = line.quantity,
                        onValueChange = { lines[index] = line.copy(quantity = it) },
                        label = { Text("Quantity") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = line.unitPrice,
                        onValueChange = { lines[index] = line.copy(unitPrice = it) },
                        label = { Text("Unit price") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = line.discountPercent,
                        onValueChange = { lines[index] = line.copy(discountPercent = it) },
                        label = { Text("Discount %") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = line.taxPercent,
                        onValueChange = { lines[index] = line.copy(taxPercent = it) },
                        label = { Text("Tax %") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.fillMaxWidth()
                    )

                    if (lines.size > 1) {
                        TextButton(onClick = { lines.removeAt(index) }) {
                            Text("Remove line")
                        }
                    }
                }
            }
        }

        item {
            OutlinedButton(
                onClick = {
                    lines += SalesInvoiceLineDraft(key = System.nanoTime())
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Add invoice line")
            }

            OutlinedTextField(
                value = shippingTotal,
                onValueChange = { shippingTotal = it },
                label = { Text("Shipping") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = notes,
                onValueChange = { notes = it },
                label = { Text("Notes") },
                modifier = Modifier.fillMaxWidth()
            )

            validationErrors.forEach { error -> Text(error) }

            Button(
                onClick = { buildRequest()?.let(onSave) },
                enabled = !isSaving,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(if (isSaving) "Saving..." else "Create sales invoice")
            }
        }
    }
}
