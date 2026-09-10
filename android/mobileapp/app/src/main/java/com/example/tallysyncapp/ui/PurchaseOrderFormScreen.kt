package com.example.tallysyncapp.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.tallysyncapp.data.network.ProductListItem
import com.example.tallysyncapp.data.network.PurchaseOrderRecord
import com.example.tallysyncapp.data.network.SavePurchaseOrderRequest
import com.example.tallysyncapp.data.network.SupplierListItem
import com.example.tallysyncapp.data.network.WarehouseListItem
import java.time.LocalDate
import android.util.Log

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PurchaseOrderFormScreen(
    purchaseOrder: PurchaseOrderRecord?,
    suppliers: List<SupplierListItem>,
    warehouses: List<WarehouseListItem>,
    products: List<ProductListItem>,
    isSaving: Boolean,
    onSave: (SavePurchaseOrderRequest) -> Unit,
    onBack: () -> Unit
) {
    val editing = purchaseOrder != null

    var supplierId by rememberSaveable(purchaseOrder?.id) {
        mutableStateOf(purchaseOrder?.supplierId.orEmpty())
    }

    var warehouseId by rememberSaveable(purchaseOrder?.id) {
        mutableStateOf(
            purchaseOrder?.warehouseId
                ?: warehouses.firstOrNull {
                    it.isActive && it.isDefault
                }?.id
                ?: warehouses.firstOrNull {
                    it.isActive
                }?.id
                .orEmpty()
        )
    }

    var poDate by rememberSaveable(purchaseOrder?.id) {
        mutableStateOf(
            purchaseOrder?.poDate
                ?: LocalDate.now().toString()
        )
    }

    var expectedDeliveryDate by
        rememberSaveable(purchaseOrder?.id) {
            mutableStateOf(
                purchaseOrder
                    ?.expectedDeliveryDate
                    .orEmpty()
            )
        }

    var currency by rememberSaveable(purchaseOrder?.id) {
        mutableStateOf(
            purchaseOrder?.currency ?: "EUR"
        )
    }

    var shippingAmount by
        rememberSaveable(purchaseOrder?.id) {
            mutableStateOf(
                purchaseOrder
                    ?.shippingAmount
                    ?.toString()
                    ?: "0"
            )
        }

    var notes by rememberSaveable(purchaseOrder?.id) {
        mutableStateOf(
            purchaseOrder?.notes.orEmpty()
        )
    }

    val lines = remember(purchaseOrder?.id) {
        mutableStateListOf<PurchaseOrderLineInput>().apply {
            purchaseOrder?.items?.forEach { item ->
                add(
                    PurchaseOrderLineInput(
                        itemId = item.itemId,
                        quantity =
                            purchaseNumberForInput(
                                item.quantity
                            ),
                        unitPrice =
                            purchaseNumberForInput(
                                item.unitPrice
                            ),
                        discountPercentage =
                            purchaseNumberForInput(
                                item.discountPercentage
                            ),
                        taxRate =
                            purchaseNumberForInput(
                                item.taxRate
                            )
                    )
                )
            }
        }
    }

    var supplierExpanded by remember {
        mutableStateOf(false)
    }

    var warehouseExpanded by remember {
        mutableStateOf(false)
    }

    var productPickerLine by remember {
        mutableStateOf<Int?>(null)
    }

    var validationErrors by remember {
        mutableStateOf<List<String>>(emptyList())
    }

    var showDiscardDialog by remember {
        mutableStateOf(false)
    }

    var initialized by remember(purchaseOrder?.id) {
        mutableStateOf(false)
    }

    LaunchedEffect(
        purchaseOrder?.id,
        suppliers,
        warehouses
    ) {
        if (!initialized) {
            if (
                purchaseOrder == null &&
                warehouseId.isBlank()
            ) {
                warehouseId =
                    warehouses.firstOrNull {
                        it.isActive && it.isDefault
                    }?.id
                        ?: warehouses.firstOrNull {
                            it.isActive
                        }?.id
                        .orEmpty()
            }

            initialized = true
        }
    }

    val initialSignature = remember(purchaseOrder?.id) {
        purchaseOrder?.let { po ->
            PurchaseOrderFormSignature(
                supplierId = po.supplierId,
                warehouseId = po.warehouseId,
                poDate = po.poDate,
                expectedDeliveryDate =
                    po.expectedDeliveryDate.orEmpty(),
                currency = po.currency,
                shippingAmount =
                    purchaseNumberForInput(
                        po.shippingAmount
                    ),
                notes = po.notes.orEmpty(),
                lines = po.items.map {
                    PurchaseOrderLineInput(
                        itemId = it.itemId,
                        quantity =
                            purchaseNumberForInput(
                                it.quantity
                            ),
                        unitPrice =
                            purchaseNumberForInput(
                                it.unitPrice
                            ),
                        discountPercentage =
                            purchaseNumberForInput(
                                it.discountPercentage
                            ),
                        taxRate =
                            purchaseNumberForInput(
                                it.taxRate
                            )
                    )
                }
            )
        }
    }

    fun currentInput() =
        PurchaseOrderFormInput(
            supplierId = supplierId,
            warehouseId = warehouseId,
            poDate = poDate,
            expectedDeliveryDate =
                expectedDeliveryDate,
            currency = currency,
            shippingAmount = shippingAmount,
            notes = notes,
            items = lines.toList()
        )

    fun hasUnsavedChanges(): Boolean {
        if (editing) {
            val initial =
                initialSignature ?: return false

            return initial !=
                PurchaseOrderFormSignature(
                    supplierId = supplierId,
                    warehouseId = warehouseId,
                    poDate = poDate,
                    expectedDeliveryDate =
                        expectedDeliveryDate,
                    currency = currency,
                    shippingAmount =
                        shippingAmount,
                    notes = notes,
                    lines = lines.toList()
                )
        }

        return supplierId.isNotBlank() ||
            lines.isNotEmpty() ||
            expectedDeliveryDate.isNotBlank() ||
            notes.isNotBlank() ||
            shippingAmount.trim()
                .let { it != "0" && it != "0.0" } ||
            currency.trim()
                .uppercase() != "EUR"
    }

    fun requestBack() {
        if (hasUnsavedChanges()) {
            showDiscardDialog = true
        } else {
            onBack()
        }
    }

    BackHandler {
        requestBack()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(
                rememberScrollState()
            )
            .padding(16.dp),
        verticalArrangement =
            Arrangement.spacedBy(12.dp)
    ) {
        TextButton(
            onClick = {
                requestBack()
            }
        ) {
            Text("Back")
        }

        Text(
            text =
                if (editing) {
                    "Edit Purchase Order"
                } else {
                    "New Purchase Order"
                },
            style =
                MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )

        if (editing) {
            Text(
                text = purchaseOrder?.poNumber.orEmpty(),
                style =
                    MaterialTheme.typography.bodyMedium
            )
        }

        PurchaseOrderFormSection(
            title = "Purchase order"
        ) {
            ExposedDropdownMenuBox(
                expanded = supplierExpanded,
                onExpandedChange = {
                    supplierExpanded =
                        !supplierExpanded
                }
            ) {
                OutlinedTextField(
                    value =
                        suppliers.firstOrNull {
                            it.id == supplierId
                        }?.let {
                            "${it.supplierCode} - ${it.name}"
                        }.orEmpty(),
                    onValueChange = {},
                    readOnly = true,
                    label = {
                        Text("Supplier *")
                    },
                    trailingIcon = {
                        ExposedDropdownMenuDefaults
                            .TrailingIcon(
                                expanded =
                                    supplierExpanded
                            )
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor()
                )

                ExposedDropdownMenu(
                    expanded = supplierExpanded,
                    onDismissRequest = {
                        supplierExpanded = false
                    }
                ) {
                    suppliers
                        .filter { it.isActive }
                        .forEach { supplier ->
                            DropdownMenuItem(
                                text = {
                                    Text(
                                        "${supplier.supplierCode} - ${supplier.name}"
                                    )
                                },
                                onClick = {
                                    supplierId =
                                        supplier.id
                                    supplierExpanded =
                                        false
                                }
                            )
                        }
                }
            }

            ExposedDropdownMenuBox(
                expanded = warehouseExpanded,
                onExpandedChange = {
                    warehouseExpanded =
                        !warehouseExpanded
                }
            ) {
                OutlinedTextField(
                    value =
                        warehouses.firstOrNull {
                            it.id == warehouseId
                        }?.let {
                            buildString {
                                append(it.warehouseCode)
                                append(" - ")
                                append(it.name)

                                if (it.isDefault) {
                                    append(" (Default)")
                                }
                            }
                        }.orEmpty(),
                    onValueChange = {},
                    readOnly = true,
                    label = {
                        Text("Warehouse *")
                    },
                    trailingIcon = {
                        ExposedDropdownMenuDefaults
                            .TrailingIcon(
                                expanded =
                                    warehouseExpanded
                            )
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor()
                )

                ExposedDropdownMenu(
                    expanded = warehouseExpanded,
                    onDismissRequest = {
                        warehouseExpanded = false
                    }
                ) {
                    warehouses
                        .filter { it.isActive }
                        .sortedWith(
                            compareByDescending<WarehouseListItem> {
                                it.isDefault
                            }.thenBy {
                                it.name.lowercase()
                            }
                        )
                        .forEach { warehouse ->
                            DropdownMenuItem(
                                text = {
                                    Text(
                                        buildString {
                                            append(
                                                warehouse.warehouseCode
                                            )
                                            append(" - ")
                                            append(
                                                warehouse.name
                                            )

                                            if (
                                                warehouse.isDefault
                                            ) {
                                                append(
                                                    " (Default)"
                                                )
                                            }
                                        }
                                    )
                                },
                                onClick = {
                                    warehouseId =
                                        warehouse.id
                                    warehouseExpanded =
                                        false
                                }
                            )
                        }
                }
            }

            OutlinedTextField(
                value = poDate,
                onValueChange = {
                    poDate = it
                },
                label = {
                    Text("PO date *")
                },
                supportingText = {
                    Text("YYYY-MM-DD")
                },
                singleLine = true,
                modifier =
                    Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = expectedDeliveryDate,
                onValueChange = {
                    expectedDeliveryDate = it
                },
                label = {
                    Text("Expected delivery date")
                },
                supportingText = {
                    Text("YYYY-MM-DD")
                },
                singleLine = true,
                modifier =
                    Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = currency,
                onValueChange = {
                    if (it.length <= 3) {
                        currency =
                            it.uppercase()
                    }
                },
                label = {
                    Text("Currency *")
                },
                supportingText = {
                    Text(
                        "3-letter currency code, e.g. EUR"
                    )
                },
                singleLine = true,
                modifier =
                    Modifier.fillMaxWidth()
            )
        }

        PurchaseOrderFormSection(
            title = "Items"
        ) {
            if (lines.isEmpty()) {
                Text(
                    "Add at least one product."
                )
            }

            lines.forEachIndexed {
                    index,
                    line ->

                PurchaseOrderEditableLine(
                    index = index,
                    line = line,
                    products = products,
                    onChooseProduct = {
                        productPickerLine =
                            index
                    },
                    onChange = {
                        lines[index] = it
                    },
                    onRemove = {
                        lines.removeAt(index)
                    }
                )
            }

            OutlinedButton(
                onClick = {
                    lines.add(
                        PurchaseOrderLineInput()
                    )
                },
                modifier =
                    Modifier.fillMaxWidth()
            ) {
                Text("Add product")
            }
        }

        PurchaseOrderFormSection(
            title = "Charges & notes"
        ) {
            OutlinedTextField(
                value = shippingAmount,
                onValueChange = {
                    shippingAmount = it
                },
                label = {
                    Text("Shipping amount")
                },
                prefix = {
                    Text("$currency ")
                },
                keyboardOptions =
                    KeyboardOptions(
                        keyboardType =
                            KeyboardType.Decimal
                    ),
                singleLine = true,
                modifier =
                    Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = notes,
                onValueChange = {
                    if (it.length <= 2000) {
                        notes = it
                    }
                },
                label = {
                    Text("Notes")
                },
                minLines = 3,
                modifier =
                    Modifier.fillMaxWidth()
            )
        }

        if (validationErrors.isNotEmpty()) {
            Card(
                modifier =
                    Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier =
                        Modifier.padding(12.dp),
                    verticalArrangement =
                        Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text =
                            "Please correct the following:",
                        fontWeight =
                            FontWeight.Bold
                    )

                    validationErrors.forEach {
                        Text("• $it")
                    }
                }
            }
        }

        Button(
    onClick = {
        Log.d(
            "PO_DEBUG",
            "CREATE_BUTTON isSaving=$isSaving " +
                "supplierSelected=${supplierId.isNotBlank()} " +
                "warehouseSelected=${warehouseId.isNotBlank()} " +
                "poDate=$poDate " +
                "lineCount=${lines.size}"
        )

        if (isSaving) {
            Log.d(
                "PO_DEBUG",
                "CREATE_BLOCKED_IS_SAVING"
            )
            return@Button
        }

        val input = currentInput()

        val validation =
            PurchaseOrderValidation.validate(input)

        validationErrors = validation.errors

        if (validation.request == null) {
            Log.d(
                "PO_DEBUG",
                "VALIDATION_FAILED errors=${validation.errors}"
            )
        } else {
            Log.d(
                "PO_DEBUG",
                "VALIDATION_SUCCESS"
            )

            onSave(validation.request)
        }
    },
    enabled = !isSaving,
    modifier = Modifier.fillMaxWidth()
) {
    Text(
        if (isSaving) {
            "Saving..."
        } else if (editing) {
            "Save changes"
        } else {
            "Create purchase order"
        }
    )
}

        Spacer(Modifier.height(24.dp))
    }

    productPickerLine?.let { index ->
        if (index in lines.indices) {
            PurchaseOrderProductPicker(
                products = products,
                selectedIds =
                    lines.map {
                        it.itemId
                    }.toSet(),
                currentItemId =
                    lines[index].itemId,
                onDismiss = {
                    productPickerLine = null
                },
                onSelect = { product ->
                    lines[index] =
                        lines[index].copy(
                            itemId = product.id,

                            /*
                             * Deliberately do not use
                             * product.sellingPrice here.
                             *
                             * Selling price is not
                             * purchase cost.
                             */
                            unitPrice =
                                if (
                                    lines[index]
                                        .unitPrice
                                        .isBlank()
                                ) {
                                    "0"
                                } else {
                                    lines[index]
                                        .unitPrice
                                }
                        )

                    productPickerLine = null
                }
            )
        }
    }

    if (showDiscardDialog) {
        AlertDialog(
            onDismissRequest = {
                showDiscardDialog = false
            },
            title = {
                Text("Discard changes?")
            },
            text = {
                Text(
                    "Your unsaved purchase order changes will be lost."
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        showDiscardDialog = false
                        onBack()
                    }
                ) {
                    Text("Discard")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        showDiscardDialog = false
                    }
                ) {
                    Text("Keep editing")
                }
            }
        )
    }
}

