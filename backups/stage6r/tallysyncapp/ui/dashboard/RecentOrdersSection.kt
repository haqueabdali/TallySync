package com.example.tallysyncapp.ui.dashboard

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.tallysyncapp.data.network.SalesOrderSummary

@Composable
fun RecentOrdersSection(
    orders: List<SalesOrderSummary>,
    onOpenOrder: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(
                horizontal = 16.dp,
                vertical = 16.dp
            ),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "Recent orders",
                style = MaterialTheme.typography.titleMedium
            )

            if (orders.isEmpty()) {
                Text(
                    text = "No recent orders.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                return@Column
            }

            orders.forEachIndexed { index, order ->

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .then(
                            if (onOpenOrder != null) {
                                Modifier.clickable {
                                    onOpenOrder()
                                }
                            } else {
                                Modifier
                            }
                        ),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = order.orderNumber,
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.SemiBold
                        )

                        Text(
                            text = dashboardMoney(order.grandTotal),
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.SemiBold
                        )
                    }

                    Text(
                        text = order.customerName,
                        style = MaterialTheme.typography.bodyMedium
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = order.orderDate ?: "Date unavailable",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        Text(
                            text = formatSyncStatus(order.syncStatus),
                            style = MaterialTheme.typography.labelMedium,
                            color = syncStatusColor(order.syncStatus)
                        )
                    }
                }

                if (index < orders.lastIndex) {
                    HorizontalDivider()
                }
            }
        }
    }
}

@Composable
private fun syncStatusColor(status: String) =
    when (status.lowercase()) {
        "synced" ->
            MaterialTheme.colorScheme.primary

        "failed" ->
            MaterialTheme.colorScheme.error

        else ->
            MaterialTheme.colorScheme.tertiary
    }

private fun formatSyncStatus(status: String): String =
    when (status.lowercase()) {
        "synced" -> "Synced"
        "failed" -> "Failed"
        "pending" -> "Pending"
        else -> status.replaceFirstChar {
            if (it.isLowerCase()) it.titlecase() else it.toString()
        }
    }