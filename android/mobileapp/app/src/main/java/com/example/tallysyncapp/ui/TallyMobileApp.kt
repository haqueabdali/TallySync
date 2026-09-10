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
import androidx.compose.foundation.layout.Column
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
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.ui.unit.dp
import android.util.Log

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

    val floatingButtonRoutes = remember {
        setOf(
            AppRoute.Dashboard.route,
            AppRoute.Customers.route,
            AppRoute.Products.route,
            AppRoute.Orders.route
        )
    }

    val showBottomBar = currentRoute != null && currentRoute in bottomBarRoutes
    val showFloatingButton =
        currentRoute != null && currentRoute in floatingButtonRoutes

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
            if (showFloatingButton) {
                FloatingActionButton(
                    onClick = {
                        when (currentRoute) {
                            AppRoute.Customers.route -> {
                                navController.navigate(
                                    AppRoute.CustomerForm.route
                                ) {
                                    launchSingleTop = true
                                }
                            }

                            AppRoute.Products.route -> {
                                navController.navigate(
                                    AppRoute.ProductForm.route
                                ) {
                                    launchSingleTop = true
                                }
                            }

                            else -> {
                                navController.navigate(
                                    AppRoute.NewOrder.route
                                ) {
                                    launchSingleTop = true
                                }
                            }
                        }
                    }
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = when (currentRoute) {
                            AppRoute.Customers.route -> "Add customer"
                            AppRoute.Products.route -> "Add product"
                            else -> "Create new order"
                        }
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
        navController.navigate(
            AppRoute.Reports.route
        ) {
            launchSingleTop = true
        }
    },
    onOpenSuppliers = {
        navController.navigate(
            AppRoute.Suppliers.route
        ) {
            launchSingleTop = true
        }
    },
    onSyncPending = {
        appViewModel.syncPending()
    },
    onRetryLocalOrders = {
        appViewModel.retryOfflineOrders()
    },
    onOpenPurchaseOrders = {
        navController.navigate(
            AppRoute.PurchaseOrders.route
        ) {
            launchSingleTop = true
        }
    }
)
            }

         /*
 * Suppliers
 */
composable(
    route = AppRoute.Suppliers.route
) {
    LaunchedEffect(Unit) {
        appViewModel.loadSuppliers()
    }

    SuppliersScreen(
        state = state,
        onSearchChange = appViewModel::updateSupplierSearch,
        onSearch = {
            appViewModel.loadSuppliers()
        },
        onAdd = {
            appViewModel.clearSupplierRecord()

            navController.navigate(
                AppRoute.SupplierForm.route
            )
        },
        onOpen = { supplier ->
            navController.navigate(
                AppRoute.SupplierDetails.createRoute(
                    supplier.id
                )
            )
        }
    )
}

/*
 * Add supplier
 */
composable(
    route = AppRoute.SupplierForm.route
) {
    SupplierEditorRoute(
        supplier = null,
        isSaving = state.isSavingSupplier,
        onSave = { request ->
            appViewModel.saveSupplier(request) {
                navController.popBackStack()
            }
        },
        onDelete = null,
        onBack = {
            navController.popBackStack()
        }
    )
}

/*
 * Supplier details
 */
composable(
    route = AppRoute.SupplierDetails.route,
    arguments = listOf(
        navArgument("id") {
            type = NavType.StringType
        }
    )
) { backStackEntry ->

    val supplierId =
        backStackEntry.arguments
            ?.getString("id")
            .orEmpty()

    LaunchedEffect(supplierId) {
        if (supplierId.isNotBlank()) {
            appViewModel.loadSupplierRecord(
                supplierId
            )
        }
    }

    SupplierDetailsScreen(
        state = state,
        supplierId = supplierId,
        onBack = {
            appViewModel.clearSupplierRecord()
            navController.popBackStack()
        },
        onEdit = {
            navController.navigate(
                AppRoute.SupplierEdit.createRoute(
                    supplierId
                )
            )
        },
        onStatusChange = { isActive ->
            appViewModel.setSupplierActive(
                supplierId = supplierId,
                isActive = isActive
            )
        },
        onDelete = {
            appViewModel.deleteSupplier(
                supplierId
            ) {
                navController.popBackStack(
                    AppRoute.Suppliers.route,
                    inclusive = false
                )
            }
        }
    )
}

/*
 * Edit supplier
 */
composable(
    route = AppRoute.SupplierEdit.route,
    arguments = listOf(
        navArgument("id") {
            type = NavType.StringType
        }
    )
) { backStackEntry ->

    val supplierId =
        backStackEntry.arguments
            ?.getString("id")
            .orEmpty()

    LaunchedEffect(supplierId) {
        if (supplierId.isNotBlank()) {
            appViewModel.loadSupplierRecord(
                supplierId
            )
        }
    }

    SupplierEditorRoute(
        supplier = state.supplierRecord
            ?.takeIf {
                it.id == supplierId
            },
        isSaving = state.isSavingSupplier,
        onSave = { request ->
            appViewModel.updateSupplier(
                supplierId = supplierId,
                request = request
            ) {
                navController.popBackStack()
            }
        },
        onDelete = null,
        onBack = {
            navController.popBackStack()
        }
    )
}

