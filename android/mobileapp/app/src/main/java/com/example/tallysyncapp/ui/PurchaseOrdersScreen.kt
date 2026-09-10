package com.example.tallysyncapp.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.tallysyncapp.data.network.PurchaseOrderRecord
import java.util.Locale

@Composable
fun PurchaseOrdersScreen(
    state: AppUiState,
    onSearchChange: (String) -> Unit,
    onSearch: () -> Unit,
    onStatusFilter: (String?) -> Unit,
    onOpen: (PurchaseOrderRecord) -> Unit,
    onAdd: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Purchase Orders",
                fontWeight = FontWeight.Bold
            )

            Button(
                onClick = onAdd,
                enabled = !state.loading
            ) {
                Text("New PO")
            }
        }

        Spacer(Modifier.height(12.dp))

        OutlinedTextField(
            value = state.purchaseOrderSearch,
            onValueChange = onSearchChange,
            modifier = Modifier.fillMaxWidth(),
            label = {
                Text("Search purchase orders")
            },
            singleLine = true
        )

        TextButton(
            onClick = onSearch,
            enabled = !state.loading
        ) {
            Text("Search")
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            PurchaseOrderStatusChip(
                label = "All",
                status = null,
                selected = state.purchaseOrderStatusFilter == null,
                onSelect = onStatusFilter
            )

            PurchaseOrderStatusChip(
                label = "Draft",
                status = "draft",
                selected =
                    state.purchaseOrderStatusFilter == "draft",
                onSelect = onStatusFilter
            )

            PurchaseOrderStatusChip(
                label = "Sent",
                status = "sent",
                selected =
                    state.purchaseOrderStatusFilter == "sent",
                onSelect = onStatusFilter
            )

            PurchaseOrderStatusChip(
                label = "Received",
                status = "received",
                selected =
                    state.purchaseOrderStatusFilter == "received",
                onSelect = onStatusFilter
            )
        }

        Spacer(Modifier.height(8.dp))

        if (state.loading && state.purchaseOrders.isEmpty()) {
            Column(
                modifier = Modifier.fillMaxSize(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                CircularProgressIndicator()
            }

            return
        }

        if (state.purchaseOrders.isEmpty()) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(top = 40.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text("No purchase orders found.")
            }

            return
        }

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(
                items = state.purchaseOrders,
                key = { it.id }
            ) { purchaseOrder ->

                PurchaseOrderCard(
                    purchaseOrder = purchaseOrder,
                    supplierName =
                        state.suppliers
                            .firstOrNull {
                                it.id == purchaseOrder.supplierId
                            }
                            ?.name
                            ?: purchaseOrder.supplierName
                            ?: "Supplier",
                    onClick = {
                        onOpen(purchaseOrder)
                    }
                )
            }
        }
    }
}

@Composable
private fun PurchaseOrderStatusChip(
    label: String,
    status: String?,
    selected: Boolean,
    onSelect: (String?) -> Unit
) {
    FilterChip(
        selected = selected,
        onClick = {
            onSelect(status)
        },
        label = {
            Text(label)
        }
    )
}

@Composable
private fun PurchaseOrderCard(
    purchaseOrder: PurchaseOrderRecord,
    supplierName: String,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(5.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement =
                    Arrangement.SpaceBetween
            ) {
                Text(
                    text = purchaseOrder.poNumber,
                    fontWeight = FontWeight.Bold
                )

                Text(
                    text = purchaseOrder.status
                        .replace('_', ' ')
                        .uppercase()
                )
            }

            Text(supplierName)

            HorizontalDivider()

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement =
                    Arrangement.SpaceBetween
            ) {
                Text(purchaseOrder.poDate)

                Text(
                    "${purchaseOrder.currency} ${
                        formatPurchaseAmount(
                            purchaseOrder.grandTotal
                        )
                    }"
                )
            }
        }
    }
}

private fun formatPurchaseAmount(
    amount: Double
): String =
    String.format(
        Locale.US,
        "%.2f",
        amount
    )