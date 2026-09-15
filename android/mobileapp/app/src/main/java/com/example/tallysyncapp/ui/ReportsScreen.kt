package com.example.tallysyncapp.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
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
import com.example.tallysyncapp.data.network.AgingBuckets
import com.example.tallysyncapp.data.network.StatementTransaction
import com.example.tallysyncapp.report.ReportRange
import com.example.tallysyncapp.report.SalesReportSummary
import java.text.NumberFormat
import java.time.format.DateTimeFormatter
import java.util.Locale

private data class ReportTab(val id: String, val label: String)

private val accountingReportTabs = listOf(
    ReportTab("sales", "Sales"),
    ReportTab("ar", "A/R Aging"),
    ReportTab("ap", "A/P Aging"),
    ReportTab("customer", "Customer Statement"),
    ReportTab("supplier", "Supplier Statement")
)

@Composable
fun ReportsScreen(
    state: AppUiState,
    summary: SalesReportSummary,
    onRangeSelected: (ReportRange) -> Unit,
    onRefresh: () -> Unit,
    onRefreshAccounting: () -> Unit,
    onReportTabSelected: (String) -> Unit,
    onCustomerStatementSelected: (String) -> Unit,
    onSupplierStatementSelected: (String) -> Unit,
    onExportCsv: () -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Reports & analytics", style = MaterialTheme.typography.headlineMedium)
        }

        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(accountingReportTabs, key = { it.id }) { tab ->
                    FilterChip(
                        selected = state.reportTab == tab.id,
                        onClick = { onReportTabSelected(tab.id) },
                        label = { Text(tab.label) }
                    )
                }
            }
        }

        if (state.accountingReportsLoading) {
            item { CircularProgressIndicator() }
        }

        when (state.reportTab) {
            "ar" -> agedReceivablesContent(state, onRefreshAccounting)
            "ap" -> agedPayablesContent(state, onRefreshAccounting)
            "customer" -> customerStatementContent(state, onCustomerStatementSelected)
            "supplier" -> supplierStatementContent(state, onSupplierStatementSelected)
            else -> salesContent(state, summary, onRangeSelected, onRefresh, onExportCsv)
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.salesContent(
    state: AppUiState,
    summary: SalesReportSummary,
    onRangeSelected: (ReportRange) -> Unit,
    onRefresh: () -> Unit,
    onExportCsv: () -> Unit
) {
    val currency = NumberFormat.getCurrencyInstance(Locale.US)

    item {
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(ReportRange.entries) { range ->
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
        return
    }

    item {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            MoneyMetricCard(Modifier.weight(1f), "Revenue", currency.format(summary.revenue))
            MoneyMetricCard(Modifier.weight(1f), "Average order", currency.format(summary.averageOrder))
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
                if (summary.dailySales.isEmpty()) Text("No dated orders are available for this period.")
                else SalesBarChart(summary)
            }
        }
    }

    item { Text("Top customers", style = MaterialTheme.typography.titleLarge) }
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
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = onRefresh, modifier = Modifier.weight(1f)) { Text("Refresh") }
            Button(
                onClick = onExportCsv,
                enabled = state.reportOrders.isNotEmpty(),
                modifier = Modifier.weight(1f)
            ) { Text("Export CSV") }
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.agedReceivablesContent(
    state: AppUiState,
    onRefresh: () -> Unit
) {
    val report = state.agedReceivables
    item {
        ReportHeader("Aged receivables", report?.asOfDate, onRefresh)
    }
    if (report == null) {
        item { Text("No aged receivables report loaded.") }
        return
    }
    item { AgingBucketGrid(report.totals) }
    if (report.customers.isEmpty()) {
        item { Text("No outstanding customer receivables.") }
    } else {
        items(report.customers, key = { "${it.customerId}:${it.currency}" }) { customer ->
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(customer.customerName, style = MaterialTheme.typography.titleMedium)
                    Text("Outstanding: ${money(customer.buckets.total, customer.currency)}")
                    customer.invoices.forEach { invoice ->
                        HorizontalDivider()
                        Text("${invoice.invoiceNumber} · ${money(invoice.outstandingAmount, customer.currency)}")
                        Text(
                            "Due ${invoice.dueDate ?: invoice.invoiceDate} · ${invoice.daysPastDue} days · ${bucketLabel(invoice.bucket)}",
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            }
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.agedPayablesContent(
    state: AppUiState,
    onRefresh: () -> Unit
) {
    val report = state.agedPayables
    item { ReportHeader("Aged payables", report?.asOfDate, onRefresh) }
    if (report == null) {
        item { Text("No aged payables report loaded.") }
        return
    }
    item { AgingBucketGrid(report.totals) }
    if (report.suppliers.isEmpty()) {
        item { Text("No outstanding supplier payables.") }
    } else {
        items(report.suppliers, key = { "${it.supplierId}:${it.currency}" }) { supplier ->
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(supplier.supplierName, style = MaterialTheme.typography.titleMedium)
                    Text("Outstanding: ${money(supplier.buckets.total, supplier.currency)}")
                    supplier.invoices.forEach { invoice ->
                        HorizontalDivider()
                        Text("${invoice.invoiceNumber} · ${money(invoice.outstandingAmount, supplier.currency)}")
                        Text(
                            "Due ${invoice.dueDate ?: invoice.invoiceDate} · ${invoice.daysPastDue} days · ${bucketLabel(invoice.bucket)}",
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            }
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.customerStatementContent(
    state: AppUiState,
    onCustomerSelected: (String) -> Unit
) {
    item { Text("Customer statement", style = MaterialTheme.typography.titleLarge) }
    item {
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(state.customers, key = { it.id }) { customer ->
                FilterChip(
                    selected = state.statementCustomerId == customer.id,
                    onClick = { onCustomerSelected(customer.id) },
                    label = { Text(customer.name) }
                )
            }
        }
    }
    val report = state.customerStatement
    if (report == null) {
        item { Text("Choose a customer to load the last 12 months of activity.") }
        return
    }
    item {
        StatementSummary(
            partyName = report.customerName,
            currency = report.currency,
            dateFrom = report.dateFrom,
            dateTo = report.dateTo,
            opening = report.openingBalance,
            debits = report.periodDebits,
            credits = report.periodCredits,
            closing = report.closingBalance
        )
    }
    statementTransactions(report.transactions, report.currency)
}

private fun androidx.compose.foundation.lazy.LazyListScope.supplierStatementContent(
    state: AppUiState,
    onSupplierSelected: (String) -> Unit
) {
    item { Text("Supplier statement", style = MaterialTheme.typography.titleLarge) }
    item {
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(state.suppliers, key = { it.id }) { supplier ->
                FilterChip(
                    selected = state.statementSupplierId == supplier.id,
                    onClick = { onSupplierSelected(supplier.id) },
                    label = { Text(supplier.name) }
                )
            }
        }
    }
    val report = state.supplierStatement
    if (report == null) {
        item { Text("Choose a supplier to load the last 12 months of activity.") }
        return
    }
    item {
        StatementSummary(
            partyName = report.supplierName,
            currency = report.currency,
            dateFrom = report.dateFrom,
            dateTo = report.dateTo,
            opening = report.openingBalance,
            debits = report.periodDebits,
            credits = report.periodCredits,
            closing = report.closingBalance
        )
    }
    statementTransactions(report.transactions, report.currency)
}

private fun androidx.compose.foundation.lazy.LazyListScope.statementTransactions(
    transactions: List<StatementTransaction>,
    currency: String
) {
    if (transactions.isEmpty()) {
        item { Text("No transactions in this statement period.") }
        return
    }
    items(transactions, key = { "${it.type}:${it.id}" }) { tx ->
        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(tx.documentNumber, style = MaterialTheme.typography.titleSmall)
                Text("${tx.date} · ${tx.description}", style = MaterialTheme.typography.bodySmall)
                Text("Debit ${money(tx.debit, currency)} · Credit ${money(tx.credit, currency)}")
                Text("Balance ${money(tx.runningBalance, currency)}", style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}

@Composable
private fun ReportHeader(title: String, asOfDate: String?, onRefresh: () -> Unit) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Column {
            Text(title, style = MaterialTheme.typography.titleLarge)
            if (asOfDate != null) Text("As of $asOfDate", style = MaterialTheme.typography.bodySmall)
        }
        OutlinedButton(onClick = onRefresh) { Text("Refresh") }
    }
}

@Composable
private fun AgingBucketGrid(buckets: AgingBuckets) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
            Text("Total ${money(buckets.total)}", style = MaterialTheme.typography.titleMedium)
            Text("Not yet due ${money(buckets.notYetDue)}")
            Text("1–30 days ${money(buckets.days1To30)}")
            Text("31–60 days ${money(buckets.days31To60)}")
            Text("61–90 days ${money(buckets.days61To90)}")
            Text("91–120 days ${money(buckets.days91To120)}")
            Text("Over 120 days ${money(buckets.over120Days)}")
        }
    }
}

@Composable
private fun StatementSummary(
    partyName: String,
    currency: String,
    dateFrom: String,
    dateTo: String,
    opening: Double,
    debits: Double,
    credits: Double,
    closing: Double
) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
            Text(partyName, style = MaterialTheme.typography.titleMedium)
            Text("$dateFrom — $dateTo", style = MaterialTheme.typography.bodySmall)
            Text("Opening ${money(opening, currency)}")
            Text("Debits ${money(debits, currency)}")
            Text("Credits ${money(credits, currency)}")
            Text("Closing ${money(closing, currency)}", style = MaterialTheme.typography.titleSmall)
        }
    }
}

private fun money(value: Double, currency: String = "EUR"): String =
    runCatching {
        NumberFormat.getCurrencyInstance(Locale.ITALY).apply {
            this.currency = java.util.Currency.getInstance(currency)
        }.format(value)
    }.getOrElse { "%.2f %s".format(value, currency) }

private fun bucketLabel(bucket: String): String = when (bucket) {
    "notYetDue" -> "Not yet due"
    "days1To30" -> "1–30 days"
    "days31To60" -> "31–60 days"
    "days61To90" -> "61–90 days"
    "days91To120" -> "91–120 days"
    "over120Days" -> "Over 120 days"
    else -> bucket
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
