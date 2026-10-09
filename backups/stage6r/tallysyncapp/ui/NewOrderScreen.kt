package com.example.tallysyncapp.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.tallysyncapp.data.network.CustomerListItem

@Composable
fun NewOrderScreen(
    selectedCustomer: CustomerListItem?,
    onSelectCustomer: () -> Unit,
    onContinue: () -> Unit,
    onCancel: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "New Sales Order",
            style = MaterialTheme.typography.headlineMedium
        )

        Text(
            text = "Step 1 of 3",
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.primary
        )

        Text(
            text = "Customer",
            style = MaterialTheme.typography.titleLarge
        )

        if (selectedCustomer == null) {
            Text(
                text = "Select the customer who is placing this order.",
                style = MaterialTheme.typography.bodyMedium
            )

            Button(
                onClick = onSelectCustomer,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Select customer")
            }
        } else {
            SelectedCustomerCard(
                customer = selectedCustomer
            )

            OutlinedButton(
                onClick = onSelectCustomer,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Change customer")
            }

            Button(
                onClick = onContinue,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Continue to products")
            }
        }

        OutlinedButton(
            onClick = onCancel,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Cancel order")
        }
    }
}

@Composable
private fun SelectedCustomerCard(
    customer: CustomerListItem
) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(
                imageVector = Icons.Default.CheckCircle,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary
            )

            Text(
                text = customer.name,
                style = MaterialTheme.typography.titleLarge
            )

            customer.phone
                ?.takeIf { it.isNotBlank() }
                ?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }

            customer.address
                ?.takeIf { it.isNotBlank() }
                ?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
        }
    }
}