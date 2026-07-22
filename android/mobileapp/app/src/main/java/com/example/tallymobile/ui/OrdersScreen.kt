package com.example.tallymobile.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.tallymobile.data.network.SalesOrderSummary

@Composable
fun OrdersScreen(
    state: AppUiState,
    onSelectFilter: (String?) -> Unit,
    onOpenOrder: (String) -> Unit
) {
    Column(
        modifier = Modifier.padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Sales Orders", style = MaterialTheme.typography.headlineMedium)

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(
                "All" to null,
                "Pending" to "pending",
                "Failed" to "failed",
                "Synced" to "synced"
            ).forEach { (label, value) ->
                AssistChip(
                    onClick = { onSelectFilter(value) },
                    label = { Text(label) }
                )
            }
        }

        if (state.loading && state.orders.isEmpty()) {
            CircularProgressIndicator()
        }

        state.error?.let {
            Text(it, color = MaterialTheme.colorScheme.error)
        }

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(
                items = state.orders,
                key = { it.id }
            ) { order ->
                OrderCard(order, onOpenOrder)
            }
        }
    }
}

@Composable
private fun OrderCard(
    order: SalesOrderSummary,
    onOpenOrder: (String) -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onOpenOrder(order.id) }
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                order.orderNumber,
                style = MaterialTheme.typography.titleMedium
            )
            Text(order.customerName)
            Text("Total: ${order.grandTotal}")
            Text("Sync: ${order.syncStatus}")

            order.tallySyncError?.let {
                Text(it, color = MaterialTheme.colorScheme.error)
            }
        }
    }
}
