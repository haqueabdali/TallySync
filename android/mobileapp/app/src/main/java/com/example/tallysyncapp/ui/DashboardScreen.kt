package com.example.tallysyncapp.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.tallysyncapp.ui.dashboard.DashboardActions
import com.example.tallysyncapp.ui.dashboard.DashboardKpiCard
import com.example.tallysyncapp.ui.dashboard.DashboardMetricIcon
import com.example.tallysyncapp.ui.dashboard.RecentOrdersSection
import com.example.tallysyncapp.ui.dashboard.SyncHealthSection
import com.example.tallysyncapp.ui.dashboard.TallyConnectionCard
import com.example.tallysyncapp.ui.dashboard.dashboardMoney

@Composable
fun DashboardScreen(
    state: AppUiState,
    onRefresh: () -> Unit,
    onOpenOrders: () -> Unit,
    onOpenReports: () -> Unit,
    onOpenSuppliers: () -> Unit,
    onSyncPending: () -> Unit,
    onRetryLocalOrders: () -> Unit,
    onOpenPurchaseOrders: () -> Unit,
) {
    val dashboard = state.dashboard

    val totalOrders = dashboard?.totalOrders ?: 0
    val pendingOrders = dashboard?.pendingSync ?: 0
    val failedOrders = dashboard?.failedSync ?: 0

    val syncedOrders = (
        totalOrders - pendingOrders - failedOrders
    ).coerceAtLeast(0)

    Column(
        modifier = Modifier
            .verticalScroll(rememberScrollState())
            .padding(
                horizontal = 16.dp,
                vertical = 14.dp
            ),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Column(
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = "Dashboard",
                style = MaterialTheme.typography.headlineMedium
            )

            Text(
                text = "Business overview, sales and synchronization",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        if (state.loading && dashboard == null) {
            CircularProgressIndicator()

            Text(
                text = "Loading dashboard…",
                style = MaterialTheme.typography.bodyMedium
            )

            return@Column
        }

        TallyConnectionCard(
            tally = dashboard?.tally
        )

        Text(
            text = "Today",
            style = MaterialTheme.typography.titleMedium
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            DashboardKpiCard(
                title = "Sales",
                value = dashboardMoney(
                    dashboard?.todaySales ?: 0.0
                ),
                supportingText = "Today's sales",
                icon = DashboardMetricIcon.SALES,
                modifier = Modifier.weight(1f)
            )

            DashboardKpiCard(
                title = "Orders",
                value = (
                    dashboard?.todayOrders ?: 0
                ).toString(),
                supportingText = "Created today",
                icon = DashboardMetricIcon.TOTAL,
                modifier = Modifier.weight(1f)
            )
        }

        Text(
            text = "Business overview",
            style = MaterialTheme.typography.titleMedium
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            DashboardKpiCard(
                title = "Customers",
                value = (
                    dashboard?.totalCustomers ?: 0
                ).toString(),
                icon = DashboardMetricIcon.CUSTOMERS,
                modifier = Modifier.weight(1f)
            )

            DashboardKpiCard(
                title = "Products",
                value = (
                    dashboard?.totalProducts ?: 0
                ).toString(),
                icon = DashboardMetricIcon.PRODUCTS,
                modifier = Modifier.weight(1f)
            )
        }

        DashboardKpiCard(
            title = "Low stock",
            value = (
                dashboard?.lowStockProducts ?: 0
            ).toString(),
            supportingText =
                "Products currently at or below their configured minimum stock",
            icon = DashboardMetricIcon.LOW_STOCK
        )

        Text(
            text = "Sales overview",
            style = MaterialTheme.typography.titleMedium
        )

        DashboardKpiCard(
            title = "Total sales",
            value = dashboardMoney(
                dashboard?.totalSales ?: 0.0
            ),
            supportingText =
                "Across orders currently reported by the backend",
            icon = DashboardMetricIcon.SALES
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            DashboardKpiCard(
                title = "Total orders",
                value = totalOrders.toString(),
                icon = DashboardMetricIcon.TOTAL,
                modifier = Modifier.weight(1f)
            )

            DashboardKpiCard(
                title = "Synced",
                value = syncedOrders.toString(),
                icon = DashboardMetricIcon.SYNCED,
                modifier = Modifier.weight(1f)
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            DashboardKpiCard(
                title = "Pending",
                value = pendingOrders.toString(),
                icon = DashboardMetricIcon.PENDING,
                modifier = Modifier.weight(1f)
            )

            DashboardKpiCard(
                title = "Failed",
                value = failedOrders.toString(),
                icon = DashboardMetricIcon.FAILED,
                modifier = Modifier.weight(1f)
            )
        }

        SyncHealthSection(
            total = totalOrders,
            synced = syncedOrders,
            pending = pendingOrders,
            failed = failedOrders
        )

        RecentOrdersSection(
            orders = dashboard?.recentOrders.orEmpty()
        )

        Card(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(
                    text = "Offline upload queue",
                    style = MaterialTheme.typography.titleMedium
                )

                Text(
                    text =
                        "${state.localPendingOrders} local order(s) waiting",
                    style = MaterialTheme.typography.headlineSmall
                )

                Text(
                    text =
                        "Offline orders are uploaded to the backend first. " +
                            "Tally synchronization remains a separate controlled action.",
                    style = MaterialTheme.typography.bodySmall,
                    color =
                        MaterialTheme.colorScheme.onSurfaceVariant
                )

                if (state.localPendingOrders > 0) {
                    Button(
                        onClick = onRetryLocalOrders,
                        enabled = !state.loading,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(
                            imageVector = Icons.Default.CloudUpload,
                            contentDescription = null
                        )

                        Text(" Retry local uploads")
                    }
                }
            }
        }

        HorizontalDivider()

        Text(
            text = "Quick actions",
            style = MaterialTheme.typography.titleMedium
        )

        DashboardActions(
            loading = state.loading,
            canSyncPending = pendingOrders > 0,
            onSyncPending = onSyncPending,
            onOpenOrders = onOpenOrders,
            onOpenSuppliers = onOpenSuppliers,
            onOpenPurchaseOrders = onOpenPurchaseOrders,
            onOpenReports = onOpenReports,
            onRefresh = onRefresh
        )

        state.error?.let { message ->
            Card(
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = message,
                    modifier = Modifier.padding(16.dp),
                    color = MaterialTheme.colorScheme.error
                )
            }
        }
    }
}