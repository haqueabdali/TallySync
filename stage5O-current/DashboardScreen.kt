package com.example.tallysyncapp.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import java.text.NumberFormat

@Composable
fun DashboardScreen(
    state: AppUiState,
    onRefresh: () -> Unit,
    onOpenOrders: () -> Unit,
    onOpenReports: () -> Unit,
    onOpenSuppliers: () -> Unit,
    onSyncPending: () -> Unit
) {
    Column(
        modifier = Modifier.padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = "Dashboard",
            style = MaterialTheme.typography.headlineMedium
        )

        if (state.loading && state.dashboard == null) {
            CircularProgressIndicator()
            return@Column
        }

        val dashboard = state.dashboard
        val syncedOrders = ((dashboard?.totalOrders ?: 0) -
            (dashboard?.pendingSync ?: 0) -
            (dashboard?.failedSync ?: 0)).coerceAtLeast(0)

        StatusCard(
            title = "Tally",
            value = if (dashboard?.tally?.connected == true) {
                "Connected"
            } else {
                "Disconnected"
            }
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            StatisticCard(
                modifier = Modifier.weight(1f),
                title = "Pending",
                value = dashboard?.pendingSync ?: 0
            )
            StatisticCard(
                modifier = Modifier.weight(1f),
                title = "Failed",
                value = dashboard?.failedSync ?: 0
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            StatisticCard(
                modifier = Modifier.weight(1f),
                title = "Synced",
                value = syncedOrders
            )
            StatisticCard(
                modifier = Modifier.weight(1f),
                title = "Total",
                value = dashboard?.totalOrders ?: 0
            )
        }

        MoneyCard(
            title = "Total sales",
            value = dashboard?.totalSales ?: 0.0
        )

        Button(
            onClick = onSyncPending,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Sync pending orders")
        }

        Button(
            onClick = onOpenOrders,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Open sales orders")
        }

        Button(
            onClick = onOpenSuppliers,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Suppliers & purchasing")
        }

        Button(
            onClick = onOpenReports,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Reports & analytics")
        }

        Button(
            onClick = onRefresh,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Refresh")
        }

        state.error?.let { message ->
            Text(
                text = message,
                color = MaterialTheme.colorScheme.error
            )
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
            Text(
                text = value.toString(),
                style = MaterialTheme.typography.headlineMedium
            )
        }
    }
}

@Composable
private fun MoneyCard(
    title: String,
    value: Double
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(title)
            Text(
                text = NumberFormat.getCurrencyInstance().format(value),
                style = MaterialTheme.typography.titleLarge
            )
        }
    }
}

@Composable
private fun StatusCard(
    title: String,
    value: String
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(title)
            Text(
                text = value,
                style = MaterialTheme.typography.titleLarge
            )
        }
    }
}
