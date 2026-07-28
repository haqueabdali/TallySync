package com.example.tallysyncapp.invoice

import android.content.Context
import android.content.Intent
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import androidx.core.content.FileProvider
import com.example.tallysyncapp.data.network.SalesOrderDetails
import java.io.File
import java.io.FileOutputStream
import java.text.NumberFormat
import java.util.Locale

object InvoicePdfGenerator {
    private const val PAGE_WIDTH = 595
    private const val PAGE_HEIGHT = 842
    private const val MARGIN = 40f

    fun createPdf(context: Context, order: SalesOrderDetails): File {
        val invoiceDirectory = File(context.cacheDir, "invoices").apply { mkdirs() }
        val safeOrderNumber = order.orderNumber.replace(Regex("[^A-Za-z0-9._-]"), "_")
        val outputFile = File(invoiceDirectory, "invoice_$safeOrderNumber.pdf")

        val document = PdfDocument()
        var pageNumber = 1
        var page = document.startPage(
            PdfDocument.PageInfo.Builder(PAGE_WIDTH, PAGE_HEIGHT, pageNumber).create()
        )
        var canvas = page.canvas
        var y = drawHeader(canvas, order)

        order.items.forEachIndexed { index, item ->
            if (y > PAGE_HEIGHT - 165f) {
                document.finishPage(page)
                pageNumber += 1
                page = document.startPage(
                    PdfDocument.PageInfo.Builder(PAGE_WIDTH, PAGE_HEIGHT, pageNumber).create()
                )
                canvas = page.canvas
                y = drawContinuationHeader(canvas, order, pageNumber)
            }

            val quantity = formatQuantity(item.quantity)
            val unit = item.unit.orEmpty()
            val unitPrice = money(item.unitPrice)
            val total = money(item.lineTotal)

            drawText(canvas, "${index + 1}. ${item.itemName}", MARGIN, y, 11f, bold = true)
            y += 17f
            drawText(
                canvas,
                "Qty: $quantity $unit   Unit price: $unitPrice   Total: $total",
                MARGIN + 12f,
                y,
                9.5f
            )
            item.sku?.takeIf { it.isNotBlank() }?.let { sku ->
                y += 15f
                drawText(canvas, "SKU: $sku", MARGIN + 12f, y, 9f)
            }
            y += 22f
            drawLine(canvas, y)
            y += 15f
        }

        if (y > PAGE_HEIGHT - 210f) {
            document.finishPage(page)
            pageNumber += 1
            page = document.startPage(
                PdfDocument.PageInfo.Builder(PAGE_WIDTH, PAGE_HEIGHT, pageNumber).create()
            )
            canvas = page.canvas
            y = drawContinuationHeader(canvas, order, pageNumber)
        }

        y += 5f
        y = drawAmountRow(canvas, "Subtotal", money(order.subtotal), y)
        if (order.discountTotal != 0.0) {
            y = drawAmountRow(canvas, "Discount", money(order.discountTotal), y)
        }
        if (order.taxTotal != 0.0) {
            y = drawAmountRow(canvas, "Tax", money(order.taxTotal), y)
        }
        y += 5f
        drawAmountRow(canvas, "Grand total", money(order.grandTotal), y, emphasized = true)

        order.notes?.takeIf { it.isNotBlank() }?.let { notes ->
            y += 48f
            drawText(canvas, "Notes", MARGIN, y, 11f, bold = true)
            y += 17f
            wrapText(canvas, notes, MARGIN, y, PAGE_WIDTH - (MARGIN * 2), 9.5f)
        }

        drawFooter(canvas, pageNumber)
        document.finishPage(page)

        FileOutputStream(outputFile).use { stream -> document.writeTo(stream) }
        document.close()
        return outputFile
    }

    fun sharePdf(context: Context, file: File) {
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file
        )

        val shareIntent = Intent(Intent.ACTION_SEND).apply {
            type = "application/pdf"
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }

