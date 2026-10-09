package com.example.tallysyncapp.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Inventory2
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
import androidx.compose.ui.unit.dp
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductDetailsScreen(
    state: AppUiState,
    onBack: () -> Unit,
    onEdit: () -> Unit,
    onStatusChange: (Boolean) -> Unit,
    onSyncWithTally: () -> Unit
) {
    val product = state.productRecord

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(product?.name ?: "Product details")
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                }
            )
        }
    ) { padding ->
        if (product == null) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                if (state.loading) {
                    CircularProgressIndicator()
                    Text(
                        "Loading product...",
                        modifier = Modifier.padding(top = 12.dp)
                    )
                } else {
                    Text("Product not found")
                }
            }

            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Icon(
                                Icons.Default.Inventory2,
                                contentDescription = null
                            )

                            Column {
                                Text(
                                    product.name,
                                    style = MaterialTheme.typography.titleLarge
                                )

                                Text(
                                    "SKU: ${product.sku}",
                                    style = MaterialTheme.typography.bodyMedium
                                )
                            }
                        }

                        DetailLine(
                            "Status",
                            if (product.isActive) "Active" else "Inactive"
                        )

                        DetailLine(
                            "Selling price",
                            String.format(
                                Locale.getDefault(),
                                "€%.2f",
                                product.sellingPrice
                            )
                        )

                        DetailLine(
                            "Purchase price",
                            String.format(
                                Locale.getDefault(),
                                "€%.2f",
                                product.purchasePrice
                            )
                        )

                        DetailLine(
                            "Current stock",
                            "${formatProductNumber(product.currentStock)} ${product.unit}"
                        )

                        DetailLine(
                            "Opening stock",
                            formatProductNumber(product.openingStock)
                        )

                        DetailLine(
                            "Minimum stock",
                            formatProductNumber(product.minimumStock)
                        )

                        DetailLine(
                            "Tax",
                            "${formatProductNumber(product.taxRate)}%"
                        )

                        product.barcode
                            ?.takeIf(String::isNotBlank)
                            ?.let {
                                DetailLine("Barcode", it)
                            }

                        product.hsnCode
                            ?.takeIf(String::isNotBlank)
                            ?.let {
                                DetailLine("HSN code", it)
                            }

                        product.description
                            ?.takeIf(String::isNotBlank)
                            ?.let {
                                DetailLine("Description", it)
                            }
                    }
                }
            }

            item {
                Card(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            "Tally synchronization",
                            style = MaterialTheme.typography.titleMedium
                        )

                        DetailLine(
                            "Sync status",
                            product.syncStatus.ifBlank { "unknown" }
                        )

                        DetailLine(
                            "Tally stock item",
                            product.tallyStockItemId ?: "Not linked"
                        )

                        product.lastSyncedAt
                            ?.takeIf(String::isNotBlank)
                            ?.let {
                                DetailLine("Last synced", it)
                            }

                        product.syncError
                            ?.takeIf(String::isNotBlank)
                            ?.let {
                                Text(
                                    text = "Sync error: $it",
                                    color = MaterialTheme.colorScheme.error
                                )
                            }

                                                when {
                            product.syncStatus.equals(
                                "synced",
                                ignoreCase = true
                            ) && !product.tallyStockItemId.isNullOrBlank() -> {
                                Text(
                                    "✓ Linked with Tally",
                                    style = MaterialTheme.typography.bodyMedium
                                )
                            }

                            product.syncStatus.equals(
                                "failed",
                                ignoreCase = true
                            ) -> {
                                Text(
                                    "The previous Tally master synchronization failed.",
                                    color = MaterialTheme.colorScheme.error,
                                    style = MaterialTheme.typography.bodySmall
                                )

                                Button(
                                    onClick = onSyncWithTally,
                                    enabled =
                                        product.isActive &&
                                        !state.isSyncingTallyMaster,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    if (state.isSyncingTallyMaster) {
                                        CircularProgressIndicator()
                                    } else {
                                        Text("Retry Tally synchronization")
                                    }
                                }
                            }

                            else -> {
                                Text(
                                    "This product has local changes pending Tally master synchronization.",
                                    style = MaterialTheme.typography.bodySmall
                                )

                                Button(
                                    onClick = onSyncWithTally,
                                    enabled =
                                        product.isActive &&
                                        !state.isSyncingTallyMaster,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    if (state.isSyncingTallyMaster) {
                                        CircularProgressIndicator()
                                    } else {
                                        Text("Synchronize with Tally")
                                    }
                                }
                            }
                        }

                        if (!product.isActive) {
                            Text(
                                "Activate the product before synchronizing with Tally.",
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }
                }
            }

            item {
                Button(
                    onClick = onEdit,
                    enabled = !state.isSavingProduct,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(
                        Icons.Default.Edit,
                        contentDescription = null
                    )

                    Text(
                        "Edit product",
                        modifier = Modifier.padding(start = 8.dp)
                    )
                }
            }

            item {
                OutlinedButton(
                    onClick = {
                        onStatusChange(!product.isActive)
                    },
                    enabled = !state.isSavingProduct,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        if (product.isActive) {
                            "Deactivate product"
                        } else {
                            "Activate product"
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun DetailLine(
    label: String,
    value: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium
        )

        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium
        )
    }
}

private fun formatProductNumber(value: Double): String {
    return if (value % 1.0 == 0.0) {
        value.toInt().toString()
    } else {
        value.toString()
    }
}
