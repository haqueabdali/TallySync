package com.example.tallysyncapp.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
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
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.example.tallysyncapp.ui.navigation.AppBottomBar
import com.example.tallysyncapp.ui.navigation.AppRoute

@Composable
fun TallyMobileApp(
    appViewModel: AppViewModel = hiltViewModel()
) {
    val navController = rememberNavController()

    val state by appViewModel.uiState.collectAsStateWithLifecycle()

    val snackbarHostState = remember {
        SnackbarHostState()
    }

    val currentBackStackEntry by navController.currentBackStackEntryAsState()

    val currentDestination: NavDestination? = currentBackStackEntry?.destination

    val currentRoute = currentDestination?.route

    val bottomBarRoutes = remember {
        setOf(
            AppRoute.Dashboard.route,
            AppRoute.Customers.route,
            AppRoute.Products.route,
            AppRoute.Orders.route,
            AppRoute.Settings.route
        )
    }

    val newOrderButtonRoutes = remember {
        setOf(
            AppRoute.Dashboard.route,
            AppRoute.Customers.route,
            AppRoute.Products.route,
            AppRoute.Orders.route
        )
    }

    val showBottomBar = currentRoute != null && currentRoute in bottomBarRoutes
    val showNewOrderButton =
        currentRoute != null && currentRoute in newOrderButtonRoutes

    LaunchedEffect(state.message) {
        val message = state.message

        if (!message.isNullOrBlank()) {
            snackbarHostState.showSnackbar(message)
            appViewModel.clearMessage()
        }
    }

    LaunchedEffect(state.error) {
        val errorMessage = state.error

        if (!errorMessage.isNullOrBlank()) {
            snackbarHostState.showSnackbar(errorMessage)
            appViewModel.clearError()
        }
    }

    Scaffold(
        snackbarHost = {
            SnackbarHost(
                hostState = snackbarHostState
            )
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
                        navController.navigate(
                            AppRoute.NewOrder.route
                        ) {
                            launchSingleTop = true
                        }
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

            /*
             * Dashboard
             */
            composable(
                route = AppRoute.Dashboard.route
            ) {
                LaunchedEffect(Unit) {
                    appViewModel.loadDashboard()
                }

                DashboardScreen(
                    state = state,
                    onRefresh = {
                        appViewModel.loadDashboard()
                    },
                    onOpenOrders = {
                        navController.navigate(
                            AppRoute.Orders.route
                        ) {
                            launchSingleTop = true
                        }
                    },
                    onSyncPending = {
                        appViewModel.syncPending()
                    }
                )
            }

            /*
             * Customers
             */
            composable(
                route = AppRoute.Customers.route
            ) {
                LaunchedEffect(Unit) {
                    appViewModel.loadCustomers()
                }

                CustomersScreen(
                    state = state,
                    onSearchChange = {
                        appViewModel.updateCustomerSearch(it)
                    },
                    onSearch = {
                        appViewModel.loadCustomers()
                    },
                    onCustomerClick = { customer ->
                        appViewModel.selectCustomer(customer)

                        navController.navigate(
                            AppRoute.NewOrder.route
                        ) {
                            launchSingleTop = true
                        }
                    }
                )
            }

            /*
             * New order
             */
            composable(
                route = AppRoute.NewOrder.route
            ) {
                NewOrderScreen(
                    selectedCustomer = state.selectedCustomer,
                    onSelectCustomer = {
                        navController.navigate(
                            AppRoute.Customers.route
                        )
                    },
                    onContinue = {
                        navController.navigate(
                            AppRoute.Products.route
                        )
                    },
                    onCancel = {
                        appViewModel.clearSelectedCustomer()
                        navController.popBackStack()
                    }
                )
            }

            /*
             * Shopping cart
             */
            composable(
                route = AppRoute.Cart.route
            ) {
                CartScreen(
                    state = state,
                    onIncrease = appViewModel::increaseCartQuantity,
                    onDecrease = appViewModel::decreaseCartQuantity,
                    onRemove = appViewModel::removeCartItem,
                    onAddMoreProducts = {
                        navController.navigate(
                            AppRoute.Products.route
                        )
                    },
                    onContinue = {
                        navController.navigate(
                            AppRoute.ReviewOrder.route
                        )
                    }
                )
            }

            /*
             * Review order
             */
            composable(
                route = AppRoute.ReviewOrder.route
            ) {
                ReviewOrderScreen(
                    state = state,
                    onNotesChange = { notes ->
                        appViewModel.updateOrderNotes(notes)
                    },
                    onBackToCart = {
                        navController.popBackStack()
                    },
                    onSubmit = {
                        appViewModel.submitSalesOrder(
                            onSuccess = {
                                navController.navigate(
                                    AppRoute.OrderSuccess.route
                                ) {
                                    popUpTo(
                                        AppRoute.NewOrder.route
                                    ) {
                                        inclusive = true
                                    }

                                    launchSingleTop = true
                                }
                            }
                        )
                    }
                )
            }

            /*
             * Order success
             */
            composable(
                route = AppRoute.OrderSuccess.route
            ) {
                OrderSuccessScreen(
                    state = state,
                    onViewOrders = {
                        appViewModel.clearNewOrder()

                        navController.navigate(
                            AppRoute.Orders.route
                        ) {
                            popUpTo(
                                AppRoute.Dashboard.route
                            )

                            launchSingleTop = true
                        }
                    },
                    onCreateAnotherOrder = {
                        appViewModel.clearNewOrder()

                        navController.navigate(
                            AppRoute.NewOrder.route
                        ) {
                            popUpTo(
                                AppRoute.Dashboard.route
                            )

                            launchSingleTop = true
                        }
                    }
                )
            }

            /*
             * Orders
             */
            composable(
                route = AppRoute.Orders.route
            ) {
                LaunchedEffect(Unit) {
                    appViewModel.loadOrders()
                }

                OrdersScreen(
                    state = state,
                    onSelectFilter = { filter ->
                        appViewModel.loadOrders(filter)
                    },
                    onOpenOrder = { orderId ->
                        navController.navigate(
                            AppRoute.OrderDetails.createRoute(
                                orderId
                            )
                        )
                    }
                )
            }

            /*
             * Order details
             */
            composable(
                route = AppRoute.OrderDetails.route,
                arguments = listOf(
                    navArgument("id") {
                        type = NavType.StringType
                    }
                )
            ) { backStackEntry ->

                val orderId = backStackEntry.arguments
                    ?.getString("id")
                    .orEmpty()

                LaunchedEffect(orderId) {
                    if (orderId.isNotBlank()) {
                        appViewModel.loadOrder(orderId)
                    }
                }

                OrderDetailsScreen(
                    state = state,
                    onSync = { id ->
                        appViewModel.syncOrder(id)
                    },
                    onRetry = { id ->
                        appViewModel.retryOrder(id)
                    }
                )
            }

            /*
             * Settings
             */
            composable(
                route = AppRoute.Settings.route
            ) {
                SettingsScreen(
                    onRefreshDashboard = {
                        appViewModel.loadDashboard()
                    }
                )
            }
        }
    }
}