/*
 * Purchase Orders
 */
composable(
    route = AppRoute.PurchaseOrders.route
) {
    LaunchedEffect(Unit) {
        appViewModel.loadSuppliers()
        appViewModel.loadWarehouses()
        appViewModel.loadPurchaseOrders()
    }

    PurchaseOrdersScreen(
        state = state,
        onSearchChange =
            appViewModel::updatePurchaseOrderSearch,
        onSearch = {
            appViewModel.loadPurchaseOrders(
                search =
                    state.purchaseOrderSearch,
                status =
                    state.purchaseOrderStatusFilter
            )
        },
        onStatusFilter =
            appViewModel::updatePurchaseOrderStatusFilter,
        onOpen = { purchaseOrder ->
            navController.navigate(
                AppRoute.PurchaseOrderDetails
                    .createRoute(
                        purchaseOrder.id
                    )
            )
        },
        onAdd = {
            appViewModel.clearPurchaseOrderRecord()
            appViewModel.preparePurchaseOrderForm()

            navController.navigate(
                AppRoute.PurchaseOrderForm.route
            )
        }
    )
}

composable(
    route = AppRoute.PurchaseOrderForm.route
) {
    LaunchedEffect(Unit) {
        appViewModel.clearPurchaseOrderRecord()
        appViewModel.preparePurchaseOrderForm()
    }

    PurchaseOrderFormScreen(
        purchaseOrder = null,
        suppliers =
            state.suppliers.filter {
                it.isActive
            },
        warehouses =
            state.warehouses.filter {
                it.isActive
            },
        products = state.products,
        isSaving =
            state.isSavingPurchaseOrder,
onSave = { request ->
    Log.d(
        "PO_DEBUG",
        "ONSAVE_CALLBACK"
    )

    appViewModel.createPurchaseOrder(
        request = request
    ) { purchaseOrderId ->
        Log.d(
            "PO_DEBUG",
            "CREATE_SUCCESS_CALLBACK"
        )

        navController.navigate(
            AppRoute.PurchaseOrderDetails
                .createRoute(
                    purchaseOrderId
                )
        ) {
            popUpTo(
                AppRoute.PurchaseOrderForm.route
            ) {
                inclusive = true
            }
        }
    }
},
        onBack = {
            navController.popBackStack()
        }
    )
}

composable(
    route = AppRoute.PurchaseOrderDetails.route
) { backStackEntry ->

    val purchaseOrderId =
        backStackEntry.arguments
            ?.getString("id")
            .orEmpty()

    LaunchedEffect(purchaseOrderId) {
        if (purchaseOrderId.isNotBlank()) {
            appViewModel.loadSuppliers()
            appViewModel.loadWarehouses()
            appViewModel.loadProducts()
            appViewModel.loadPurchaseOrderRecord(
                purchaseOrderId
            )
        }
    }

    PurchaseOrderDetailsScreen(
        state = state,
        purchaseOrderId =
            purchaseOrderId,
        onBack = {
            appViewModel.clearPurchaseOrderRecord()
            navController.popBackStack()
        },
        onEdit = {
            navController.navigate(
                AppRoute.PurchaseOrderEdit
                    .createRoute(
                        purchaseOrderId
                    )
            )
        },
        onSend = {
            appViewModel.sendPurchaseOrder(
                purchaseOrderId
            )
        },
        onCancel = {
            appViewModel.cancelPurchaseOrder(
                purchaseOrderId
            )
        },
        onDelete = {
            appViewModel.deletePurchaseOrder(
                purchaseOrderId
            ) {
                navController.popBackStack()
            }
        }
    )
}

