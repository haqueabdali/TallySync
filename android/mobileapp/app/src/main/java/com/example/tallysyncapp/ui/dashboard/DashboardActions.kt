package com.example.tallysyncapp.ui.dashboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.material.icons.filled.ShoppingCart

@Composable
fun DashboardActions(
    loading: Boolean,
    canSyncPending: Boolean,
    onSyncPending: () -> Unit,
    onOpenOrders: () -> Unit,
    onOpenSuppliers: () -> Unit,
    onOpenPurchaseOrders: () -> Unit,
    onOpenReports: () -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Button(
            onClick = onSyncPending,
            enabled = !loading && canSyncPending,
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(Icons.Default.Sync, contentDescription = null)
            Text(" Sync pending orders")
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedButton(
                onClick = onOpenOrders,
                modifier = Modifier.weight(1f)
            ) {
                Icon(Icons.Default.ReceiptLong, contentDescription = null)
                Text(" Orders")
            }

            OutlinedButton(
                onClick = onOpenSuppliers,
                modifier = Modifier.weight(1f)
            ) {
                Icon(Icons.Default.Business, contentDescription = null)
                Text(" Suppliers")
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {

            OutlinedButton(
            onClick = onOpenPurchaseOrders,
            modifier = Modifier.fillMaxWidth()
            ) {
            Icon(
                Icons.Default.ShoppingCart,
                contentDescription = null
            )
                Text(" Purchase Orders")
            }
            OutlinedButton(
                onClick = onOpenReports,
                modifier = Modifier.weight(1f)
            ) {
                Icon(Icons.Default.Assessment, contentDescription = null)
                Text(" Reports")
            }

            OutlinedButton(
                onClick = onRefresh,
                enabled = !loading,
                modifier = Modifier.weight(1f)
            ) {
                Icon(Icons.Default.Refresh, contentDescription = null)
                Text(" Refresh")
            }
        }
    }
}
