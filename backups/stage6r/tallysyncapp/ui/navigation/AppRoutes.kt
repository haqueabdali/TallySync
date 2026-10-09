package com.example.tallysyncapp.ui.navigation

sealed class AppRoute(val route: String) {
    data object Dashboard : AppRoute("dashboard")

    data object Customers : AppRoute("customers")
    data object CustomerForm : AppRoute("customers/new")

    data object CustomerEdit : AppRoute("customers/{id}/edit") {
        fun createRoute(id: String): String = "customers/$id/edit"
    }

    data object CustomerPicker : AppRoute("customers/select")

    data object CustomerDetails : AppRoute("customers/{id}") {
        fun createRoute(id: String): String = "customers/$id"
    }

    data object Suppliers : AppRoute("suppliers")

    data object SupplierForm : AppRoute("suppliers/new")

    data object SupplierEdit : AppRoute("suppliers/{id}/edit") {
        fun createRoute(id: String): String = "suppliers/$id/edit"
    }

    data object SupplierDetails : AppRoute("suppliers/{id}") {
        fun createRoute(id: String): String = "suppliers/$id"
    }

    data object Products : AppRoute("products")
    data object ProductForm : AppRoute("products/new")

    data object ProductEdit : AppRoute("products/{id}/edit") {
        fun createRoute(id: String): String = "products/$id/edit"
    }

    data object ProductDetails : AppRoute("products/{id}") {
        fun createRoute(id: String): String = "products/$id"
    }

    data object BarcodeScanner : AppRoute("products/scanner")

    data object NewOrder : AppRoute("new-order")
    data object Cart : AppRoute("cart")
    data object ReviewOrder : AppRoute("review-order")
    data object OrderSuccess : AppRoute("order-success")
    data object Orders : AppRoute("orders")
        data object PurchaseOrders : AppRoute("purchase-orders")

    data object PurchaseOrderForm : AppRoute("purchase-orders/new")

    data object PurchaseOrderDetails : AppRoute("purchase-orders/{id}") {
        fun createRoute(id: String): String = "purchase-orders/$id"
    }

    data object PurchaseOrderEdit : AppRoute("purchase-orders/{id}/edit") {
        fun createRoute(id: String): String = "purchase-orders/$id/edit"
    }
    data object GoodsReceipts : AppRoute("goods-receipts")

    data object GoodsReceiptForm :
        AppRoute("purchase-orders/{purchaseOrderId}/receive") {
        fun createRoute(purchaseOrderId: String): String =
            "purchase-orders/$purchaseOrderId/receive"
    }

    data object GoodsReceiptDetails :
        AppRoute("goods-receipts/{id}") {
        fun createRoute(id: String): String =
            "goods-receipts/$id"
    }

    data object Reports : AppRoute("reports")
    data object Settings : AppRoute("settings")

    data object OrderDetails : AppRoute("orders/{id}") {
        fun createRoute(id: String): String = "orders/$id"
    }


    // Stage 6N - Purchase Invoices

    data object PurchaseInvoices :
        AppRoute("purchase-invoices")

    data object PurchaseInvoiceForm :
        AppRoute("purchase-invoices/new")

    data object PurchaseInvoiceDetails :
        AppRoute("purchase-invoices/{id}") {
        fun createRoute(id: String): String =
            "purchase-invoices/$id"
    }

    data object PurchaseInvoiceEdit :
        AppRoute("purchase-invoices/{id}/edit") {
        fun createRoute(id: String): String =
            "purchase-invoices/$id/edit"
    }

    // Stage 6N - Supplier Payments

    data object SupplierPayments :
        AppRoute("supplier-payments")

    data object SupplierPaymentForm :
        AppRoute("supplier-payments/new")

    data object SupplierPaymentForInvoice :
        AppRoute("purchase-invoices/{invoiceId}/payment") {
        fun createRoute(invoiceId: String): String =
            "purchase-invoices/$invoiceId/payment"
    }

    data object SupplierPaymentDetails :
        AppRoute("supplier-payments/{id}") {
        fun createRoute(id: String): String =
            "supplier-payments/$id"
    }


    // Stage 6Q - Sales Invoices

    data object SalesInvoices :
        AppRoute("sales-invoices")

    data object SalesInvoiceForm :
        AppRoute("sales-invoices/new")

    data object SalesInvoiceDetails :
        AppRoute("sales-invoices/{id}") {
        fun createRoute(id: String): String =
            "sales-invoices/$id"
    }
}