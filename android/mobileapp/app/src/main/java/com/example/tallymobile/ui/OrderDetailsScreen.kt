package com.example.tallymobile.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun OrderDetailsScreen(
    state: AppUiState,
    onSync: (String) -> Unit,
    onRetry: (String) -> Unit
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
            Text(
                order.orderNumber,
                style = MaterialTheme.typography.headlineMedium
            )
            Text(order.customer.name)
            Text("Status: ${order.status}")
            Text("Sync status: ${order.syncStatus}")
            Text("Total: ${order.grandTotal}")
        }

        order.tallySyncError?.let { error ->
            item {
                Text(error, color = MaterialTheme.colorScheme.error)
            }
        }

        item {
            if (order.syncStatus == "failed") {
                Button(
                    onClick = { onRetry(order.id) },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Retry synchronization")
                }
            } else if (order.syncStatus != "synced") {
                Button(
                    onClick = { onSync(order.id) },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Synchronize order")
                }
            }
        }

        item {
            Text("Items", style = MaterialTheme.typography.titleLarge)
        }

        items(order.items, key = { it.id }) { item ->
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(item.itemName)
                    Text("Quantity: ${item.quantity} ${item.unit.orEmpty()}")
                    Text("Unit price: ${item.unitPrice}")
                    Text("Total: ${item.lineTotal}")
                }
            }
        }
    }
}
