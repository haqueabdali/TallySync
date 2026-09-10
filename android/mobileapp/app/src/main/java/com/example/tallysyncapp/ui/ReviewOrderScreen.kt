package com.example.tallysyncapp.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.tallysyncapp.data.network.CartItem
import java.util.Locale

@Composable
fun ReviewOrderScreen(
    state: AppUiState,
    onNotesChange: (String) -> Unit,
    onUnitPriceChange: (String, Double) -> Unit,
    onBackToCart: () -> Unit,
    onSubmit: () -> Unit
) {
    val total = state.cartItems.sumOf { it.subtotal }
    val canSubmit = state.selectedCustomer != null &&
            state.cartItems.isNotEmpty() &&
            state.cartItems.all { it.unitPrice > 0.0 } &&
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
    ReviewProductCard(
        item = item,
        onUnitPriceChange = onUnitPriceChange
    )
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
private fun ReviewProductCard(
    item: CartItem,
    onUnitPriceChange: (String, Double) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {

            Text(
                text = item.product.name,
                style = MaterialTheme.typography.titleMedium
            )

            item.product.sku
                ?.takeIf { it.isNotBlank() }
                ?.let { sku ->
                    Text(
                        text = "SKU: $sku",
                        style = MaterialTheme.typography.bodySmall
                    )
                }

            Text(
                text = "Quantity: ${item.quantity} ${item.product.unit.orEmpty()}",
                style = MaterialTheme.typography.bodyMedium
            )

            var priceText by rememberSaveable(item.product.id) {
                mutableStateOf(
                    if (item.unitPrice > 0.0) {
                        String.format(Locale.US, "%.2f", item.unitPrice)
                    } else {
                        ""
                    }
                )
            }

            OutlinedTextField(
                value = priceText,
                onValueChange = { rawValue ->
                    val normalized = rawValue.replace(',', '.')
                    val validShape = normalized.matches(
                        Regex("""^\d*(\.\d{0,2})?$""")
                    )

                    if (validShape) {
                        priceText = normalized
                        val numericPrice = when {
                            normalized.isBlank() || normalized == "." -> 0.0
                            else -> normalized.toDoubleOrNull() ?: 0.0
                        }
                        onUnitPriceChange(item.product.id, numericPrice)
                    }
                },
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Decimal
                ),
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Selling price") },
                prefix = { Text("€") },
                supportingText = {
                    if (item.unitPrice <= 0.0) {
                        Text("Enter a selling price greater than €0.00")
                    }
                },
                isError = item.unitPrice <= 0.0,
                singleLine = true
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

            if (item.unitPrice <= 0.0) {
                Text(
                    text = "Enter a valid selling price before submitting this order.",
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}

private fun formatReviewMoney(value: Double): String {
    return String.format(Locale.getDefault(), "€%.2f", value)
}