package com.example.tallysyncapp.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun DashboardScreen(
    state: AppUiState,
    onRefresh: () -> Unit,
    onOpenInventory: () -> Unit,
    onOpenOrders: () -> Unit,
    onSyncPending: () -> Unit
) {
    Column(
        modifier = Modifier.padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Dashboard", style = MaterialTheme.typography.headlineMedium)

        NetworkStatusCard(
            isOnline = state.isOnline,
            localPendingOrders = state.localPendingOrders
        )

        if (state.loading && state.dashboard == null) {
            CircularProgressIndicator()
            return@Column
        }

        val dashboard = state.dashboard
        val lowStockCount = state.products.count { it.stock in 0.000001..5.0 }
        val outOfStockCount = state.products.count { it.stock <= 0.0 }

        StatusCard(
            title = "Tally",
            value = if (dashboard?.tally?.connected == true) "Connected" else "Disconnected"
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            StatisticCard(
                modifier = Modifier.weight(1f),
                title = "Server pending",
                value = dashboard?.orders?.pending ?: 0
            )
            StatisticCard(
                modifier = Modifier.weight(1f),
                title = "Offline queue",
                value = state.localPendingOrders
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            StatisticCard(
                modifier = Modifier.weight(1f),
                title = "Failed",
                value = dashboard?.orders?.failed ?: 0
            )
            StatisticCard(
                modifier = Modifier.weight(1f),
                title = "Synced",
                value = dashboard?.orders?.synced ?: 0
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            StatisticCard(
                modifier = Modifier.weight(1f),
                title = "Low stock",
                value = lowStockCount
            )
            StatisticCard(
                modifier = Modifier.weight(1f),
                title = "Out of stock",
                value = outOfStockCount
            )
        }

        OutlinedButton(
            onClick = onOpenInventory,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Open inventory")
        }

        Button(
            onClick = onSyncPending,
            modifier = Modifier.fillMaxWidth(),
            enabled = !state.loading
        ) {
            Icon(Icons.Default.Sync, contentDescription = null)
            Text(
                text = if (state.isOnline) " Sync pending orders" else " Queue sync for later"
            )
        }

        OutlinedButton(
            onClick = onOpenOrders,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Open sales orders")
        }

        OutlinedButton(
            onClick = onRefresh,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Refresh")
        }

        state.error?.let {
            Text(it, color = MaterialTheme.colorScheme.error)
        }
    }
}

@Composable
private fun NetworkStatusCard(
    isOnline: Boolean,
    localPendingOrders: Int
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                imageVector = if (isOnline) Icons.Default.CloudDone else Icons.Default.CloudOff,
                contentDescription = null,
                tint = if (isOnline) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
            )
            Column {
                Text(
                    text = if (isOnline) "Online" else "Offline",
                    style = MaterialTheme.typography.titleMedium
                )
                Text(
                    text = when {
                        !isOnline -> "Orders can be saved locally and synced later."
                        localPendingOrders > 0 -> "$localPendingOrders local order(s) waiting to sync."
                        else -> "All local orders are synced."
                    },
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }
    }
}

@Composable
private fun StatisticCard(
    modifier: Modifier = Modifier,
    title: String,
    value: Int
) {
    Card(modifier = modifier) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(title)
            Text(value.toString(), style = MaterialTheme.typography.headlineMedium)
        }
    }
}

@Composable
private fun StatusCard(title: String, value: String) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(title)
            Text(value, style = MaterialTheme.typography.titleLarge)
        }
    }
}