private data class PurchaseOrderFormSignature(
    val supplierId: String,
    val warehouseId: String,
    val poDate: String,
    val expectedDeliveryDate: String,
    val currency: String,
    val shippingAmount: String,
    val notes: String,
    val lines: List<PurchaseOrderLineInput>
)

@Composable
private fun PurchaseOrderFormSection(
    title: String,
    content: @Composable () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier =
                Modifier.padding(14.dp),
            verticalArrangement =
                Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = title,
                fontWeight = FontWeight.Bold
            )

            HorizontalDivider()

            content()
        }
    }
}

@Composable
private fun PurchaseOrderEditableLine(
    index: Int,
    line: PurchaseOrderLineInput,
    products: List<ProductListItem>,
    onChooseProduct: () -> Unit,
    onChange: (PurchaseOrderLineInput) -> Unit,
    onRemove: () -> Unit
) {
    val product =
        products.firstOrNull {
            it.id == line.itemId
        }

    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier =
                Modifier.padding(12.dp),
            verticalArrangement =
                Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "Line ${index + 1}",
                fontWeight = FontWeight.Bold
            )

            OutlinedButton(
                onClick = onChooseProduct,
                modifier =
                    Modifier.fillMaxWidth()
            ) {
                Text(
                    product?.let {
                        "${it.sku} - ${it.name}"
                    } ?: "Select product"
                )
            }

            Row(
                modifier =
                    Modifier.fillMaxWidth(),
                horizontalArrangement =
                    Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = line.quantity,
                    onValueChange = {
                        onChange(
                            line.copy(
                                quantity = it
                            )
                        )
                    },
                    label = {
                        Text("Quantity")
                    },
                    keyboardOptions =
                        KeyboardOptions(
                            keyboardType =
                                KeyboardType.Decimal
                        ),
                    singleLine = true,
                    modifier =
                        Modifier.weight(1f)
                )

                OutlinedTextField(
                    value = line.unitPrice,
                    onValueChange = {
                        onChange(
                            line.copy(
                                unitPrice = it
                            )
                        )
                    },
                    label = {
                        Text("Unit price")
                    },
                    keyboardOptions =
                        KeyboardOptions(
                            keyboardType =
                                KeyboardType.Decimal
                        ),
                    singleLine = true,
                    modifier =
                        Modifier.weight(1f)
                )
            }

            Row(
                modifier =
                    Modifier.fillMaxWidth(),
                horizontalArrangement =
                    Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value =
                        line.discountPercentage,
                    onValueChange = {
                        onChange(
                            line.copy(
                                discountPercentage =
                                    it
                            )
                        )
                    },
                    label = {
                        Text("Discount %")
                    },
                    keyboardOptions =
                        KeyboardOptions(
                            keyboardType =
                                KeyboardType.Decimal
                        ),
                    singleLine = true,
                    modifier =
                        Modifier.weight(1f)
                )

                OutlinedTextField(
                    value = line.taxRate,
                    onValueChange = {
                        onChange(
                            line.copy(
                                taxRate = it
                            )
                        )
                    },
                    label = {
                        Text("Tax %")
                    },
                    keyboardOptions =
                        KeyboardOptions(
                            keyboardType =
                                KeyboardType.Decimal
                        ),
                    singleLine = true,
                    modifier =
                        Modifier.weight(1f)
                )
            }

            PurchaseOrderValidation
                .previewLineTotal(
                    quantity = line.quantity,
                    unitPrice = line.unitPrice,
                    discountPercentage =
                        line.discountPercentage,
                    taxRate = line.taxRate
                )
                ?.let {
                    Text(
                        "Estimated line total: $it"
                    )
                }

            TextButton(
                onClick = onRemove
            ) {
                Text("Remove line")
            }
        }
    }
}

@Composable
private fun PurchaseOrderProductPicker(
    products: List<ProductListItem>,
    selectedIds: Set<String>,
    currentItemId: String,
    onDismiss: () -> Unit,
    onSelect: (ProductListItem) -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text("Select product")
        },
        text = {
            Column(
                modifier =
                    Modifier.verticalScroll(
                        rememberScrollState()
                    ),
                verticalArrangement =
                    Arrangement.spacedBy(4.dp)
            ) {
                if (products.isEmpty()) {
                    Text("No products available.")
                }

                products.forEach { product ->
                    val alreadyUsed =
                        product.id in selectedIds &&
                            product.id !=
                                currentItemId

                    TextButton(
                        onClick = {
                            onSelect(product)
                        },
                        enabled = !alreadyUsed,
                        modifier =
                            Modifier.fillMaxWidth()
                    ) {
                        Text(
                            "${product.sku} - ${product.name}"
                        )
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = {
            TextButton(
                onClick = onDismiss
            ) {
                Text("Close")
            }
        }
    )
}

private fun purchaseNumberForInput(
    value: Double
): String {
    if (value == value.toLong().toDouble()) {
        return value.toLong().toString()
    }

    return value.toString()
}