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
    onSync: (String) -> Unit,
    onRetry: (String) -> Unit,
    onCreateInvoicePdf: () -> Unit,
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

                Button(
                    onClick = onShareInvoicePdf,
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Outlined.Share, contentDescription = null)
                    Text(" Share", maxLines = 1)
                }
            }
        }

        order.tallySyncError?.let { error ->
            item { Text(error, color = MaterialTheme.colorScheme.error) }
        }

        item {
            if (order.syncStatus == "failed") {
                Button(
                    onClick = { onRetry(order.id) },
                    modifier = Modifier.fillMaxWidth()
                ) { Text("Retry synchronization") }
            } else if (order.syncStatus != "synced") {
                Button(
                    onClick = { onSync(order.id) },
                    modifier = Modifier.fillMaxWidth()
                ) { Text("Synchronize order") }
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
