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
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.tallysyncapp.data.network.SupplierListItem
import java.util.Locale

@Composable
fun SupplierDetailsScreen(
    state: AppUiState,
    supplierId: String,
    onBack: () -> Unit,
    onEdit: () -> Unit,
    onStatusChange: (Boolean) -> Unit,
    onDelete: () -> Unit
) {
    val supplier = state.supplierRecord
        ?.takeIf { it.id == supplierId }

    var showDeleteDialog by rememberSaveable {
        mutableStateOf(false)
    }

    if (showDeleteDialog && supplier != null) {
        AlertDialog(
            onDismissRequest = {
                if (!state.isSavingSupplier) {
                    showDeleteDialog = false
                }
            },
            title = {
                Text("Delete supplier?")
            },
            text = {
                Text(
                    "Delete ${supplier.name}? " +
                        "This removes the supplier from the active supplier list."
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteDialog = false
                        onDelete()
                    },
                    enabled = !state.isSavingSupplier
                ) {
                    Text("Delete")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        showDeleteDialog = false
                    },
                    enabled = !state.isSavingSupplier
                ) {
                    Text("Cancel")
                }
            }
        )
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth()
            ) {
                IconButton(
                    onClick = onBack,
                    enabled = !state.isSavingSupplier
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back"
                    )
                }

                Column(
                    modifier = Modifier.padding(start = 8.dp)
                ) {
                    Text(
                        "Supplier details",
                        style = MaterialTheme.typography.headlineMedium
                    )

                    supplier?.let {
                        Text(
                            it.supplierCode,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }
        }

        if (state.loading && supplier == null) {
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    horizontalArrangement = Arrangement.Center
                ) {
                    CircularProgressIndicator()
                }
            }

            return@LazyColumn
        }

        if (supplier == null) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = state.error
                            ?: "Unable to load supplier.",
                        modifier = Modifier.padding(16.dp),
                        color = if (state.error != null) {
                            MaterialTheme.colorScheme.error
                        } else {
                            MaterialTheme.colorScheme.onSurface
                        }
                    )
                }
            }

            return@LazyColumn
        }

        item {
            SupplierSection("Supplier information") {
                SupplierDetailLine(
                    "Name",
                    supplier.name
                )

                optionalSupplierDetail(
                    "Company",
                    supplier.companyName
                )

                optionalSupplierDetail(
                    "Contact person",
                    supplier.contactPerson
                )

                SupplierDetailLine(
                    "Status",
                    if (supplier.isActive) {
                        "Active"
                    } else {
                        "Inactive"
                    }
                )

                SupplierDetailLine(
                    "Supplier code",
                    supplier.supplierCode
                )
            }
        }

        item {
            SupplierSection("Contact") {
                optionalSupplierDetail(
                    "Email",
                    supplier.email
                )

                optionalSupplierDetail(
                    "Phone",
                    supplier.phone
                )

                optionalSupplierDetail(
                    "Mobile",
                    supplier.mobile
                )
            }
        }

        item {
            SupplierSection("Tax information") {
                optionalSupplierDetail(
                    "Tax number",
                    supplier.taxNumber
                )

                optionalSupplierDetail(
                    "VAT number",
                    supplier.vatNumber
                )
            }
        }

        item {
            SupplierSection("Address") {
                optionalSupplierDetail(
                    "Billing address",
                    supplier.billingAddress
                )

                optionalSupplierDetail(
                    "Shipping address",
                    supplier.shippingAddress
                )

                optionalSupplierDetail(
                    "City",
                    supplier.city
                )

                optionalSupplierDetail(
                    "State / province",
                    supplier.state
                )

                optionalSupplierDetail(
                    "Postal code",
                    supplier.postalCode
                )

                optionalSupplierDetail(
                    "Country",
                    supplier.country
                )
            }
        }

        item {
            SupplierSection("Accounting") {
                SupplierDetailLine(
                    "Currency",
                    supplier.currency
                )

                SupplierDetailLine(
                    "Credit limit",
                    supplierMoney(
                        supplier.creditLimit,
                        supplier.currency
                    )
                )

                SupplierDetailLine(
                    "Opening balance",
                    supplierMoney(
                        supplier.openingBalance,
                        supplier.currency
                    )
                )

                SupplierDetailLine(
                    "Current balance",
                    supplierMoney(
                        supplier.currentBalance,
                        supplier.currency
                    )
                )

                SupplierDetailLine(
                    "Payment terms",
                    if (supplier.paymentTerms == 1) {
                        "1 day"
                    } else {
                        "${supplier.paymentTerms} days"
                    }
                )
            }
        }

        supplier.notes
            ?.takeIf(String::isNotBlank)
            ?.let { notes ->
                item {
                    SupplierSection("Notes") {
                        Text(
                            notes,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }

        item {
            Button(
                onClick = onEdit,
                enabled = !state.isSavingSupplier,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(
                    Icons.Default.Edit,
                    contentDescription = null
                )

                Text(
                    "Edit supplier",
                    modifier = Modifier.padding(start = 8.dp)
                )
            }
        }

        item {
            OutlinedButton(
                onClick = {
                    onStatusChange(!supplier.isActive)
                },
                enabled = !state.isSavingSupplier,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    if (supplier.isActive) {
                        "Deactivate supplier"
                    } else {
                        "Activate supplier"
                    }
                )
            }
        }

        item {
            OutlinedButton(
                onClick = {
                    showDeleteDialog = true
                },
                enabled = !state.isSavingSupplier,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(
                    Icons.Default.Delete,
                    contentDescription = null
                )

                Text(
                    "Delete supplier",
                    modifier = Modifier.padding(start = 8.dp)
                )
            }
        }
    }
}

@Composable
private fun SupplierSection(
    title: String,
    content: @Composable () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                title,
                style = MaterialTheme.typography.titleMedium
            )

            content()
        }
    }
}

@Composable
private fun SupplierDetailLine(
    label: String,
    value: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            label,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.weight(1f)
        )

        Text(
            value,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
private fun optionalSupplierDetail(
    label: String,
    value: String?
) {
    value
        ?.takeIf(String::isNotBlank)
        ?.let {
            SupplierDetailLine(label, it)
        }
}

private fun supplierMoney(
    amount: Double,
    currency: String
): String {
    return String.format(
        Locale.getDefault(),
        "%s %.2f",
        currency.ifBlank { "EUR" },
        amount
    )
}