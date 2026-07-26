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
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import com.example.tallymobile.data.network.ProductListItem
import java.util.Locale

@Composable
fun ProductsScreen(
    state: AppUiState,
    onSearchChange: (String) -> Unit,
    onSearch: () -> Unit,
    onAddProduct: (ProductListItem) -> Unit,
    onOpenCart: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(
                    start = 16.dp,
                    end = 16.dp,
                    top = 16.dp
                ),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = "Products",
                style = MaterialTheme.typography.headlineMedium
            )

            Button(
                onClick = onOpenCart
            ) {
                Text(
                    text = "Cart (${state.cartItems.sumOf { it.quantity }})"
                )
            }
        }

        OutlinedTextField(
            value = state.productSearch,
            onValueChange = onSearchChange,
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            label = {
                Text("Search products")
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
            state.loading && state.products.isEmpty() -> {
                ProductLoading()
            }

            state.products.isEmpty() -> {
                EmptyProducts()
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
                        items = state.products,
                        key = { product -> product.id }
                    ) { product ->
                        ProductCard(
                            product = product,
                            quantityInCart = state.cartItems
                                .firstOrNull {
                                    it.product.id == product.id
                                }
                                ?.quantity
                                ?: 0,
                            onAdd = {
                                onAddProduct(product)
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ProductCard(
    product: ProductListItem,
    quantityInCart: Int,
    onAdd: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Inventory2,
                contentDescription = null
            )

            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = product.name,
                    style = MaterialTheme.typography.titleMedium
                )

                product.sku
                    ?.takeIf { it.isNotBlank() }
                    ?.let {
                        Text(
                            text = "SKU: $it",
                            style = MaterialTheme.typography.bodySmall
                        )
                    }

                Text(
                    text = String.format(
                        Locale.getDefault(),
                        "€%.2f",
                        product.sellingPrice
                    ),
                    style = MaterialTheme.typography.titleSmall
                )

                Text(
                    text = "Stock: ${formatStock(product.stock)} ${product.unit.orEmpty()}",
                    style = MaterialTheme.typography.bodySmall
                )

                if (quantityInCart > 0) {
                    Text(
                        text = "$quantityInCart in cart",
                        color = MaterialTheme.colorScheme.primary,
                        style = MaterialTheme.typography.labelMedium
                    )
                }
            }

            IconButton(
                onClick = onAdd,
                enabled = product.stock > 0
            ) {
                Icon(
                    imageVector = Icons.Default.Add,
                    contentDescription = "Add product"
                )
            }
        }
    }
}

private fun formatStock(stock: Double): String {
    return if (stock % 1.0 == 0.0) {
        stock.toInt().toString()
    } else {
        stock.toString()
    }
}

@Composable
private fun ProductLoading() {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        CircularProgressIndicator()

        Text(
            text = "Loading products...",
            modifier = Modifier.padding(top = 12.dp)
        )
    }
}

@Composable
private fun EmptyProducts() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Default.Inventory2,
            contentDescription = null
        )

        Text(
            text = "No products found",
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.padding(top = 12.dp)
        )

        Text(
            text = "Try another product name, SKU or barcode.",
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(top = 6.dp)
        )
    }
}