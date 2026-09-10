package com.example.tallysyncapp.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AddShoppingCart
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.example.tallysyncapp.data.network.SalesOrderSummary
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomerDetailsScreen(
    state: AppUiState,
    onBack: () -> Unit,
    onCreateOrder: () -> Unit,
    onOpenOrder: (String) -> Unit,
    onEdit: () -> Unit,
    onStatusChange: (Boolean) -> Unit,
    onSyncWithTally: () -> Unit
) {
    val customer = state.viewedCustomer
    val context = LocalContext.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(customer?.name ?: "Customer details") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        if (customer == null) {
            Column(
                modifier = Modifier.fillMaxSize().padding(padding),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text("Customer not found")
                OutlinedButton(onClick = onBack, modifier = Modifier.padding(top = 12.dp)) {
                    Text("Back to customers")
                }
            }
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Business, contentDescription = null)
                            Column(modifier = Modifier.padding(start = 12.dp)) {
                                Text(customer.name, style = MaterialTheme.typography.titleLarge)
                                Text("Customer ID: ${customer.id}", style = MaterialTheme.typography.bodySmall)
                            }
                        }

                        customer.phone?.takeIf(String::isNotBlank)?.let { phone ->
                            ContactAction(
                                icon = { Icon(Icons.Default.Phone, contentDescription = null) },
                                text = phone,
                                onClick = {
                                    context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:${Uri.encode(phone)}")))
                                }
                            )
                        }

                        customer.email?.takeIf(String::isNotBlank)?.let { email ->
                            ContactAction(
                                icon = { Icon(Icons.Default.Email, contentDescription = null) },
                                text = email,
                                onClick = {
                                    context.startActivity(Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:${Uri.encode(email)}")))
                                }
                            )
                        }

                        customer.address?.takeIf(String::isNotBlank)?.let { address ->
                            ContactAction(
                                icon = { Icon(Icons.Default.LocationOn, contentDescription = null) },
                                text = address,
                                onClick = {
                                    context.startActivity(
                                        Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q=${Uri.encode(address)}"))
                                    )
                                }
                            )
                        }

                        Button(onClick = onCreateOrder, modifier = Modifier.fillMaxWidth()) {
                            Icon(Icons.Default.AddShoppingCart, contentDescription = null)
                            Text("Create order", modifier = Modifier.padding(start = 8.dp))
                        }

                        Button(
                            onClick = onEdit,
                            enabled = !state.isSavingCustomer,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.Edit, contentDescription = null)
                            Text("Edit customer", modifier = Modifier.padding(start = 8.dp))
                        }

                        state.customerRecord?.let { record ->

                                                    Card(
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(
                                    modifier = Modifier.padding(12.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Text(
                                        "Tally synchronization",
                                        style = MaterialTheme.typography.titleMedium
                                    )

                                    Text(
                                        "Ledger name: ${
                                            record.tallyLedgerName
                                                ?.takeIf(String::isNotBlank)
                                                ?: record.name
                                        }"
                                    )

                                    Text(
                                        "Tally ledger ID: ${
                                            record.tallyLedgerId
                                                ?.takeIf(String::isNotBlank)
                                                ?: "Not linked"
                                        }"
                                    )

                                    record.tallyAlterId
                                        ?.takeIf(String::isNotBlank)
                                        ?.let {
                                            Text("Tally Alter ID: $it")
                                        }

                                    if (record.tallyLedgerId.isNullOrBlank()) {
                                        Button(
                                            onClick = onSyncWithTally,
                                            enabled =
                                                record.isActive &&
                                                !state.isSyncingTallyMaster,
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            if (state.isSyncingTallyMaster) {
                                                CircularProgressIndicator()
                                            } else {
                                                Text("Synchronize with Tally")
                                            }
                                        }

                                        if (!record.isActive) {
                                            Text(
                                                "Activate the customer before synchronizing with Tally.",
                                                style = MaterialTheme.typography.bodySmall
                                            )
                                        }
                                    } else {
                                        Text(
                                            "✓ Linked with Tally",
                                            style = MaterialTheme.typography.bodyMedium
                                        )
                                    }
                                }
                            }
                            Text(
                                text = if (record.isActive) {
                                    "Status: Active"
                                } else {
                                    "Status: Inactive"
                                },
                                style = MaterialTheme.typography.bodyMedium
                            )

                            OutlinedButton(
                                onClick = {
                                    onStatusChange(!record.isActive)
                                },
                                enabled = !state.isSavingCustomer,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    if (record.isActive) {
                                        "Deactivate customer"
                                    } else {
                                        "Activate customer"
                                    }
                                )
                            }
                        }
                    }
                }
            }

            item {
                Text("Recent orders", style = MaterialTheme.typography.titleLarge)
            }

            if (state.loading && state.customerOrders.isEmpty()) {
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(24.dp),
                        horizontalArrangement = Arrangement.Center
                    ) { CircularProgressIndicator() }
                }
            } else if (state.customerOrders.isEmpty()) {
                item {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Text(
                            "No orders found for this customer.",
                            modifier = Modifier.padding(20.dp),
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            } else {
                items(state.customerOrders, key = { it.id }) { order ->
                    CustomerOrderCard(order = order, onClick = { onOpenOrder(order.id) })
                }
            }
        }
    }
}

@Composable
private fun ContactAction(
    icon: @Composable () -> Unit,
    text: String,
    onClick: () -> Unit
) {
    OutlinedButton(onClick = onClick, modifier = Modifier.fillMaxWidth()) {
        icon()
        Text(text, modifier = Modifier.padding(start = 8.dp))
    }
}

@Composable
private fun CustomerOrderCard(order: SalesOrderSummary, onClick: () -> Unit) {
    val money = NumberFormat.getCurrencyInstance(Locale.US)
    Card(onClick = onClick, modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(order.orderNumber, style = MaterialTheme.typography.titleMedium)
                Text(money.format(order.grandTotal), style = MaterialTheme.typography.titleMedium)
            }
            Text(order.orderDate ?: order.createdAt.orEmpty(), style = MaterialTheme.typography.bodySmall)
            Text("Status: ${order.status.ifBlank { order.syncStatus }}", style = MaterialTheme.typography.bodyMedium)
        }
    }
}
