package com.example.tallysyncapp.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
import com.example.tallysyncapp.data.network.CartItem
import java.util.Locale

@Composable
fun ReviewOrderScreen(
    state: AppUiState,
    onNotesChange: (String) -> Unit,
    onBackToCart: () -> Unit,
    onSubmit: () -> Unit
) {
    val total = state.cartItems.sumOf { it.subtotal }
    val canSubmit = state.selectedCustomer != null &&
            state.cartItems.isNotEmpty() &&
            !state.isSubmittingOrder

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "Review Order",
            style = MaterialTheme.typography.headlineMedium
        )

        CustomerReviewCard(
            customerName = state.selectedCustomer?.name ?: "No customer selected",
            phone = state.selectedCustomer?.phone
        )

        Text(
            text = "Products",
            style = MaterialTheme.typography.titleLarge
        )

        state.cartItems.forEach { item ->
            ReviewProductCard(item = item)
        }

        OutlinedTextField(
            value = state.orderNotes,
            onValueChange = onNotesChange,
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Order notes") },
            minLines = 3,
            maxLines = 5
        )

        HorizontalDivider()

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Total",
                style = MaterialTheme.typography.titleLarge
            )

            Text(
                text = formatReviewMoney(total),
                style = MaterialTheme.typography.titleLarge
            )
        }

        OutlinedButton(
            onClick = onBackToCart,
            enabled = !state.isSubmittingOrder,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Back to cart")
        }

        Button(
            onClick = onSubmit,
            enabled = canSubmit,
            modifier = Modifier.fillMaxWidth()
        ) {
            if (state.isSubmittingOrder) {
                CircularProgressIndicator()
            } else {
                Text("Submit order")
            }
        }

        state.error?.let { errorMessage ->
            Text(
                text = errorMessage,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}

@Composable
private fun CustomerReviewCard(
    customerName: String,
    phone: String?
) {
    Card(modifier = Modifier.fillMaxWidth()) {
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
                ?.let { phoneNumber ->
                    Text(
                        text = phoneNumber,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
        }
    }
}

@Composable
private fun ReviewProductCard(item: CartItem) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = item.product.name,
                style = MaterialTheme.typography.titleMedium
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "${item.quantity} × ${formatReviewMoney(item.unitPrice)}",
                    style = MaterialTheme.typography.bodyMedium
                )

                Text(
                    text = formatReviewMoney(item.subtotal),
                    style = MaterialTheme.typography.titleMedium
                )
            }
        }
    }
}

private fun formatReviewMoney(value: Double): String {
    return String.format(Locale.getDefault(), "€%.2f", value)
}