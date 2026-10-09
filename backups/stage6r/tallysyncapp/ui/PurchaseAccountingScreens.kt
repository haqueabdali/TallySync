package com.example.tallysyncapp.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
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
import androidx.compose.runtime.LaunchedEffect
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
import com.example.tallysyncapp.data.network.ProductListItem
import com.example.tallysyncapp.data.network.PurchaseInvoiceItemRequest
import com.example.tallysyncapp.data.network.PurchaseInvoiceRecord
import com.example.tallysyncapp.data.network.SavePurchaseInvoiceRequest
import com.example.tallysyncapp.data.network.SaveSupplierPaymentRequest
import com.example.tallysyncapp.data.network.SupplierListItem
import com.example.tallysyncapp.data.network.SupplierPaymentAllocationRequest
import java.math.BigDecimal
import java.time.LocalDate
import java.util.Locale

private fun money(
    amount: Double,
    currency: String
): String = "$currency ${
    String.format(Locale.US, "%.2f", amount)
}"

private fun decimal(
    value: String,
    maxScale: Int
): BigDecimal? {
    val normalized =
        value.trim().replace(',', '.')

    if (normalized.isBlank()) return null

    val result =
        normalized.toBigDecimalOrNull()
            ?: return null

    if (result.scale().coerceAtLeast(0) > maxScale) {
        return null
    }

    return result
}

/* ============================================================
 * Purchase invoice list
 * ============================================================ */

@Composable
fun PurchaseInvoicesScreen(
    state: AppUiState,
    onSearchChange: (String) -> Unit,
    onSearch: () -> Unit,
    onStatusFilter: (String?) -> Unit,
    onOpen: (PurchaseInvoiceRecord) -> Unit,
    onAdd: () -> Unit,
    onBack: () -> Unit,
    onOpenPayments: () -> Unit
) {
    val filters =
        listOf<String?>(null, "Draft", "Posted", "PartiallyPaid", "Paid", "Cancelled")

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
                TextButton(onClick = onBack) {
                    Text("Back")
                }

                Text(
                    "Purchase invoices",
                    fontWeight = FontWeight.Bold
                )
            }

            OutlinedTextField(
                value = state.purchaseInvoiceSearch,
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
                Text("New purchase invoice")
            }

            OutlinedButton(
                onClick = onOpenPayments,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Supplier payments")
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                filters.take(3).forEach { status ->
                    FilterChip(
                        selected =
                            state.purchaseInvoiceStatusFilter == status,
                        onClick = {
                            onStatusFilter(status)
                        },
                        label = {
                            Text(status ?: "All")
                        }
                    )
                }
            }
        }

        if (state.purchaseInvoices.isEmpty() && !state.loading) {
            item {
                Text("No purchase invoices found.")
            }
        }

        items(
            items = state.purchaseInvoices,
            key = { it.id }
        ) { invoice ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                onClick = {
                    onOpen(invoice)
                }
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        invoice.invoiceNumber,
                        fontWeight = FontWeight.Bold
                    )

                    invoice.supplierInvoiceNumber
                        ?.takeIf { it.isNotBlank() }
                        ?.let {
                            Text("Supplier invoice: $it")
                        }

                    Text("Date: ${invoice.invoiceDate}")
                    Text("Status: ${invoice.status}")
                    Text(
                        "Total: ${
                            money(
                                invoice.grandTotal,
                                invoice.currency
                            )
                        }"
                    )

                    Text(
                        "Balance due: ${
                            money(
                                invoice.balanceDue,
                                invoice.currency
                            )
                        }"
                    )
                }
            }
        }
    }
}

/* ============================================================
 * Purchase invoice details
 * ============================================================ */

