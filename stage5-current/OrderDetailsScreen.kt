package com.example.tallysyncapp.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.PictureAsPdf
import androidx.compose.material.icons.outlined.Print
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import java.text.NumberFormat
import java.util.Locale

@Composable
fun OrderDetailsScreen(
    state: AppUiState,
    onFulfill: (String) -> Unit,
    onSync: (String) -> Unit,
    onRetry: (String) -> Unit,
    onCreateInvoicePdf: () -> Unit,
    onPrintInvoicePdf: () -> Unit,
    onShareInvoicePdf: () -> Unit
) {
    val order = state.selectedOrder

    if (state.loading && order == null) {
        CircularProgressIndicator(modifier = Modifier.padding(16.dp))
        return
    }

    if (order == null) {
        Text("Sales order not found", modifier = Modifier.padding(16.dp))
        return
    }

    LazyColumn(
        modifier = Modifier.padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text(order.orderNumber, style = MaterialTheme.typography.headlineMedium)
            Text(order.customer.name)
            Text("Status: ${order.status}")
            Text("Sync status: ${order.syncStatus}")
            Text("Total: ${money(order.grandTotal)}")
        }

        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedButton(
                        onClick = onCreateInvoicePdf,
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Outlined.PictureAsPdf, contentDescription = null)
                        Text(" Save PDF", maxLines = 1)
                    }

                    OutlinedButton(
                        onClick = onPrintInvoicePdf,
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Outlined.Print, contentDescription = null)
                        Text(" Print", maxLines = 1)
                    }
                }

                Button(
                    onClick = onShareInvoicePdf,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Outlined.Share, contentDescription = null)
                    Text(" Share invoice", maxLines = 1)
                }
            }
        }

        order.tallySyncError?.let { error ->
            item { Text(error, color = MaterialTheme.colorScheme.error) }
        }

        item {

    val orderStatus = order.status.lowercase()
    val syncStatus = order.syncStatus.lowercase()

    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {

        when {

            syncStatus == "synced" -> {
                Card(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            text = "✓ Synchronized with Tally",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.primary
                        )

                        order.tallyVoucherId
                            ?.takeIf { it.isNotBlank() }
                            ?.let {
                                Text(
                                    text = "Tally voucher ID: $it",
                                    style = MaterialTheme.typography.bodyMedium
                                )
                            }
                    }
                }
            }

            orderStatus in setOf(
                "submitted",
                "confirmed",
                "delivered"
            ) -> {

                Text(
                    text = "This order must be fulfilled before it can be synchronized with Tally.",
                    style = MaterialTheme.typography.bodyMedium
                )

                Button(
                    onClick = {
                        onFulfill(order.id)
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Fulfill order")
                }
            }

            orderStatus == "fulfilled" &&
                    syncStatus == "failed" -> {

                Text(
                    text = "The last Tally synchronization failed.",
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyMedium
                )

                Button(
                    onClick = {
                        onRetry(order.id)
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Retry Tally synchronization")
                }
            }

            orderStatus == "fulfilled" -> {

                Text(
                    text = "Order fulfilled. It is ready to synchronize with Tally.",
                    style = MaterialTheme.typography.bodyMedium
                )

                Button(
                    onClick = {
                        onSync(order.id)
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Synchronize with Tally")
                }
            }

            else -> {

                Text(
                    text = "This order cannot be synchronized in its current status.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

        item { Text("Items", style = MaterialTheme.typography.titleLarge) }

        items(order.items, key = { it.id }) { item ->
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(item.itemName, style = MaterialTheme.typography.titleMedium)
                    item.sku?.takeIf { it.isNotBlank() }?.let { Text("SKU: $it") }
                    Text("Quantity: ${formatQuantity(item.quantity)} ${item.unit.orEmpty()}")
                    Text("Unit price: ${money(item.unitPrice)}")
                    Text("Total: ${money(item.lineTotal)}")
                }
            }
        }

        item {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    AmountLine("Subtotal", order.subtotal)
                    if (order.discountTotal != 0.0) AmountLine("Discount", order.discountTotal)
                    if (order.taxTotal != 0.0) AmountLine("Tax", order.taxTotal)
                    AmountLine("Grand total", order.grandTotal, emphasized = true)
                }
            }
        }
    }
}

@Composable
private fun AmountLine(label: String, value: Double, emphasized: Boolean = false) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = if (emphasized) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyMedium)
        Text(money(value), style = if (emphasized) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyMedium)
    }
}

private fun money(value: Double): String =
    NumberFormat.getCurrencyInstance(Locale.US).format(value)

private fun formatQuantity(value: Double): String =
    if (value % 1.0 == 0.0) value.toLong().toString() else "%.2f".format(Locale.US, value)
