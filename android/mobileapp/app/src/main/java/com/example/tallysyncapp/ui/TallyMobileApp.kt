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
import androidx.compose.ui.platform.LocalContext
import android.widget.Toast
import com.example.tallysyncapp.invoice.InvoicePdfGenerator
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.tallysyncapp.ui.auth.AuthViewModel
import com.example.tallysyncapp.ui.auth.LoginScreen
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
import com.example.tallysyncapp.scanner.BarcodeScannerScreen
import com.example.tallysyncapp.report.CsvReportExporter
import com.example.tallysyncapp.report.buildSalesReport

@Composable
fun TallyMobileApp(
    authViewModel: AuthViewModel = hiltViewModel()
) {
    val authState by authViewModel.uiState.collectAsStateWithLifecycle()

    if (!authState.isAuthenticated) {
        LoginScreen(
            state = authState,
            onEmailChange = authViewModel::updateEmail,
            onPasswordChange = authViewModel::updatePassword,
            onLogin = authViewModel::login
        )
        return
    }

    AuthenticatedTallyMobileApp(
        onLogout = authViewModel::logout
    )
}

@Composable
private fun AuthenticatedTallyMobileApp(
    onLogout: () -> Unit,
    appViewModel: AppViewModel = hiltViewModel()
) {
    val navController = rememberNavController()

    val state by appViewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current

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
                    onOpenReports = {
                        navController.navigate(AppRoute.Reports.route)
                    },
                    onOpenSuppliers = {
                        navController.navigate(AppRoute.Suppliers.route)
                    },
                    onSyncPending = {
                        appViewModel.syncPending()
                    }
                )
            }

            /*
             * Suppliers
             */
            composable(route = AppRoute.Suppliers.route) {
                LaunchedEffect(Unit) { appViewModel.loadSuppliers() }
                SuppliersScreen(
                    state = state,
                    onSearchChange = appViewModel::updateSupplierSearch,
                    onSearch = { appViewModel.loadSuppliers() },
                    onAdd = {
                        appViewModel.selectSupplier(null)
                        navController.navigate(AppRoute.SupplierForm.createRoute())
                    },
                    onOpen = { supplier ->
                        appViewModel.selectSupplier(supplier)
                        navController.navigate(AppRoute.SupplierForm.createRoute(supplier.id))
                    }
                )
            }

            composable(
                route = AppRoute.SupplierForm.route,
                arguments = listOf(navArgument("id") {
                    type = NavType.StringType
                    defaultValue = ""
                })
            ) {
                SupplierEditorRoute(
                    supplier = state.selectedSupplier,
                    isSaving = state.isSavingSupplier,
                    onSave = { request ->
                        appViewModel.saveSupplier(request) { navController.popBackStack() }
                    },
                    onDelete = state.selectedSupplier?.let {
                        { appViewModel.deleteSelectedSupplier { navController.popBackStack() } }
                    },
                    onBack = { navController.popBackStack() }
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
                    selectable = false,
                    onSearchChange = appViewModel::updateCustomerSearch,
                    onSearch = appViewModel::loadCustomers,
                    onCustomerClick = { customer ->
                        navController.navigate(
                            AppRoute.CustomerDetails.createRoute(customer.id)
                        )
                    }
                )
            }

            /*
             * Customer picker used only during order creation
             */
            composable(
                route = AppRoute.CustomerPicker.route
            ) {
                LaunchedEffect(Unit) {
                    appViewModel.loadCustomers()
                }

                CustomersScreen(
                    state = state,
                    selectable = true,
                    onSearchChange = appViewModel::updateCustomerSearch,
                    onSearch = appViewModel::loadCustomers,
                    onCustomerClick = { customer ->
                        appViewModel.selectCustomer(customer)
                        navController.popBackStack()
                    }
                )
            }

            /*
             * Customer details and recent orders
             */
            composable(
                route = AppRoute.CustomerDetails.route,
                arguments = listOf(
                    navArgument("id") { type = NavType.StringType }
                )
            ) { backStackEntry ->
                val customerId = backStackEntry.arguments?.getString("id").orEmpty()

                LaunchedEffect(customerId, state.customers) {
                    if (customerId.isNotBlank() && state.customers.isNotEmpty()) {
                        appViewModel.openCustomer(customerId)
                    }
                }

                CustomerDetailsScreen(
                    state = state,
                    onBack = {
                        appViewModel.clearViewedCustomer()
                        navController.popBackStack()
                    },
                    onCreateOrder = {
                        state.viewedCustomer?.let(appViewModel::selectCustomer)
                        navController.navigate(AppRoute.NewOrder.route)
                    },
                    onOpenOrder = { orderId ->
                        navController.navigate(AppRoute.OrderDetails.createRoute(orderId))
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
                            AppRoute.CustomerPicker.route
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
             * Products and barcode scanner
             */
            composable(
                route = AppRoute.Products.route
            ) {
                LaunchedEffect(Unit) {
                    appViewModel.loadProducts()
                }

                ProductsScreen(
                    state = state,
                    onSearchChange = appViewModel::updateProductSearch,
                    onSearch = { appViewModel.loadProducts() },
                    onAddProduct = appViewModel::addProductToCart,
                    onOpenCart = {
                        navController.navigate(AppRoute.Cart.route)
                    },
                    onOpenScanner = {
                        navController.navigate(AppRoute.BarcodeScanner.route)
                    }
                )
            }

            composable(
                route = AppRoute.BarcodeScanner.route
            ) {
                LaunchedEffect(Unit) {
                    if (state.products.isEmpty()) {
                        appViewModel.loadProducts()
                    }
                }

                BarcodeScannerScreen(
                    state = state,
                    onBack = { navController.popBackStack() },
                    onProductFound = { product ->
                        appViewModel.addProductToCart(product)
                        navController.popBackStack()
                    },
                    onMessage = appViewModel::showMessage
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
                    },
                    onCreateInvoicePdf = {
                        state.selectedOrder?.let { order ->
                            runCatching {
                                InvoicePdfGenerator.createPdf(context, order)
                            }.onSuccess { file ->
                                Toast.makeText(
                                    context,
                                    "PDF created: ${file.name}",
                                    Toast.LENGTH_LONG
                                ).show()
                            }.onFailure { error ->
                                Toast.makeText(
                                    context,
                                    error.message ?: "Could not create PDF",
                                    Toast.LENGTH_LONG
                                ).show()
                            }
                        }
                    },
                    onPrintInvoicePdf = {
                        state.selectedOrder?.let { order ->
                            runCatching {
                                InvoicePdfGenerator.createPdf(context, order)
                            }.onSuccess { file ->
                                InvoicePdfGenerator.printPdf(
                                    context = context,
                                    file = file,
                                    jobName = "TallySync ${order.orderNumber}"
                                )
                            }.onFailure { error ->
                                Toast.makeText(
                                    context,
                                    error.message ?: "Could not print PDF",
                                    Toast.LENGTH_LONG
                                ).show()
                            }
                        }
                    },
                    onShareInvoicePdf = {
                        state.selectedOrder?.let { order ->
                            runCatching {
                                InvoicePdfGenerator.createPdf(context, order)
                            }.onSuccess { file ->
                                InvoicePdfGenerator.sharePdf(context, file)
                            }.onFailure { error ->
                                Toast.makeText(
                                    context,
                                    error.message ?: "Could not share PDF",
                                    Toast.LENGTH_LONG
                                ).show()
                            }
                        }
                    }
                )
            }

            /*
             * Reports and analytics
             */
            composable(
                route = AppRoute.Reports.route
            ) {
                LaunchedEffect(Unit) {
                    appViewModel.loadReports()
                }

                val reportSummary = buildSalesReport(
                    orders = state.reportOrders,
                    range = state.reportRange
                )

                ReportsScreen(
                    state = state,
                    summary = reportSummary,
                    onRangeSelected = appViewModel::updateReportRange,
                    onRefresh = appViewModel::loadReports,
                    onExportCsv = {
                        runCatching {
                            CsvReportExporter.createCsv(context, state.reportOrders)
                        }.onSuccess { file ->
                            CsvReportExporter.shareCsv(context, file)
                        }.onFailure { error ->
                            Toast.makeText(
                                context,
                                error.message ?: "Could not export report",
                                Toast.LENGTH_LONG
                            ).show()
                        }
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
                    },
                    onLogout = onLogout
                )
            }
        }
    }
}