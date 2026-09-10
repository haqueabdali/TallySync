package com.example.tallysyncapp.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavDestination
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController

private data class BottomNavigationItem(
    val title: String,
    val route: String,
    val icon: ImageVector
)

private val bottomNavigationItems = listOf(
    BottomNavigationItem(
        title = "Home",
        route = AppRoute.Dashboard.route,
        icon = Icons.Default.Home
    ),
    BottomNavigationItem(
        title = "Customers",
        route = AppRoute.Customers.route,
        icon = Icons.Default.People
    ),
    BottomNavigationItem(
        title = "Products",
        route = AppRoute.Products.route,
        icon = Icons.Default.Inventory2
    ),
    BottomNavigationItem(
        title = "Orders",
        route = AppRoute.Orders.route,
        icon = Icons.Default.ReceiptLong
    ),
    BottomNavigationItem(
        title = "Settings",
        route = AppRoute.Settings.route,
        icon = Icons.Default.Settings
    )
)

@Composable
fun AppBottomBar(
    navController: NavHostController,
    currentDestination: NavDestination?
) {
    NavigationBar {
        bottomNavigationItems.forEach { item ->

            val selected = currentDestination
                ?.hierarchy
                ?.any { destination ->
                    destination.route == item.route
                } == true

            NavigationBarItem(
                selected = selected,
                onClick = {
                    if (item.route == AppRoute.Dashboard.route) {
                        /*
                         * Home is intentionally different from the other
                         * bottom-navigation tabs.
                         *
                         * It must always return to the real Dashboard root
                         * instead of restoring an older saved Dashboard
                         * navigation state.
                         */
                        navController.navigate(
                            AppRoute.Dashboard.route
                        ) {
                            popUpTo(
                                navController.graph
                                    .findStartDestination()
                                    .id
                            ) {
                                inclusive = false
                                saveState = false
                            }

                            launchSingleTop = true
                            restoreState = false
                        }
                    } else {
                        /*
                         * Other top-level tabs retain their normal state.
                         */
                        navController.navigate(item.route) {
                            popUpTo(
                                navController.graph
                                    .findStartDestination()
                                    .id
                            ) {
                                saveState = true
                            }

                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                },
                icon = {
                    Icon(
                        imageVector = item.icon,
                        contentDescription = item.title
                    )
                },
                label = {
                    Text(item.title)
                }
            )
        }
    }
}
