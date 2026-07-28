package com.example.tallysyncapp.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import java.util.Locale
import com.example.tallysyncapp.ui.AppUiState

@Composable
fun OrderSuccessScreen(
    state: AppUiState,
    onViewOrders: () -> Unit,
    onCreateAnotherOrder: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "✓",
            style = MaterialTheme.typography.displayLarge,
            color = MaterialTheme.colorScheme.primary
        )

        Spacer(modifier = Modifier.height(12.dp))

        Text(
            text = "Order created successfully",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "The sales order has been saved and is ready for synchronization.",
            style = MaterialTheme.typography.bodyLarge,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(24.dp))

        Card(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {

                OrderInformationRow(
                    label = "Order ID",
                    value = state.createdOrder?.id ?: "Not available"
                )

                OrderInformationRow(
                    label = "Customer",
                    value = state.selectedCustomer?.name ?: "Not available"
                )

                OrderInformationRow(
                    label = "Items",
                    value = state.cartItems.sumOf { it.quantity }.toString()
                )

                OrderInformationRow(
                    label = "Total",
                    value = formatMoney(
                        state.cartItems.sumOf { it.subtotal }
                    )
                )
            }
        }
        Spacer(modifier = Modifier.height(24.dp))

        Button(
            onClick = onViewOrders,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("View orders")
        }

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedButton(
            onClick = onCreateAnotherOrder,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Create another order")
        }
    }
}

@Composable
private fun OrderInformationRow(
    label: String,
    value: String
) {
    Column(
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Text(
            text = value,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold
        )
    }
}

private fun formatMoney(value: Double): String {
    return String.format(
        Locale.getDefault(),
        "€%.2f",
        value
    )
}