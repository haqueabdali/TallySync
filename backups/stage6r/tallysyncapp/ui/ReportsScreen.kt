package com.example.tallysyncapp.ui

import androidx.compose.foundation.Canvas
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
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.unit.dp
import com.example.tallysyncapp.report.ReportRange
import com.example.tallysyncapp.report.SalesReportSummary
import java.text.NumberFormat
import java.time.format.DateTimeFormatter
import java.util.Locale

@Composable
fun ReportsScreen(
    state: AppUiState,
    summary: SalesReportSummary,
    onRangeSelected: (ReportRange) -> Unit,
    onRefresh: () -> Unit,
    onExportCsv: () -> Unit
) {
    val currency = NumberFormat.getCurrencyInstance(Locale.US)

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Reports & analytics", style = MaterialTheme.typography.headlineMedium)
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                ReportRange.entries.forEach { range ->
                    FilterChip(
                        selected = state.reportRange == range,
                        onClick = { onRangeSelected(range) },
                        label = { Text(range.label) }
                    )
                }
            }
        }

        if (state.loading && state.reportOrders.isEmpty()) {
            item { CircularProgressIndicator() }
        } else {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    MoneyMetricCard(
                        modifier = Modifier.weight(1f),
                        title = "Revenue",
                        value = currency.format(summary.revenue)
                    )
                    MoneyMetricCard(
                        modifier = Modifier.weight(1f),
                        title = "Average order",
                        value = currency.format(summary.averageOrder)
                    )
                }
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    CountMetricCard(Modifier.weight(1f), "Orders", summary.orders)
                    CountMetricCard(Modifier.weight(1f), "Synced", summary.synced)
                    CountMetricCard(Modifier.weight(1f), "Pending", summary.pending)
                    CountMetricCard(Modifier.weight(1f), "Failed", summary.failed)
                }
            }

            item {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Sales trend", style = MaterialTheme.typography.titleLarge)
                        Spacer(Modifier.height(12.dp))
                        if (summary.dailySales.isEmpty()) {
                            Text("No dated orders are available for this period.")
                        } else {
                            SalesBarChart(summary)
                        }
                    }
                }
            }

            item {
                Text("Top customers", style = MaterialTheme.typography.titleLarge)
            }

            if (summary.topCustomers.isEmpty()) {
                item { Text("No customer sales are available for this period.") }
            } else {
                items(summary.topCustomers, key = { it.customerName }) { customer ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text(customer.customerName, style = MaterialTheme.typography.titleMedium)
                                Text("${customer.orders} order${if (customer.orders == 1) "" else "s"}")
                            }
                            Text(currency.format(customer.revenue), style = MaterialTheme.typography.titleMedium)
                        }
                    }
                }
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(onClick = onRefresh, modifier = Modifier.weight(1f)) {
                        Text("Refresh")
                    }
                    Button(
                        onClick = onExportCsv,
                        enabled = state.reportOrders.isNotEmpty(),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Export CSV")
                    }
                }
            }

            item {
                Text(
                    "Report calculations use all sales-order pages returned by your current API.",
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}

@Composable
private fun MoneyMetricCard(modifier: Modifier, title: String, value: String) {
    Card(modifier = modifier) {
        Column(Modifier.padding(16.dp)) {
            Text(title, style = MaterialTheme.typography.labelLarge)
            Text(value, style = MaterialTheme.typography.titleLarge)
        }
    }
}

@Composable
private fun CountMetricCard(modifier: Modifier, title: String, value: Int) {
    Card(modifier = modifier) {
        Column(Modifier.padding(10.dp)) {
            Text(title, style = MaterialTheme.typography.labelSmall)
            Text(value.toString(), style = MaterialTheme.typography.titleMedium)
        }
    }
}

@Composable
private fun SalesBarChart(summary: SalesReportSummary) {
    val points = summary.dailySales.takeLast(14)
    val maxValue = points.maxOfOrNull { it.revenue }?.coerceAtLeast(1.0) ?: 1.0
    val barColor = MaterialTheme.colorScheme.primary
    val textColor = MaterialTheme.colorScheme.onSurface

    Canvas(modifier = Modifier.fillMaxWidth().height(220.dp)) {
        val chartHeight = size.height - 36.dp.toPx()
        val slot = size.width / points.size
        val barWidth = slot * 0.58f

        points.forEachIndexed { index, point ->
            val height = (point.revenue / maxValue * chartHeight).toFloat()
            val left = index * slot + (slot - barWidth) / 2f
            drawRect(
                color = barColor,
                topLeft = Offset(left, chartHeight - height),
                size = Size(barWidth, height)
            )
            drawContext.canvas.nativeCanvas.drawText(
                point.date.format(DateTimeFormatter.ofPattern("MM/dd")),
                left,
                size.height - 8.dp.toPx(),
                android.graphics.Paint().apply {
                    color = textColor.toArgbCompat()
                    textSize = 10.dp.toPx()
                    isAntiAlias = true
                }
            )
        }
    }
}

private fun Color.toArgbCompat(): Int =
    android.graphics.Color.argb(
        (alpha * 255).toInt(),
        (red * 255).toInt(),
        (green * 255).toInt(),
        (blue * 255).toInt()
    )
