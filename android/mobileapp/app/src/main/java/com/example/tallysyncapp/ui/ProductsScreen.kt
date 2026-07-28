package com.example.tallysyncapp.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddShoppingCart
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.tallysyncapp.data.network.ProductListItem
import java.text.NumberFormat
import java.util.Locale

private enum class StockFilter(val label: String) {
    ALL("All"),
    AVAILABLE("Available"),
    LOW("Low stock"),
    OUT("Out of stock")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductsScreen(
    state: AppUiState,
    onSearchChange: (String) -> Unit,
    onSearch: () -> Unit,
    onAddProduct: (ProductListItem) -> Unit,
    onOpenCart: () -> Unit
) {
    var stockFilter by remember { mutableStateOf(StockFilter.ALL) }
    var selectedProduct by remember { mutableStateOf<ProductListItem?>(null) }

    val visibleProducts = remember(state.products, stockFilter) {
        state.products.filter { product ->
            when (stockFilter) {
                StockFilter.ALL -> true
                StockFilter.AVAILABLE -> product.stock > 5.0
                StockFilter.LOW -> product.stock in 0.000001..5.0
                StockFilter.OUT -> product.stock <= 0.0
            }
        }
    }
    val cartQuantity = state.cartItems.sumOf { it.quantity }

    PullToRefreshBox(
        isRefreshing = state.loading && state.products.isNotEmpty(),
        onRefresh = onSearch,
        modifier = Modifier.fillMaxSize()
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            ProductHeader(
                cartQuantity = cartQuantity,
                refreshing = state.loading,
                onRefresh = onSearch,
                onOpenCart = onOpenCart
            )

            OutlinedTextField(
                value = state.productSearch,
                onValueChange = onSearchChange,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                placeholder = { Text("Search name, SKU or barcode") },
                singleLine = true,
                leadingIcon = {
                    Icon(Icons.Default.Search, contentDescription = null)
                },
                trailingIcon = {
                    if (state.productSearch.isNotEmpty()) {
                        IconButton(onClick = { onSearchChange("") }) {
                            Icon(Icons.Default.Clear, contentDescription = "Clear search")
                        }
                    }
                },
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(onSearch = { onSearch() })
            )

            StockFilters(
                selected = stockFilter,
                onSelected = { stockFilter = it }
            )

            when {
                state.loading && state.products.isEmpty() -> ProductLoading()
                visibleProducts.isEmpty() -> EmptyProducts(hasSearch = state.productSearch.isNotBlank())
                else -> LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(
                        start = 16.dp,
                        end = 16.dp,
                        top = 6.dp,
                        bottom = 100.dp
                    ),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(items = visibleProducts, key = { it.id }) { product ->
                        val quantityInCart = state.cartItems
                            .firstOrNull { it.product.id == product.id }
                            ?.quantity ?: 0

                        ProductCard(
                            product = product,
                            quantityInCart = quantityInCart,
                            onOpenDetails = { selectedProduct = product },
                            onAdd = { onAddProduct(product) }
                        )
                    }
                }
            }
        }
    }

    selectedProduct?.let { product ->
        ProductDetailsSheet(
            product = product,
            quantityInCart = state.cartItems
                .firstOrNull { it.product.id == product.id }
                ?.quantity ?: 0,
            onDismiss = { selectedProduct = null },
            onAdd = { onAddProduct(product) }
        )
    }
}

@Composable
private fun ProductHeader(
    cartQuantity: Int,
    refreshing: Boolean,
    onRefresh: () -> Unit,
    onOpenCart: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 16.dp, end = 8.dp, top = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text("Products", style = MaterialTheme.typography.headlineMedium)
            Text(
                "Tap a product for details",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        IconButton(onClick = onRefresh, enabled = !refreshing) {
            Icon(Icons.Default.Refresh, contentDescription = "Refresh products")
        }

        IconButton(onClick = onOpenCart) {
            BadgedBox(
                badge = {
                    if (cartQuantity > 0) Badge { Text(cartQuantity.coerceAtMost(99).toString()) }
                }
            ) {
                Icon(Icons.Default.ShoppingCart, contentDescription = "Open cart")
            }
        }
    }
}

@Composable
private fun StockFilters(
    selected: StockFilter,
    onSelected: (StockFilter) -> Unit
) {
    LazyRow(
        modifier = Modifier.fillMaxWidth(),
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(StockFilter.entries) { filter ->
            FilterChip(
                selected = selected == filter,
                onClick = { onSelected(filter) },
                label = { Text(filter.label) }
            )
        }
    }
}

