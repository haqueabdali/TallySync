package com.example.tallysyncapp.report

import com.example.tallysyncapp.data.network.SalesOrderSummary
import java.time.Instant
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeParseException

enum class ReportRange(val label: String) {
    TODAY("Today"),
    LAST_7_DAYS("7 days"),
    LAST_30_DAYS("30 days"),
    ALL("All")
}

data class DailySalesPoint(
    val date: LocalDate,
    val revenue: Double,
    val orders: Int
)

data class CustomerSalesPoint(
    val customerName: String,
    val revenue: Double,
    val orders: Int
)

data class SalesReportSummary(
    val orders: Int = 0,
    val revenue: Double = 0.0,
    val averageOrder: Double = 0.0,
    val synced: Int = 0,
    val pending: Int = 0,
    val failed: Int = 0,
    val dailySales: List<DailySalesPoint> = emptyList(),
    val topCustomers: List<CustomerSalesPoint> = emptyList()
)

fun buildSalesReport(
    orders: List<SalesOrderSummary>,
    range: ReportRange,
    today: LocalDate = LocalDate.now()
): SalesReportSummary {
    val startDate = when (range) {
        ReportRange.TODAY -> today
        ReportRange.LAST_7_DAYS -> today.minusDays(6)
        ReportRange.LAST_30_DAYS -> today.minusDays(29)
        ReportRange.ALL -> null
    }

    val filtered = orders.filter { order ->
        val date = order.reportDate()
        startDate == null || (date != null && !date.isBefore(startDate) && !date.isAfter(today))
    }

    val revenue = filtered.sumOf { it.grandTotal }
    val daily = filtered
        .mapNotNull { order -> order.reportDate()?.let { it to order } }
        .groupBy({ it.first }, { it.second })
        .map { (date, dayOrders) ->
            DailySalesPoint(
                date = date,
                revenue = dayOrders.sumOf { it.grandTotal },
                orders = dayOrders.size
            )
        }
        .sortedBy { it.date }

    val customers = filtered
        .groupBy { it.customerName.ifBlank { "Unknown customer" } }
        .map { (name, customerOrders) ->
            CustomerSalesPoint(
                customerName = name,
                revenue = customerOrders.sumOf { it.grandTotal },
                orders = customerOrders.size
            )
        }
        .sortedByDescending { it.revenue }
        .take(5)

    return SalesReportSummary(
        orders = filtered.size,
        revenue = revenue,
        averageOrder = if (filtered.isEmpty()) 0.0 else revenue / filtered.size,
        synced = filtered.count { it.syncStatus.equals("synced", ignoreCase = true) },
        pending = filtered.count { it.syncStatus.equals("pending", ignoreCase = true) },
        failed = filtered.count { it.syncStatus.equals("failed", ignoreCase = true) },
        dailySales = daily,
        topCustomers = customers
    )
}

private fun SalesOrderSummary.reportDate(): LocalDate? {
    val raw = orderDate ?: createdAt ?: return null
    return parseDate(raw)
}

private fun parseDate(value: String): LocalDate? {
    return try {
        LocalDate.parse(value.take(10))
    } catch (_: DateTimeParseException) {
        try {
            OffsetDateTime.parse(value).toLocalDate()
        } catch (_: DateTimeParseException) {
            try {
                Instant.parse(value).atZone(ZoneId.systemDefault()).toLocalDate()
            } catch (_: DateTimeParseException) {
                null
            }
        }
    }
}