@Composable
fun PurchaseInvoiceDetailsScreen(
    state: AppUiState,
    invoiceId: String,
    onBack: () -> Unit,
    onPost: () -> Unit,
    onCancel: () -> Unit,
    onDelete: () -> Unit,
    onMakePayment: () -> Unit
) {
    val invoice =
        state.purchaseInvoiceRecord
            ?.takeIf { it.id == invoiceId }

    if (invoice == null) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
        ) {
            Text("Loading purchase invoice...")
            TextButton(onClick = onBack) {
                Text("Back")
            }
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
            TextButton(onClick = onBack) {
                Text("Back")
            }

            Text(
                invoice.invoiceNumber,
                fontWeight = FontWeight.Bold
            )

            Text("Status: ${invoice.status}")
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(5.dp)
                ) {
                    Text("Invoice", fontWeight = FontWeight.Bold)
                    HorizontalDivider()
                    Text("Invoice date: ${invoice.invoiceDate}")
                    Text("Due date: ${invoice.dueDate ?: "Not specified"}")
                    Text("Currency: ${invoice.currency}")
                    Text("Supplier ID: ${invoice.supplierId}")

                    invoice.supplierInvoiceNumber?.let {
                        Text("Supplier invoice: $it")
                    }
                }
            }
        }

        item {
            Text("Items", fontWeight = FontWeight.Bold)
        }

        items(
            items = invoice.items,
            key = { it.id }
        ) { line ->
            Card(
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        line.itemName
                            ?: line.sku
                            ?: line.itemId,
                        fontWeight = FontWeight.Bold
                    )

                    line.sku?.let {
                        Text("SKU: $it")
                    }

                    Text("Quantity: ${line.quantity}")
                    Text("Unit cost: ${line.unitCost}")
                    Text("Discount: ${line.discountPercent}%")
                    Text("Tax: ${line.taxPercent}%")
                    Text(
                        "Line total: ${
                            money(
                                line.lineTotal,
                                invoice.currency
                            )
                        }"
                    )
                }
            }
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(5.dp)
                ) {
                    Text("Totals", fontWeight = FontWeight.Bold)
                    HorizontalDivider()

                    Text(
                        "Subtotal: ${
                            money(
                                invoice.subtotal,
                                invoice.currency
                            )
                        }"
                    )

                    Text(
                        "Discount: ${
                            money(
                                invoice.discountTotal,
                                invoice.currency
                            )
                        }"
                    )

                    Text(
                        "Tax: ${
                            money(
                                invoice.taxTotal,
                                invoice.currency
                            )
                        }"
                    )

                    Text(
                        "Shipping: ${
                            money(
                                invoice.shippingTotal,
                                invoice.currency
                            )
                        }"
                    )

                    Text(
                        "Grand total: ${
                            money(
                                invoice.grandTotal,
                                invoice.currency
                            )
                        }",
                        fontWeight = FontWeight.Bold
                    )

                    Text(
                        "Paid: ${
                            money(
                                invoice.paidAmount,
                                invoice.currency
                            )
                        }"
                    )

                    Text(
                        "Balance due: ${
                            money(
                                invoice.balanceDue,
                                invoice.currency
                            )
                        }",
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        item {
            if (status == "draft") {
                Button(
                    onClick = {
                        confirmPost = true
                    },
                    enabled =
                        !state.isChangingPurchaseInvoiceStatus,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Post purchase invoice")
                }

                OutlinedButton(
                    onClick = {
                        confirmDelete = true
                    },
                    enabled =
                        !state.isChangingPurchaseInvoiceStatus,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Delete draft")
                }
            }

            if (
                invoice.balanceDue > 0.0 &&
                (
                    status == "posted" ||
                    status == "partiallypaid" ||
                    status == "partially_paid"
                )
            ) {
                Button(
                    onClick = onMakePayment,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Make supplier payment")
                }
            }

            if (
                status == "draft" ||
                status == "posted" ||
                status == "partiallypaid" ||
                status == "partially_paid"
            ) {
                OutlinedButton(
                    onClick = {
                        confirmCancel = true
                    },
                    enabled =
                        !state.isChangingPurchaseInvoiceStatus,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Cancel invoice")
                }
            }
        }
    }

    if (confirmPost) {
        ConfirmActionDialog(
            title = "Post purchase invoice?",
            message =
                "Posting makes the invoice available for payment.",
            confirmText = "Post",
            onDismiss = {
                confirmPost = false
            },
            onConfirm = {
                confirmPost = false
                onPost()
            }
        )
    }

    if (confirmCancel) {
        ConfirmActionDialog(
            title = "Cancel purchase invoice?",
            message =
                "The invoice will move to cancelled status.",
            confirmText = "Cancel invoice",
            onDismiss = {
                confirmCancel = false
            },
            onConfirm = {
                confirmCancel = false
                onCancel()
            }
        )
    }

    if (confirmDelete) {
        ConfirmActionDialog(
            title = "Delete draft?",
            message =
                "Only a draft purchase invoice can be deleted.",
            confirmText = "Delete",
            onDismiss = {
                confirmDelete = false
            },
            onConfirm = {
                confirmDelete = false
                onDelete()
            }
        )
    }
}

