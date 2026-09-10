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
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.tallysyncapp.data.network.PurchaseOrderItemRecord
import java.util.Locale

@Composable
fun PurchaseOrderDetailsScreen(
    state: AppUiState,
    purchaseOrderId: String,
    onBack: () -> Unit,
    onEdit: () -> Unit,
    onSend: () -> Unit,
    onCancel: () -> Unit,
    onDelete: () -> Unit
) {
    val purchaseOrder =
        state.purchaseOrderRecord
            ?.takeIf { it.id == purchaseOrderId }

    var confirmSend by remember {
        mutableStateOf(false)
    }

    var confirmCancel by remember {
        mutableStateOf(false)
    }

    var confirmDelete by remember {
        mutableStateOf(false)
    }

    if (purchaseOrder == null) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            if (state.loading) {
                CircularProgressIndicator()
            } else {
                Text("Purchase order could not be loaded.")

                TextButton(onClick = onBack) {
                    Text("Back")
                }
            }
        }

        return
    }

    val supplier =
        state.suppliers.firstOrNull {
            it.id == purchaseOrder.supplierId
        }

    val warehouse =
        state.warehouses.firstOrNull {
            it.id == purchaseOrder.warehouseId
        }

    val normalizedStatus =
        purchaseOrder.status.lowercase()

    val canEdit =
        normalizedStatus == "draft"

    val canSend =
        normalizedStatus == "draft"

    val canDelete =
        normalizedStatus == "draft"

    /*
     * Receiving itself belongs to Stage 6K.
     *
     * Cancellation is intentionally exposed only for draft/sent.
     * Once receiving has begun, this screen becomes read-only.
     */
    val canCancel =
        normalizedStatus == "draft" ||
            normalizedStatus == "sent"

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            TextButton(onClick = onBack) {
                Text("Back")
            }

            Text(
                text = purchaseOrder.poNumber,
                fontWeight = FontWeight.Bold
            )

            Text(
                text = purchaseOrder.status
                    .replace('_', ' ')
                    .uppercase()
            )
        }

        item {
            PurchaseOrderDetailsSection(
                title = "Purchase order"
            ) {
                PurchaseDetailRow(
                    "PO date",
                    purchaseOrder.poDate
                )

                PurchaseDetailRow(
                    "Expected delivery",
                    purchaseOrder.expectedDeliveryDate
                        ?: "Not specified"
                )

                PurchaseDetailRow(
                    "Currency",
                    purchaseOrder.currency
                )
            }
        }

        item {
            PurchaseOrderDetailsSection(
                title = "Supplier"
            ) {
                PurchaseDetailRow(
                    "Name",
                    supplier?.name
                        ?: purchaseOrder.supplierName
                        ?: purchaseOrder.supplierId
                )

                supplier?.supplierCode?.let {
                    PurchaseDetailRow(
                        "Code",
                        it
                    )
                }
            }
        }

        item {
            PurchaseOrderDetailsSection(
                title = "Warehouse"
            ) {
                PurchaseDetailRow(
                    "Name",
                    warehouse?.name
                        ?: purchaseOrder.warehouseName
                        ?: purchaseOrder.warehouseId
                )

                warehouse?.warehouseCode?.let {
                    PurchaseDetailRow(
                        "Code",
                        it
                    )
                }
            }
        }

        item {
            Text(
                text = "Items",
                fontWeight = FontWeight.Bold
            )
        }

        items(
            items = purchaseOrder.items,
            key = { it.id }
        ) { line ->

            PurchaseOrderLineCard(
                line = line,
                productName =
                    state.products
                        .firstOrNull {
                            it.id == line.itemId
                        }
                        ?.name
                        ?: line.itemName
                        ?: line.itemId,
                productSku =
                    state.products
                        .firstOrNull {
                            it.id == line.itemId
                        }
                        ?.sku
                        ?: line.itemSku
            )
        }

        item {
            PurchaseOrderDetailsSection(
                title = "Totals"
            ) {
                PurchaseMoneyRow(
                    "Subtotal",
                    purchaseOrder.subtotal,
                    purchaseOrder.currency
                )

                PurchaseMoneyRow(
                    "Discount",
                    purchaseOrder.discountAmount,
                    purchaseOrder.currency
                )

                PurchaseMoneyRow(
                    "Tax",
                    purchaseOrder.taxAmount,
                    purchaseOrder.currency
                )

                PurchaseMoneyRow(
                    "Shipping",
                    purchaseOrder.shippingAmount,
                    purchaseOrder.currency
                )

                HorizontalDivider()

                PurchaseMoneyRow(
                    "Grand total",
                    purchaseOrder.grandTotal,
                    purchaseOrder.currency,
                    bold = true
                )
            }
        }

        if (!purchaseOrder.notes.isNullOrBlank()) {
            item {
                PurchaseOrderDetailsSection(
                    title = "Notes"
                ) {
                    Text(purchaseOrder.notes)
                }
            }
        }

        item {
            Spacer(Modifier.height(4.dp))

            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement =
                    Arrangement.spacedBy(8.dp)
            ) {
                if (canEdit) {
                    OutlinedButton(
                        onClick = onEdit,
                        enabled =
                            !state.isChangingPurchaseOrderStatus,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Edit purchase order")
                    }
                }

                if (canSend) {
                    Button(
                        onClick = {
                            confirmSend = true
                        },
                        enabled =
                            !state.isChangingPurchaseOrderStatus,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Send purchase order")
                    }
                }

                if (canCancel) {
                    OutlinedButton(
                        onClick = {
                            confirmCancel = true
                        },
                        enabled =
                            !state.isChangingPurchaseOrderStatus,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Cancel purchase order")
                    }
                }

                if (canDelete) {
                    OutlinedButton(
                        onClick = {
                            confirmDelete = true
                        },
                        enabled =
                            !state.isChangingPurchaseOrderStatus,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Delete draft")
                    }
                }
            }
        }
    }

    if (confirmSend) {
        PurchaseOrderConfirmationDialog(
            title = "Send purchase order?",
            message =
                "The draft will move to sent status.",
            confirmText = "Send",
            onDismiss = {
                confirmSend = false
            },
            onConfirm = {
                confirmSend = false
                onSend()
            }
        )
    }

    if (confirmCancel) {
        PurchaseOrderConfirmationDialog(
            title = "Cancel purchase order?",
            message =
                "This purchase order will be cancelled.",
            confirmText = "Cancel PO",
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
        PurchaseOrderConfirmationDialog(
            title = "Delete draft?",
            message =
                "This draft purchase order will be deleted.",
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

@Composable
private fun PurchaseOrderDetailsSection(
    title: String,
    content: @Composable () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(7.dp)
        ) {
            Text(
                text = title,
                fontWeight = FontWeight.Bold
            )

            HorizontalDivider()

            content()
        }
    }
}

@Composable
private fun PurchaseDetailRow(
    label: String,
    value: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label)

        Text(
            text = value,
            fontWeight = FontWeight.Medium
        )
    }
}

