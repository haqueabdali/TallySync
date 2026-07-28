package com.example.tallysyncapp.ui.navigation

sealed class AppRoute(val route: String) {
    data object Dashboard : AppRoute("dashboard")
    data object Customers : AppRoute("customers")
    data object CustomerPicker : AppRoute("customers/select")
    data object CustomerDetails : AppRoute("customers/{id}") {
        fun createRoute(id: String): String = "customers/$id"
    }
    data object Products : AppRoute("products")
    data object NewOrder : AppRoute("new-order")
    data object Cart : AppRoute("cart")
    data object ReviewOrder : AppRoute("review-order")
    data object OrderSuccess : AppRoute("order-success")
    data object Orders : AppRoute("orders")
    data object Settings : AppRoute("settings")
    data object OrderDetails : AppRoute("orders/{id}") {
        fun createRoute(id: String): String = "orders/$id"
    }
}
