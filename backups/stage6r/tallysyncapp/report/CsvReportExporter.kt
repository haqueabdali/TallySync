package com.example.tallysyncapp.report

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import com.example.tallysyncapp.data.network.SalesOrderSummary
import java.io.File
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

object CsvReportExporter {
    fun createCsv(context: Context, orders: List<SalesOrderSummary>): File {
        val directory = File(context.cacheDir, "reports").apply { mkdirs() }
        val timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss"))
        val file = File(directory, "sales-report-$timestamp.csv")

        file.bufferedWriter().use { writer ->
            writer.appendLine("Order Number,Date,Customer,Status,Sync Status,Grand Total")
            orders.forEach { order ->
                writer.appendLine(
                    listOf(
                        order.orderNumber,
                        order.orderDate ?: order.createdAt.orEmpty(),
                        order.customerName,
                        order.status,
                        order.syncStatus,
                        "%.2f".format(java.util.Locale.US, order.grandTotal)
                    ).joinToString(",") { csvCell(it) }
                )
            }
        }
        return file
    }

    fun shareCsv(context: Context, file: File) {
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file
        )
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/csv"
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, "Share sales report"))
    }

    private fun csvCell(value: String): String =
        "\"${value.replace("\"", "\"\"")}\""
}