@Composable
private fun PurchaseMoneyRow(
    label: String,
    amount: Double,
    currency: String,
    bold: Boolean = false
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            fontWeight =
                if (bold) FontWeight.Bold
                else FontWeight.Normal
        )

        Text(
            text = "$currency ${
                String.format(
                    Locale.US,
                    "%.2f",
                    amount
                )
            }",
            fontWeight =
                if (bold) FontWeight.Bold
                else FontWeight.Normal
        )
    }
}

@Composable
private fun PurchaseOrderLineCard(
    line: PurchaseOrderItemRecord,
    productName: String,
    productSku: String?
) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(5.dp)
        ) {
            Text(
                text = productName,
                fontWeight = FontWeight.Bold
            )

            if (!productSku.isNullOrBlank()) {
                Text("SKU: $productSku")
            }

            PurchaseDetailRow(
                "Quantity",
                formatPurchaseNumber(line.quantity)
            )

            if (line.receivedQuantity > 0.0) {
                PurchaseDetailRow(
                    "Received",
                    formatPurchaseNumber(
                        line.receivedQuantity
                    )
                )
            }

            PurchaseDetailRow(
                "Unit price",
                formatPurchaseNumber(
                    line.unitPrice
                )
            )

            PurchaseDetailRow(
                "Discount",
                "${formatPurchaseNumber(
                    line.discountPercentage
                )}%"
            )

            PurchaseDetailRow(
                "Tax",
                "${formatPurchaseNumber(
                    line.taxRate
                )}%"
            )

            PurchaseDetailRow(
                "Line total",
                formatPurchaseNumber(
                    line.lineTotal
                )
            )
        }
    }
}

private fun formatPurchaseNumber(
    number: Double
): String {
    val formatted =
        String.format(
            Locale.US,
            "%.4f",
            number
        )

    return formatted
        .trimEnd('0')
        .trimEnd('.')
}

@Composable
private fun PurchaseOrderConfirmationDialog(
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