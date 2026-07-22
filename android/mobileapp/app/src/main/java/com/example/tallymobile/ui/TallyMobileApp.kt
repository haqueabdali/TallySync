package com.example.tallymobile.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument

@Composable
fun TallyMobileApp(
    appViewModel: AppViewModel = viewModel()
) {
    val navController = rememberNavController()
    val state = appViewModel.uiState.collectAsStateWithLifecycle().value

    NavHost(
        navController = navController,
        startDestination = "dashboard"
    ) {
        composable("dashboard") {
            LaunchedEffect(Unit) {
                appViewModel.loadDashboard()
            }

            DashboardScreen(
                state = state,
                onRefresh = appViewModel::loadDashboard,
                onOpenOrders = {
                    navController.navigate("orders")
                },
                onSyncPending = appViewModel::syncPending
            )
        }

        composable("orders") {
            LaunchedEffect(Unit) {
                appViewModel.loadOrders()
            }

            OrdersScreen(
                state = state,
                onSelectFilter = appViewModel::loadOrders,
                onOpenOrder = { id ->
                    navController.navigate("orders/$id")
                }
            )
        }

        composable(
            route = "orders/{id}",
            arguments = listOf(
                navArgument("id") {
                    type = NavType.StringType
                }
            )
        ) { entry ->
            val id = entry.arguments?.getString("id").orEmpty()

            LaunchedEffect(id) {
                appViewModel.loadOrder(id)
            }

            OrderDetailsScreen(
                state = state,
                onSync = appViewModel::syncOrder,
                onRetry = appViewModel::retryOrder
            )
        }
    }
}