/* ============================================================
 * Purchase invoice create form
 * ============================================================ */

private data class PurchaseInvoiceLineDraft(
    val key: Long,
    val itemId: String = "",
    val quantity: String = "1",
    val unitCost: String = "0",
    val discountPercent: String = "0",
    val taxPercent: String = "0"
)

@Composable
fun PurchaseInvoiceFormScreen(
    suppliers: List<SupplierListItem>,
    products: List<ProductListItem>,
    isSaving: Boolean,
    onSave: (SavePurchaseInvoiceRequest) -> Unit,
    onBack: () -> Unit
) {
    var supplierId by rememberSaveable {
        mutableStateOf("")
    }

    var supplierMenu by remember {
        mutableStateOf(false)
    }

    var invoiceDate by rememberSaveable {
        mutableStateOf(LocalDate.now().toString())
    }

    var dueDate by rememberSaveable {
        mutableStateOf("")
    }

    var supplierInvoiceNumber by rememberSaveable {
        mutableStateOf("")
    }

    var currency by rememberSaveable {
        mutableStateOf("EUR")
    }

    var shippingTotal by rememberSaveable {
        mutableStateOf("0")
    }

    var notes by rememberSaveable {
        mutableStateOf("")
    }

    val lines = remember {
        mutableStateListOf(
            PurchaseInvoiceLineDraft(
                key = System.nanoTime()
            )
        )
    }

    var validationErrors by remember {
        mutableStateOf<List<String>>(emptyList())
    }

    fun buildRequest(): SavePurchaseInvoiceRequest? {
        val errors = mutableListOf<String>()

        if (supplierId.isBlank()) {
            errors += "Select a supplier."
        }

        runCatching {
            LocalDate.parse(invoiceDate)
        }.onFailure {
            errors += "Invoice date must use YYYY-MM-DD."
        }

        if (dueDate.isNotBlank()) {
            runCatching {
                LocalDate.parse(dueDate)
            }.onFailure {
                errors += "Due date must use YYYY-MM-DD."
            }
        }

        if (currency.trim().length != 3) {
            errors += "Currency must contain 3 letters."
        }

        val shipping =
            decimal(
                shippingTotal.ifBlank { "0" },
                2
            )

        if (shipping == null || shipping < BigDecimal.ZERO) {
            errors += "Shipping must be zero or greater with maximum 2 decimals."
        }

        val requestItems =
            lines.mapIndexedNotNull { index, line ->
                val row = index + 1

                if (line.itemId.isBlank()) {
                    errors += "Line $row: select a product."
                    return@mapIndexedNotNull null
                }

                val quantity =
                    decimal(line.quantity, 4)

                val unitCost =
                    decimal(line.unitCost, 4)

                val discount =
                    decimal(line.discountPercent, 4)

                val tax =
                    decimal(line.taxPercent, 4)

                if (
                    quantity == null ||
                    quantity <= BigDecimal.ZERO
                ) {
                    errors +=
                        "Line $row: quantity must be greater than zero."
                    return@mapIndexedNotNull null
                }

                if (
                    unitCost == null ||
                    unitCost < BigDecimal.ZERO
                ) {
                    errors +=
                        "Line $row: unit cost must be zero or greater."
                    return@mapIndexedNotNull null
                }

                if (
                    discount == null ||
                    discount < BigDecimal.ZERO ||
                    discount > BigDecimal("100")
                ) {
                    errors +=
                        "Line $row: discount must be between 0 and 100."
                    return@mapIndexedNotNull null
                }

                if (
                    tax == null ||
                    tax < BigDecimal.ZERO ||
                    tax > BigDecimal("100")
                ) {
                    errors +=
                        "Line $row: tax must be between 0 and 100."
                    return@mapIndexedNotNull null
                }

                PurchaseInvoiceItemRequest(
                    itemId = line.itemId,
                    quantity = quantity.toDouble(),
                    unitCost = unitCost.toDouble(),
                    discountPercent = discount.toDouble(),
                    taxPercent = tax.toDouble()
                )
            }

        if (requestItems.isEmpty()) {
            errors += "Add at least one valid invoice line."
        }

        validationErrors = errors.distinct()

        if (validationErrors.isNotEmpty()) {
            return null
        }

        return SavePurchaseInvoiceRequest(
            supplierId = supplierId,
            supplierInvoiceNumber =
                supplierInvoiceNumber.trim()
                    .takeIf { it.isNotEmpty() },
            invoiceDate = invoiceDate,
            dueDate =
                dueDate.trim()
                    .takeIf { it.isNotEmpty() },
            currency = currency.uppercase(),
            shippingTotal =
                shipping?.toDouble() ?: 0.0,
            notes =
                notes.trim()
                    .takeIf { it.isNotEmpty() },
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
            TextButton(onClick = onBack) {
                Text("Back")
            }

            Text(
                "New purchase invoice",
                fontWeight = FontWeight.Bold
            )

            OutlinedButton(
                onClick = {
                    supplierMenu = true
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                val selected =
                    suppliers.firstOrNull {
                        it.id == supplierId
                    }

                Text(
                    selected?.let {
                        "${it.supplierCode} - ${it.name}"
                    } ?: "Select supplier"
                )
            }

            DropdownMenu(
                expanded = supplierMenu,
                onDismissRequest = {
                    supplierMenu = false
                }
            ) {
                suppliers.forEach { supplier ->
                    DropdownMenuItem(
                        text = {
                            Text(
                                "${supplier.supplierCode} - ${supplier.name}"
                            )
                        },
                        onClick = {
                            supplierId = supplier.id
                            supplierMenu = false
                        }
                    )
                }
            }

            OutlinedTextField(
                value = supplierInvoiceNumber,
                onValueChange = {
                    supplierInvoiceNumber = it
                },
                label = {
                    Text("Supplier invoice number")
                },
                modifier = Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = invoiceDate,
                onValueChange = {
                    invoiceDate = it
                },
                label = {
                    Text("Invoice date YYYY-MM-DD")
                },
                modifier = Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = dueDate,
                onValueChange = {
                    dueDate = it
                },
                label = {
                    Text("Due date YYYY-MM-DD")
                },
                modifier = Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = currency,
                onValueChange = {
                    currency = it
                },
                label = {
                    Text("Currency")
                },
                modifier = Modifier.fillMaxWidth()
            )
        }

        items(
            items = lines,
            key = { it.key }
        ) { line ->

            var productMenu by remember(line.key) {
                mutableStateOf(false)
            }

            val index =
                lines.indexOfFirst {
                    it.key == line.key
                }

            Card(
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(12.dp),
                    verticalArrangement =
                        Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        "Invoice line ${index + 1}",
                        fontWeight = FontWeight.Bold
                    )

                    OutlinedButton(
                        onClick = {
                            productMenu = true
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        val selected =
                            products.firstOrNull {
                                it.id == line.itemId
                            }

                        Text(
                            selected?.let {
                                "${it.sku ?: ""} ${it.name}"
                            } ?: "Select product"
                        )
                    }

                    DropdownMenu(
                        expanded = productMenu,
                        onDismissRequest = {
                            productMenu = false
                        }
                    ) {
                        products.forEach { product ->
                            DropdownMenuItem(
                                text = {
                                    Text(
                                        "${product.sku ?: ""} - ${product.name}"
                                    )
                                },
                                onClick = {
                                    lines[index] =
                                        line.copy(
                                            itemId = product.id,
                                            /*
                                             * Deliberately keep unit cost at
                                             * zero. Never use sellingPrice as
                                             * a purchase cost.
                                             */
                                            unitCost = "0"
                                        )

                                    productMenu = false
                                }
                            )
                        }
                    }

                    OutlinedTextField(
                        value = line.quantity,
                        onValueChange = {
                            lines[index] =
                                line.copy(quantity = it)
                        },
                        label = { Text("Quantity") },
                        keyboardOptions =
                            KeyboardOptions(
                                keyboardType =
                                    KeyboardType.Decimal
                            ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = line.unitCost,
                        onValueChange = {
                            lines[index] =
                                line.copy(unitCost = it)
                        },
                        label = { Text("Unit cost") },
                        keyboardOptions =
                            KeyboardOptions(
                                keyboardType =
                                    KeyboardType.Decimal
                            ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = line.discountPercent,
                        onValueChange = {
                            lines[index] =
                                line.copy(
                                    discountPercent = it
                                )
                        },
                        label = { Text("Discount %") },
                        keyboardOptions =
                            KeyboardOptions(
                                keyboardType =
                                    KeyboardType.Decimal
                            ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = line.taxPercent,
                        onValueChange = {
                            lines[index] =
                                line.copy(taxPercent = it)
                        },
                        label = { Text("Tax %") },
                        keyboardOptions =
                            KeyboardOptions(
                                keyboardType =
                                    KeyboardType.Decimal
                            ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    if (lines.size > 1) {
                        TextButton(
                            onClick = {
                                lines.removeAt(index)
                            }
                        ) {
                            Text("Remove line")
                        }
                    }
                }
            }
        }

        item {
            OutlinedButton(
                onClick = {
                    lines +=
                        PurchaseInvoiceLineDraft(
                            key = System.nanoTime()
                        )
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Add invoice line")
            }

            OutlinedTextField(
                value = shippingTotal,
                onValueChange = {
                    shippingTotal = it
                },
                label = {
                    Text("Shipping")
                },
                keyboardOptions =
                    KeyboardOptions(
                        keyboardType =
                            KeyboardType.Decimal
                    ),
                modifier = Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = notes,
                onValueChange = {
                    notes = it
                },
                label = {
                    Text("Notes")
                },
                modifier = Modifier.fillMaxWidth()
            )

            validationErrors.forEach { error ->
                Text(error)
            }

            Button(
                onClick = {
                    buildRequest()?.let(onSave)
                },
                enabled = !isSaving,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    if (isSaving)
                        "Saving..."
                    else
                        "Create purchase invoice"
                )
            }
        }
    }
}

/* ============================================================
 * Supplier payment list
 * ============================================================ */

@Composable
fun SupplierPaymentsScreen(
    state: AppUiState,
    onSearchChange: (String) -> Unit,
    onSearch: () -> Unit,
    onOpen: (String) -> Unit,
    onAdd: () -> Unit,
    onBack: () -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement =
            Arrangement.spacedBy(10.dp)
    ) {
        item {
            TextButton(onClick = onBack) {
                Text("Back")
            }

            Text(
                "Supplier payments",
                fontWeight = FontWeight.Bold
            )

            OutlinedTextField(
                value = state.supplierPaymentSearch,
                onValueChange = onSearchChange,
                label = {
                    Text("Search payments")
                },
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
                Text("New supplier payment")
            }
        }

        if (
            state.supplierPayments.isEmpty() &&
            !state.loading
        ) {
            item {
                Text("No supplier payments found.")
            }
        }

        items(
            items = state.supplierPayments,
            key = { it.id }
        ) { payment ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                onClick = {
                    onOpen(payment.id)
                }
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement =
                        Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        payment.paymentNumber,
                        fontWeight = FontWeight.Bold
                    )

                    Text(payment.paymentDate)
                    Text(payment.paymentMethod)
                    Text("Status: ${payment.status}")

                    Text(
                        "Amount: ${
                            money(
                                payment.amount,
                                payment.currency
                            )
                        }"
                    )

                    Text(
                        "Unallocated: ${
                            money(
                                payment.unallocatedAmount,
                                payment.currency
                            )
                        }"
                    )
                }
            }
        }
    }
}

