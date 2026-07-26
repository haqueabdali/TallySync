package com.example.tallymobile.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.example.tallymobile.ui.navigation.AppBottomBar
import com.example.tallymobile.ui.navigation.AppRoute

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TallyMobileApp(
    appViewModel: AppViewModel = viewModel()
) {
    val navController = rememberNavController()
    val state by appViewModel.uiState.collectAsStateWithLifecycle()

    val snackbarHostState = remember {
        SnackbarHostState()
    }

    val currentBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = currentBackStackEntry?.destination
    val currentRoute = currentDestination?.route

    val bottomBarRoutes = setOf(
        AppRoute.Dashboard.route,
        AppRoute.Customers.route,
        AppRoute.Products.route,
        AppRoute.Orders.route,
        AppRoute.Settings.route
    )

    val showBottomBar = currentRoute in bottomBarRoutes

    val showNewOrderButton = currentRoute in setOf(
        AppRoute.Dashboard.route,
        AppRoute.Customers.route,
        AppRoute.Products.route,
        AppRoute.Orders.route
    )

    LaunchedEffect(state.message) {
        val message = state.message

        if (!message.isNullOrBlank()) {
            snackbarHostState.showSnackbar(message)
            appViewModel.clearMessage()
        }
    }

    LaunchedEffect(state.error) {
        val error = state.error

        if (!error.isNullOrBlank()) {
            snackbarHostState.showSnackbar(error)
        }
    }

    Scaffold(
        snackbarHost = {
            SnackbarHost(snackbarHostState)
        },
        bottomBar = {
            if (showBottomBar) {
                AppBottomBar(
                    navController = navController,
                    currentDestination = currentDestination
                )
            }
        },
        floatingActionButton = {
            if (showNewOrderButton) {
                FloatingActionButton(
                    onClick = {
                        navController.navigate(AppRoute.NewOrder.route)
                    }
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = "Create new order"
                    )
                }
            }
        }
    ) { innerPadding ->

        NavHost(
            navController = navController,
            startDestination = AppRoute.Dashboard.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(AppRoute.Dashboard.route) {
                LaunchedEffect(Unit) {
                    appViewModel.loadDashboard()
                }

                DashboardScreen(
                    state = state,
                    onRefresh = appViewModel::loadDashboard,
                    onOpenOrders = {
                        navController.navigate(AppRoute.Orders.route)
                    },
                    onSyncPending = appViewModel::syncPending
                )
            }

            composable(AppRoute.Customers.route) {
    LaunchedEffect(Unit) {
        appViewModel.loadCustomers()
    }

    CustomersScreen(
        state = state,
        onSearchChange = appViewModel::updateCustomerSearch,
        onSearch = appViewModel::loadCustomers,
        onCustomerClick = { customer ->
            appViewModel.selectCustomer(customer)

            navController.navigate(
                AppRoute.NewOrder.route
            )
        }
    )
}

composable(AppRoute.Cart.route) {
    CartScreen(
        state = state,
        onIncrease = appViewModel::increaseCartQuantity,
        onDecrease = appViewModel::decreaseCartQuantity,
        onRemove = appViewModel::removeCartItem,
        onAddMoreProducts = {
            navController.navigate(AppRoute.Products.route)
        },
        onContinue = {
            navController.navigate(AppRoute.ReviewOrder.route)
        }
    )
}

composable(AppRoute.ReviewOrder.route) {
    ReviewOrderScreen(
        state = state,
        onNotesChange = appViewModel::updateOrderNotes,
        onBackToCart = {
            navController.popBackStack()
        },
        onSubmit = {
            appViewModel.submitSalesOrder(
                onSuccess = {
                    navController.navigate(
                        AppRoute.OrderSuccess.route
                    ) {
                        popUpTo(AppRoute.NewOrder.route) {
                            inclusive = true
                        }
                    }
                }
            )
        }
    )
}

composable(AppRoute.OrderSuccess.route) {
    OrderSuccessScreen(
        state = state,
        onViewOrders = {
            appViewModel.clearNewOrder()

            navController.navigate(AppRoute.Orders.route) {
                popUpTo(AppRoute.Dashboard.route)
                launchSingleTop = true
            }
        },
        onCreateAnotherOrder = {
            appViewModel.clearNewOrder()

            navController.navigate(AppRoute.NewOrder.route) {
                popUpTo(AppRoute.Dashboard.route)
            }
        }
    )
}


            composable(AppRoute.Orders.route) {
                LaunchedEffect(Unit) {
                    appViewModel.loadOrders()
                }

                OrdersScreen(
                    state = state,
                    onSelectFilter = appViewModel::loadOrders,
                    onOpenOrder = { orderId ->
                        navController.navigate(
                            AppRoute.OrderDetails.createRoute(orderId)
                        )
                    }
                )
            }

            composable(AppRoute.Settings.route) {
                SettingsScreen(
                    onRefreshDashboard = appViewModel::loadDashboard
                )
            }

            composable(AppRoute.NewOrder.route) {
    NewOrderScreen(
        selectedCustomer = state.selectedCustomer,
        onSelectCustomer = {
            navController.navigate(AppRoute.Customers.route)
        },
        onContinue = {
            navController.navigate(AppRoute.Products.route)
        },
        onCancel = {
            appViewModel.clearSelectedCustomer()
            navController.popBackStack()
        }
    )
}

            composable(
                route = AppRoute.OrderDetails.route,
                arguments = listOf(
                    navArgument("id") {
                        type = NavType.StringType
                    }
                )
            ) { entry ->

                val orderId = entry.arguments
                    ?.getString("id")
                    .orEmpty()

                LaunchedEffect(orderId) {
                    appViewModel.loadOrder(orderId)
                }

                OrderDetailsScreen(
                    state = state,
                    onSync = appViewModel::syncOrder,
                    onRetry = appViewModel::retryOrder
                )
            }
        }
    }
}