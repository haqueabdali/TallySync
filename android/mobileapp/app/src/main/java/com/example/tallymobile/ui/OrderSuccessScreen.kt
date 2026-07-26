package com.example.tallymobile.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.tallymobile.data.network.CartItem
import java.util.Locale

@Composable
fun ReviewOrderScreen(
    state: AppUiState,
    onNotesChange: (String) -> Unit,
    onBackToCart: () -> Unit,
    onSubmit: () -> Unit
) {
    val total = state.cartItems.sumOf { item ->
        item.subtotal
    }

    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        Text(
            text = "Review Order",
            style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.padding(16.dp)
        )

        LazyColumn(
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(
                start = 16.dp,
                end = 16.dp,
                bottom = 16.dp
            ),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                CustomerReviewCard(
                    customerName = state.selectedCustomer?.name
                        ?: "No customer selected",
                    phone = state.selectedCustomer?.phone
                )
            }

            item {
                Text(
                    text = "Products",
                    style = MaterialTheme.typography.titleLarge
                )
            }

            items(
                items = state.cartItems,
                key = { item -> item.product.id }
            ) { item ->
                ReviewProductCard(item)
            }

            item {
                OutlinedTextField(
                    value = state.orderNotes,
                    onValueChange = onNotesChange,
                    modifier = Modifier.fillMaxWidth(),
                    label = {
                        Text("Order notes")
                    },
                    minLines = 3,
                    maxLines = 5
                )
            }

            item {
                HorizontalDivider()
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Total",
                        style = MaterialTheme.typography.titleLarge
                    )

                    Text(
                        text = money(total),
                        style = MaterialTheme.typography.titleLarge
                    )
                }
            }
        }

        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedButton(
                onClick = onBackToCart,
                enabled = !state.isSubmittingOrder,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Back to cart")
            }

            Button(
                onClick = onSubmit,
                enabled = !state.isSubmittingOrder &&
                    state.selectedCustomer != null &&
                    state.cartItems.isNotEmpty(),
                modifier = Modifier.fillMaxWidth()
            ) {
                if (state.isSubmittingOrder) {
                    CircularProgressIndicator()
                } else {
                    Text("Submit order")
                }
            }

            state.error?.let { error ->
                Text(
                    text = error,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }
    }
}

@Composable
private fun CustomerReviewCard(
    customerName: String,
    phone: String?
) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = "Customer",
                style = MaterialTheme.typography.labelLarge
            )

            Text(
                text = customerName,
                style = MaterialTheme.typography.titleLarge
            )

            phone
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

@Composable
private fun ReviewProductCard(
    item: CartItem
) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = item.product.name,
                    style = MaterialTheme.typography.titleMedium
                )

                Text(
                    text = "${item.quantity} × ${money(item.product.sellingPrice)}",
                    style = MaterialTheme.typography.bodyMedium
                )
            }

            Text(
                text = money(item.subtotal),
                style = MaterialTheme.typography.titleMedium
            )
        }
    }
}

private fun money(value: Double): String {
    return String.format(
        Locale.getDefault(),
        "€%.2f",
        value
    )
}