composable(
    route = AppRoute.PurchaseOrderEdit.route
) { backStackEntry ->

    val purchaseOrderId =
        backStackEntry.arguments
            ?.getString("id")
            .orEmpty()

    LaunchedEffect(purchaseOrderId) {
        if (purchaseOrderId.isNotBlank()) {
            appViewModel.preparePurchaseOrderForm()
            appViewModel.loadPurchaseOrderRecord(
                purchaseOrderId
            )
        }
    }

    val purchaseOrder =
        state.purchaseOrderRecord
            ?.takeIf {
                it.id == purchaseOrderId
            }

    if (purchaseOrder == null) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
        ) {
            if (state.loading) {
                CircularProgressIndicator()
            } else {
                Text(
                    "Purchase order could not be loaded."
                )

                TextButton(
                    onClick = {
                        navController.popBackStack()
                    }
                ) {
                    Text("Back")
                }
            }
        }
    } else {
        PurchaseOrderFormScreen(
            purchaseOrder =
                purchaseOrder,
            suppliers =
                state.suppliers.filter {
                    it.isActive ||
                        it.id ==
                            purchaseOrder.supplierId
                },
            warehouses =
                state.warehouses.filter {
                    it.isActive ||
                        it.id ==
                            purchaseOrder.warehouseId
                },
            products =
                state.products,
            isSaving =
                state.isSavingPurchaseOrder,
            onSave = { request ->
                appViewModel.updatePurchaseOrder(
                    purchaseOrderId = purchaseOrderId,
                        request = request
                    ) {
                    navController.popBackStack()
                    }
                },
            onBack = {
                navController.popBackStack()
            }
        )
    }
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
             * Add customer
             */
            composable(
                route = AppRoute.CustomerForm.route
            ) {
                CustomerFormScreen(
                    isSaving = state.isSavingCustomer,
                    onSave = { request ->
                        appViewModel.saveCustomer(request) {
                            navController.popBackStack()
                        }
                    },
                    onBack = {
                        navController.popBackStack()
                    }
                )
            }

            /*
             * Edit customer
             */
            composable(
                route = AppRoute.CustomerEdit.route,
                arguments = listOf(
                    navArgument("id") { type = NavType.StringType }
                )
            ) { backStackEntry ->
                val customerId =
                    backStackEntry.arguments?.getString("id").orEmpty()

                LaunchedEffect(customerId) {
                    if (customerId.isNotBlank()) {
                        appViewModel.loadCustomerRecord(customerId)
                    }
                }

                CustomerFormScreen(
                    isSaving = state.isSavingCustomer,
                    customer = state.customerRecord
                        ?.takeIf { it.id == customerId },
                    onSave = { request ->
                        appViewModel.updateCustomer(
                            customerId = customerId,
                            request = request
                        ) {
                            navController.popBackStack()
                        }
                    },
                    onBack = {
                        navController.popBackStack()
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
                    if (customerId.isNotBlank()) {
                        appViewModel.loadCustomerRecord(customerId)

                        if (state.customers.isNotEmpty()) {
                            appViewModel.openCustomer(customerId)
                        }
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
                    },
                    onEdit = {
                        navController.navigate(
                            AppRoute.CustomerEdit.createRoute(customerId)
                        )
                    },
                    onStatusChange = { isActive ->
                    appViewModel.setCustomerActive(
                        customerId = customerId,
                        isActive = isActive
                        )
                    },
                    onSyncWithTally = {
                    appViewModel.syncCustomerWithTally(customerId)
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
                    onProductClick = { product ->
                        navController.navigate(
                            AppRoute.ProductDetails.createRoute(product.id)
                        )
                    },
                    onOpenCart = {
                        navController.navigate(AppRoute.Cart.route)
                    },
                    onOpenScanner = {
                        navController.navigate(AppRoute.BarcodeScanner.route)
                    }
                )
            }

            /*
             * Add product
             */
            composable(
                route = AppRoute.ProductForm.route
            ) {
                ProductFormScreen(
                    isSaving = state.isSavingProduct,
                    onSave = { request ->
                        appViewModel.saveProduct(request) {
                            navController.popBackStack()
                        }
                    },
                    onBack = {
                        navController.popBackStack()
                    }
                )
            }

            /*
             * Product details
             */
            composable(
                route = AppRoute.ProductDetails.route,
                arguments = listOf(
                    navArgument("id") { type = NavType.StringType }
                )
            ) { backStackEntry ->
                val productId =
                    backStackEntry.arguments?.getString("id").orEmpty()

                LaunchedEffect(productId) {
                    if (productId.isNotBlank()) {
                        appViewModel.loadProductRecord(productId)
                    }
                }

                ProductDetailsScreen(
                    state = state,
                    onBack = {
                        appViewModel.clearProductRecord()
                        navController.popBackStack()
                    },
                    onEdit = {
                        navController.navigate(
                            AppRoute.ProductEdit.createRoute(productId)
                        )
                    },
                    onStatusChange = { isActive ->
    appViewModel.setProductActive(
        productId = productId,
        isActive = isActive
    )
},
onSyncWithTally = {
    appViewModel.syncProductWithTally(productId)
}
                )
            }

            /*
             * Edit product
             */
            composable(
                route = AppRoute.ProductEdit.route,
                arguments = listOf(
                    navArgument("id") { type = NavType.StringType }
                )
            ) { backStackEntry ->
                val productId =
                    backStackEntry.arguments?.getString("id").orEmpty()

                LaunchedEffect(productId) {
                    if (productId.isNotBlank()) {
                        appViewModel.loadProductRecord(productId)
                    }
                }

                ProductFormScreen(
                    isSaving = state.isSavingProduct,
                    product = state.productRecord
                        ?.takeIf { it.id == productId },
                    onSave = { request ->
                        appViewModel.updateProduct(
                            productId = productId,
                            request = request
                        ) {
                            navController.popBackStack()
                        }
                    },
                    onBack = {
                        navController.popBackStack()
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

    onUnitPriceChange = { productId, unitPrice ->
        appViewModel.updateCartUnitPrice(
            productId = productId,
            unitPrice = unitPrice
        )
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
                    },
                    onRetryLocalOrders = {
                        appViewModel.retryOfflineOrders()
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

    onFulfill = { id ->
        appViewModel.fulfillOrder(id)
    },

    onSync = { id ->
        appViewModel.syncOrder(id)
    },

    onRetry = { id ->
        appViewModel.retryOrder(id)
    },

    onRefresh = { id ->
        appViewModel.loadOrder(id)
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