@Composable
private fun ProductCard(
    product: ProductListItem,
    quantityInCart: Int,
    onOpenDetails: () -> Unit,
    onAdd: () -> Unit
) {
    val stockStatus = stockStatus(product.stock)
    val canAdd = product.stock > quantityInCart

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onOpenDetails),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                verticalAlignment = Alignment.Top,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.primaryContainer
                ) {
                    Icon(
                        Icons.Default.Inventory2,
                        contentDescription = null,
                        modifier = Modifier.padding(12.dp)
                    )
                }

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        product.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    product.sku?.takeIf { it.isNotBlank() }?.let {
                        Text(
                            "SKU $it",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Text(
                        formatMoney(product.sellingPrice),
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(top = 6.dp)
                    )
                }

                IconButton(onClick = onAdd, enabled = canAdd) {
                    Icon(Icons.Default.AddShoppingCart, contentDescription = "Add to cart")
                }
            }

            Spacer(Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    stockStatus.label,
                    style = MaterialTheme.typography.labelMedium,
                    color = stockStatus.color()
                )
                Spacer(Modifier.weight(1f))
                Text(
                    "${formatStock(product.stock)} ${product.unit.orEmpty()} in stock".trim(),
                    style = MaterialTheme.typography.bodySmall
                )
            }

            LinearProgressIndicator(
                progress = { stockProgress(product.stock) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 6.dp)
            )

            if (quantityInCart > 0) {
                Text(
                    "$quantityInCart in cart",
                    color = MaterialTheme.colorScheme.primary,
                    style = MaterialTheme.typography.labelMedium,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }
        }
    }
}

private data class StockStatus(val label: String, val type: Int) {
    @Composable
    fun color() = when (type) {
        0 -> MaterialTheme.colorScheme.error
        1 -> MaterialTheme.colorScheme.tertiary
        else -> MaterialTheme.colorScheme.primary
    }
}

private fun stockStatus(stock: Double): StockStatus = when {
    stock <= 0.0 -> StockStatus("Out of stock", 0)
    stock <= 5.0 -> StockStatus("Low stock", 1)
    else -> StockStatus("Available", 2)
}

private fun stockProgress(stock: Double): Float = (stock / 25.0).coerceIn(0.0, 1.0).toFloat()

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProductDetailsSheet(
    product: ProductListItem,
    quantityInCart: Int,
    onDismiss: () -> Unit,
    onAdd: () -> Unit
) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(product.name, style = MaterialTheme.typography.headlineSmall)
            Text(
                formatMoney(product.sellingPrice),
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.primary
            )
            HorizontalDivider()
            DetailRow("Stock", "${formatStock(product.stock)} ${product.unit.orEmpty()}".trim())
            product.sku?.takeIf { it.isNotBlank() }?.let { DetailRow("SKU", it) }
            product.barcode?.takeIf { it.isNotBlank() }?.let { DetailRow("Barcode", it) }
            product.unit?.takeIf { it.isNotBlank() }?.let { DetailRow("Unit", it) }
            if (quantityInCart > 0) DetailRow("In cart", quantityInCart.toString())

            Button(
                onClick = onAdd,
                enabled = product.stock > quantityInCart,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.AddShoppingCart, contentDescription = null)
                Text("Add to cart", modifier = Modifier.padding(start = 8.dp))
            }
            OutlinedButton(onClick = onDismiss, modifier = Modifier.fillMaxWidth()) {
                Text("Close")
            }
        }
    }
}

@Composable
private fun DetailRow(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth()) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.weight(1f))
        Text(value, fontWeight = FontWeight.Medium)
    }
}

private fun formatMoney(value: Double): String =
    NumberFormat.getCurrencyInstance(Locale.ITALY).format(value)

private fun formatStock(stock: Double): String =
    if (stock % 1.0 == 0.0) stock.toInt().toString() else String.format(Locale.US, "%.2f", stock)

@Composable
private fun ProductLoading() {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(5) {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth(0.7f)
                            .height(20.dp),
                        shape = RoundedCornerShape(6.dp),
                        color = MaterialTheme.colorScheme.surfaceContainerHighest
                    ) {}
                    Spacer(Modifier.height(12.dp))
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth(0.4f)
                            .height(16.dp),
                        shape = RoundedCornerShape(6.dp),
                        color = MaterialTheme.colorScheme.surfaceContainerHighest
                    ) {}
                    Spacer(Modifier.height(20.dp))
                    LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
                }
            }
        }
    }
}

@Composable
private fun EmptyProducts(hasSearch: Boolean) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            modifier = Modifier.padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                Icons.Default.Inventory2,
                contentDescription = null,
                modifier = Modifier.size(48.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                if (hasSearch) "No matching products" else "No products found",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(top = 12.dp)
            )
            Text(
                if (hasSearch) "Try another name, SKU or barcode." else "Pull down or tap refresh to try again.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 6.dp)
            )
        }
    }
}