        context.startActivity(
            Intent.createChooser(shareIntent, context.getString(com.example.tallysyncapp.R.string.share_invoice))
        )
    }

    private fun drawHeader(canvas: Canvas, order: SalesOrderDetails): Float {
        drawText(canvas, "TallySync", MARGIN, 56f, 22f, bold = true)
        drawText(canvas, "SALES ORDER / INVOICE", MARGIN, 82f, 13f, bold = true)
        drawText(canvas, "Order: ${order.orderNumber}", MARGIN, 108f, 10f)
        drawText(canvas, "Date: ${order.orderDate ?: order.createdAt.orEmpty()}", MARGIN, 125f, 10f)
        drawText(canvas, "Status: ${order.status}", MARGIN, 142f, 10f)
        drawText(canvas, "Sync: ${order.syncStatus}", MARGIN, 159f, 10f)

        drawText(canvas, "Bill to", 340f, 82f, 11f, bold = true)
        drawText(canvas, order.customer.name, 340f, 103f, 10f, bold = true)
        order.customer.phone?.takeIf { it.isNotBlank() }?.let {
            drawText(canvas, it, 340f, 120f, 9.5f)
        }
        order.customer.email?.takeIf { it.isNotBlank() }?.let {
            drawText(canvas, it, 340f, 137f, 9.5f)
        }
        order.customer.address?.takeIf { it.isNotBlank() }?.let {
            wrapText(canvas, it, 340f, 154f, 215f, 9f)
        }

        drawLine(canvas, 190f)
        drawText(canvas, "Items", MARGIN, 214f, 13f, bold = true)
        return 238f
    }

    private fun drawContinuationHeader(
        canvas: Canvas,
        order: SalesOrderDetails,
        pageNumber: Int
    ): Float {
        drawText(canvas, "TallySync", MARGIN, 52f, 18f, bold = true)
        drawText(canvas, "Order ${order.orderNumber} — page $pageNumber", MARGIN, 76f, 10f)
        drawLine(canvas, 92f)
        return 118f
    }

    private fun drawFooter(canvas: Canvas, pageNumber: Int) {
        drawLine(canvas, PAGE_HEIGHT - 48f)
        drawText(canvas, "Generated by TallySync", MARGIN, PAGE_HEIGHT - 28f, 8.5f)
        drawText(canvas, "Page $pageNumber", PAGE_WIDTH - 90f, PAGE_HEIGHT - 28f, 8.5f)
    }

    private fun drawAmountRow(
        canvas: Canvas,
        label: String,
        value: String,
        y: Float,
        emphasized: Boolean = false
    ): Float {
        drawText(canvas, label, 340f, y, if (emphasized) 12f else 10f, bold = emphasized)
        drawText(canvas, value, 455f, y, if (emphasized) 12f else 10f, bold = emphasized)
        return y + if (emphasized) 24f else 19f
    }

    private fun drawLine(canvas: Canvas, y: Float) {
        val paint = Paint().apply {
            strokeWidth = 1f
            color = android.graphics.Color.LTGRAY
        }
        canvas.drawLine(MARGIN, y, PAGE_WIDTH - MARGIN, y, paint)
    }

    private fun drawText(
        canvas: Canvas,
        text: String,
        x: Float,
        y: Float,
        size: Float,
        bold: Boolean = false
    ) {
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            textSize = size
            color = android.graphics.Color.BLACK
            typeface = if (bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
        }
        canvas.drawText(text, x, y, paint)
    }

    private fun wrapText(
        canvas: Canvas,
        text: String,
        x: Float,
        startY: Float,
        maxWidth: Float,
        size: Float
    ): Float {
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            textSize = size
            color = android.graphics.Color.BLACK
        }
        var y = startY
        var line = ""
        text.split(Regex("\\s+")).forEach { word ->
            val candidate = if (line.isBlank()) word else "$line $word"
            if (paint.measureText(candidate) > maxWidth && line.isNotBlank()) {
                canvas.drawText(line, x, y, paint)
                y += size + 4f
                line = word
            } else {
                line = candidate
            }
        }
        if (line.isNotBlank()) canvas.drawText(line, x, y, paint)
        return y
    }

    private fun money(value: Double): String =
        NumberFormat.getCurrencyInstance(Locale.US).format(value)

    private fun formatQuantity(value: Double): String =
        if (value % 1.0 == 0.0) value.toLong().toString() else "%.2f".format(Locale.US, value)
}
