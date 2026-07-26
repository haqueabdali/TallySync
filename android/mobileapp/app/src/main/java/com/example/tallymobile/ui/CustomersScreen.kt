package com.example.tallymobile.ui

import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import com.example.tallymobile.data.network.CustomerListItem

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomersScreen(
    state: AppUiState,
    selectable: Boolean = false,
    onSearchChange: (String) -> Unit,
    onSearch: () -> Unit,
    onCustomerClick: (CustomerListItem) -> Unit
) {
    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        Text(
            text = if (selectable) {
                "Select Customer"
            } else {
                "Customers"
            },
            style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.padding(
                start = 16.dp,
                end = 16.dp,
                top = 16.dp
            )
        )

        OutlinedTextField(
            value = state.customerSearch,
            onValueChange = onSearchChange,
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            label = {
                Text("Search customers")
            },
            singleLine = true,
            leadingIcon = {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = null
                )
            },
            trailingIcon = {
                IconButton(
                    onClick = onSearch
                ) {
                    Icon(
                        imageVector = Icons.Default.Search,
                        contentDescription = "Search"
                    )
                }
            },
            keyboardOptions = KeyboardOptions(
                imeAction = ImeAction.Search
            ),
            keyboardActions = KeyboardActions(
                onSearch = {
                    onSearch()
                }
            )
        )

        when {
            state.loading && state.customers.isEmpty() -> {
                CustomerLoading()
            }

            state.customers.isEmpty() -> {
                EmptyCustomers()
            }

            else -> {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(
                        start = 16.dp,
                        end = 16.dp,
                        bottom = 100.dp
                    ),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(
                        items = state.customers,
                        key = { customer -> customer.id }
                    ) { customer ->
                        CustomerCard(
                            customer = customer,
                            selected = state.selectedCustomer?.id == customer.id,
                            onClick = {
                                onCustomerClick(customer)
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CustomerCard(
    customer: CustomerListItem,
    selected: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Business,
                    contentDescription = null
                )

                Column(
                    modifier = Modifier.weight(1f)
                ) {
                    Text(
                        text = customer.name,
                        style = MaterialTheme.typography.titleMedium
                    )

                    if (selected) {
                        Text(
                            text = "Selected",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }

            customer.phone
                ?.takeIf { it.isNotBlank() }
                ?.let { phone ->
                    CustomerInformationRow(
                        icon = {
                            Icon(
                                imageVector = Icons.Default.Phone,
                                contentDescription = null
                            )
                        },
                        text = phone
                    )
                }

            customer.email
                ?.takeIf { it.isNotBlank() }
                ?.let { email ->
                    CustomerInformationRow(
                        icon = {
                            Icon(
                                imageVector = Icons.Default.Email,
                                contentDescription = null
                            )
                        },
                        text = email
                    )
                }

            customer.address
                ?.takeIf { it.isNotBlank() }
                ?.let { address ->
                    Text(
                        text = address,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
        }
    }
}

@Composable
private fun CustomerInformationRow(
    icon: @Composable () -> Unit,
    text: String
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        icon()

        Text(
            text = text,
            style = MaterialTheme.typography.bodyMedium
        )
    }
}

@Composable
private fun CustomerLoading() {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        CircularProgressIndicator()

        Text(
            text = "Loading customers...",
            modifier = Modifier.padding(top = 12.dp)
        )
    }
}

@Composable
private fun EmptyCustomers() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Default.Business,
            contentDescription = null
        )

        Text(
            text = "No customers found",
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.padding(top = 12.dp)
        )

        Text(
            text = "Try another customer name.",
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(top = 6.dp)
        )
    }
}