/* ============================================================
 * Supplier payment details
 * ============================================================ */

@Composable
fun SupplierPaymentDetailsScreen(
    state: AppUiState,
    paymentId: String,
    onBack: () -> Unit,
    onPost: () -> Unit,
    onCancel: () -> Unit,
    onDelete: () -> Unit
) {
    val payment =
        state.supplierPaymentRecord
            ?.takeIf { it.id == paymentId }

    if (payment == null) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
        ) {
            Text("Loading supplier payment...")
            TextButton(onClick = onBack) {
                Text("Back")
            }
        }

        return
    }

    val status = payment.status.lowercase()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement =
            Arrangement.spacedBy(10.dp)
    ) {
        item {
            TextButton(onClick = onBack) {
                Text("Back")
            }

            Text(
                payment.paymentNumber,
                fontWeight = FontWeight.Bold
            )

            Text("Status: ${payment.status}")
            Text("Date: ${payment.paymentDate}")
            Text("Method: ${payment.paymentMethod}")
            Text(
                "Amount: ${
                    money(
                        payment.amount,
                        payment.currency
                    )
                }"
            )
            Text(
                "Allocated: ${
                    money(
                        payment.allocatedAmount,
                        payment.currency
                    )
                }"
            )
            Text(
                "Unallocated: ${
                    money(
                        payment.unallocatedAmount,
                        payment.currency
                    )
                }"
            )
        }

        item {
            Text(
                "Allocations",
                fontWeight = FontWeight.Bold
            )
        }

        items(
            items = payment.allocations,
            key = { it.id }
        ) { allocation ->
            Card(
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(12.dp)
                ) {
                    Text(
                        "Invoice: ${allocation.purchaseInvoiceId}"
                    )

                    Text(
                        "Allocated: ${
                            money(
                                allocation.allocatedAmount,
                                payment.currency
                            )
                        }"
                    )

                    Text(
                        "Balance before: ${
                            money(
                                allocation.invoiceBalanceBefore,
                                payment.currency
                            )
                        }"
                    )

                    Text(
                        "Balance after: ${
                            money(
                                allocation.invoiceBalanceAfter,
                                payment.currency
                            )
                        }"
                    )
                }
            }
        }

        item {
            if (status == "draft") {
                Button(
                    onClick = onPost,
                    enabled =
                        !state.isChangingSupplierPaymentStatus,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Post supplier payment")
                }

                OutlinedButton(
                    onClick = onDelete,
                    enabled =
                        !state.isChangingSupplierPaymentStatus,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Delete draft")
                }
            }

            if (
                status == "draft" ||
                status == "posted"
            ) {
                OutlinedButton(
                    onClick = onCancel,
                    enabled =
                        !state.isChangingSupplierPaymentStatus,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Cancel payment")
                }
            }
        }
    }
}

