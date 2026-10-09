package com.example.tallysyncapp.ui.dashboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.tallysyncapp.data.network.TallyStatus

@Composable
fun TallyConnectionCard(
    tally: TallyStatus?,
    modifier: Modifier = Modifier
) {
    val connected = tally?.connected == true
    val companyName = tally?.companyName?.takeIf { it.isNotBlank() }
    val latency = tally?.responseTimeMilliseconds
    val error = tally?.error?.takeIf { it.isNotBlank() }

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (connected) {
                MaterialTheme.colorScheme.primaryContainer
            } else {
                MaterialTheme.colorScheme.errorContainer
            }
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    Text(
                        text = "Tally Prime",
                        style = MaterialTheme.typography.titleMedium
                    )
                    Text(
                        text = companyName ?: "Company status",
                        style = MaterialTheme.typography.bodyMedium
                    )
                }

                AssistChip(
                    onClick = {},
                    label = {
                        Text(if (connected) "Connected" else "Disconnected")
                    },
                    leadingIcon = {
                        Icon(
                            imageVector = if (connected) {
                                Icons.Default.CloudDone
                            } else {
                                Icons.Default.CloudOff
                            },
                            contentDescription = null
                        )
                    }
                )
            }

            if (connected && latency != null) {
                Text(
                    text = "Response time: ${latency} ms",
                    style = MaterialTheme.typography.bodySmall
                )
            }

            if (!connected && error != null) {
                Text(
                    text = error,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onErrorContainer
                )
            }
        }
    }
}
