package com.example.tallysyncapp.ui.dashboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.HourglassTop
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import java.text.NumberFormat

enum class DashboardMetricIcon {
    SALES,
    TOTAL,
    SYNCED,
    PENDING,
    FAILED,
    OFFLINE,
    CUSTOMERS,
    PRODUCTS,
    LOW_STOCK
}

@Composable
fun DashboardKpiCard(
    title: String,
    value: String,
    modifier: Modifier = Modifier,
    supportingText: String? = null,
    icon: DashboardMetricIcon = DashboardMetricIcon.TOTAL
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Icon(
                imageVector = metricIcon(icon),
                contentDescription = null,
                tint = when (icon) {
                    DashboardMetricIcon.FAILED,
                    DashboardMetricIcon.LOW_STOCK ->
                        MaterialTheme.colorScheme.error

                    else -> MaterialTheme.colorScheme.primary
                }
            )

            Text(
                text = title,
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Text(
                text = value,
                style = MaterialTheme.typography.headlineSmall
            )

            if (!supportingText.isNullOrBlank()) {
                Text(
                    text = supportingText,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

fun dashboardMoney(value: Double): String =
    NumberFormat.getCurrencyInstance().format(value)

private fun metricIcon(icon: DashboardMetricIcon): ImageVector =
    when (icon) {
        DashboardMetricIcon.SALES ->
            Icons.Default.AttachMoney

        DashboardMetricIcon.TOTAL ->
            Icons.Default.ReceiptLong

        DashboardMetricIcon.SYNCED ->
            Icons.Default.CheckCircle

        DashboardMetricIcon.PENDING ->
            Icons.Default.HourglassTop

        DashboardMetricIcon.FAILED ->
            Icons.Default.Error

        DashboardMetricIcon.OFFLINE ->
            Icons.Default.Sync

        DashboardMetricIcon.CUSTOMERS ->
            Icons.Default.People

        DashboardMetricIcon.PRODUCTS ->
            Icons.Default.Inventory2

        DashboardMetricIcon.LOW_STOCK ->
            Icons.Default.Warning
    }