/* ============================================================
 * Supplier payment form
 * ============================================================ */

@Composable
fun SupplierPaymentFormScreen(
    suppliers: List<SupplierListItem>,
    invoices: List<PurchaseInvoiceRecord>,
    preselectedInvoiceId: String? = null,
    isSaving: Boolean,
    onSave: (SaveSupplierPaymentRequest) -> Unit,
    onBack: () -> Unit
) {
    var invoiceId by rememberSaveable {
        mutableStateOf(preselectedInvoiceId.orEmpty())
    }

    var invoiceMenu by remember {
        mutableStateOf(false)
    }

    var supplierId by rememberSaveable {
        mutableStateOf("")
    }

    var paymentDate by rememberSaveable {
        mutableStateOf(LocalDate.now().toString())
    }

    var paymentMethod by rememberSaveable {
        mutableStateOf("BankTransfer")
    }

    var amount by rememberSaveable {
        mutableStateOf("")
    }

    var reference by rememberSaveable {
        mutableStateOf("")
    }

    var notes by rememberSaveable {
        mutableStateOf("")
    }

    var validationError by remember {
        mutableStateOf<String?>(null)
    }

    LaunchedEffect(
        preselectedInvoiceId,
        invoices
    ) {
        val invoice =
            invoices.firstOrNull {
                it.id == preselectedInvoiceId
            }

        if (invoice != null) {
            invoiceId = invoice.id
            supplierId = invoice.supplierId
            amount =
                String.format(
                    Locale.US,
                    "%.2f",
                    invoice.balanceDue
                )
        }
    }

    val outstandingInvoices =
        invoices.filter {
            it.balanceDue > 0.0 &&
                it.status.lowercase() != "draft" &&
                it.status.lowercase() != "cancelled"
        }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement =
            Arrangement.spacedBy(10.dp)
    ) {
        item {
            TextButton(onClick = onBack) {
                Text("Back")
            }

            Text(
                "New supplier payment",
                fontWeight = FontWeight.Bold
            )

            OutlinedButton(
                onClick = {
                    invoiceMenu = true
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                val selected =
                    invoices.firstOrNull {
                        it.id == invoiceId
                    }

                Text(
                    selected?.let {
                        "${it.invoiceNumber} - ${
                            money(
                                it.balanceDue,
                                it.currency
                            )
                        } due"
                    } ?: "Select outstanding invoice"
                )
            }

            DropdownMenu(
                expanded = invoiceMenu,
                onDismissRequest = {
                    invoiceMenu = false
                }
            ) {
                outstandingInvoices.forEach { invoice ->
                    DropdownMenuItem(
                        text = {
                            Text(
                                "${invoice.invoiceNumber} - ${
                                    money(
                                        invoice.balanceDue,
                                        invoice.currency
                                    )
                                }"
                            )
                        },
                        onClick = {
                            invoiceId = invoice.id
                            supplierId =
                                invoice.supplierId

                            amount =
                                String.format(
                                    Locale.US,
                                    "%.2f",
                                    invoice.balanceDue
                                )

                            invoiceMenu = false
                        }
                    )
                }
            }

            suppliers.firstOrNull {
                it.id == supplierId
            }?.let {
                Text(
                    "Supplier: ${it.supplierCode} - ${it.name}"
                )
            }

            OutlinedTextField(
                value = paymentDate,
                onValueChange = {
                    paymentDate = it
                },
                label = {
                    Text("Payment date YYYY-MM-DD")
                },
                modifier = Modifier.fillMaxWidth()
            )

            Text(
                "Payment method",
                fontWeight = FontWeight.Bold
            )

            Row(
                horizontalArrangement =
                    Arrangement.spacedBy(6.dp)
            ) {
                listOf(
                    "BankTransfer",
                    "Cash",
                    "Card"
                ).forEach { method ->
                    FilterChip(
                        selected =
                            paymentMethod == method,
                        onClick = {
                            paymentMethod = method
                        },
                        label = {
                            Text(method)
                        }
                    )
                }
            }

            OutlinedTextField(
                value = amount,
                onValueChange = {
                    amount = it
                },
                label = {
                    Text("Payment amount")
                },
                keyboardOptions =
                    KeyboardOptions(
                        keyboardType =
                            KeyboardType.Decimal
                    ),
                modifier = Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = reference,
                onValueChange = {
                    reference = it
                },
                label = {
                    Text("Reference number")
                },
                modifier = Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = notes,
                onValueChange = {
                    notes = it
                },
                label = {
                    Text("Notes")
                },
                modifier = Modifier.fillMaxWidth()
            )

            validationError?.let {
                Text(it)
            }

            Button(
                onClick = {
                    val invoice =
                        invoices.firstOrNull {
                            it.id == invoiceId
                        }

                    val paymentAmount =
                        decimal(amount, 2)

                    validationError =
                        when {
                            invoice == null ->
                                "Select an outstanding invoice."

                            supplierId.isBlank() ->
                                "Supplier is required."

                            paymentAmount == null ||
                                paymentAmount <=
                                BigDecimal.ZERO ->
                                "Enter a valid payment amount."

                            paymentAmount >
                                BigDecimal.valueOf(
                                    invoice.balanceDue
                                ) ->
                                "Payment cannot exceed invoice balance."

                            else -> null
                        }

                    if (validationError == null) {
                        onSave(
                            SaveSupplierPaymentRequest(
                                supplierId =
                                    supplierId,
                                paymentDate =
                                    paymentDate,
                                paymentMethod =
                                    paymentMethod,
                                amount =
                                    paymentAmount!!.toDouble(),
                                currency =
                                    invoice!!.currency,
                                referenceNumber =
                                    reference.trim()
                                        .takeIf {
                                            it.isNotEmpty()
                                        },
                                notes =
                                    notes.trim()
                                        .takeIf {
                                            it.isNotEmpty()
                                        },
                                allocations =
                                    listOf(
                                        SupplierPaymentAllocationRequest(
                                            purchaseInvoiceId =
                                                invoice.id,
                                            allocatedAmount =
                                                paymentAmount.toDouble()
                                        )
                                    )
                            )
                        )
                    }
                },
                enabled = !isSaving,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    if (isSaving)
                        "Saving..."
                    else
                        "Create supplier payment"
                )
            }
        }
    }
}

@Composable
private fun ConfirmActionDialog(
    title: String,
    message: String,
    confirmText: String,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(title)
        },
        text = {
            Text(message)
        },
        confirmButton = {
            Button(
                onClick = onConfirm
            ) {
                Text(confirmText)
            }
        },
        dismissButton = {
            TextButton(
                onClick = onDismiss
            ) {
                Text("Back")
            }
        }
    )
}
