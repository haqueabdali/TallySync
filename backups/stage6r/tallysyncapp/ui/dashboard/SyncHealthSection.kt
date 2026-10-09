package com.example.tallysyncapp.ui.dashboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun SyncHealthSection(
    total: Int,
    synced: Int,
    pending: Int,
    failed: Int,
    modifier: Modifier = Modifier
) {
    Card(modifier = modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "Synchronization health",
                style = MaterialTheme.typography.titleMedium
            )

            Text(
                text = if (total > 0) {
                    "$synced of $total orders synchronized"
                } else {
                    "No orders available"
                },
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            if (total > 0) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(10.dp),
                    horizontalArrangement = Arrangement.spacedBy(3.dp)
                ) {
                    if (synced > 0) {
                        Surface(
                            modifier = Modifier
                                .weight(synced.toFloat())
                                .height(10.dp),
                            shape = RoundedCornerShape(99.dp),
                            color = MaterialTheme.colorScheme.primary
                        ) {}
                    }
                    if (pending > 0) {
                        Surface(
                            modifier = Modifier
                                .weight(pending.toFloat())
                                .height(10.dp),
                            shape = RoundedCornerShape(99.dp),
                            color = MaterialTheme.colorScheme.tertiary
                        ) {}
                    }
                    if (failed > 0) {
                        Surface(
                            modifier = Modifier
                                .weight(failed.toFloat())
                                .height(10.dp),
                            shape = RoundedCornerShape(99.dp),
                            color = MaterialTheme.colorScheme.error
                        ) {}
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Synced $synced", style = MaterialTheme.typography.labelMedium)
                Text("Pending $pending", style = MaterialTheme.typography.labelMedium)
                Text("Failed $failed", style = MaterialTheme.typography.labelMedium)
            }
        }
    }
}
