package com.example.tallysyncapp.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.tallysyncapp.data.network.ProductRecord
import com.example.tallysyncapp.data.network.SaveProductRequest

@Composable
fun ProductFormScreen(
    isSaving: Boolean,
    product: ProductRecord? = null,
    onSave: (SaveProductRequest) -> Unit,
    onBack: () -> Unit
) {
    val editId = product?.id.orEmpty()
    val focusManager = LocalFocusManager.current

    var sku by rememberSaveable(editId) {
        mutableStateOf(product?.sku.orEmpty())
    }

    var name by rememberSaveable(editId) {
        mutableStateOf(product?.name.orEmpty())
    }

    var barcode by rememberSaveable(editId) {
        mutableStateOf(product?.barcode.orEmpty())
    }

    var description by rememberSaveable(editId) {
        mutableStateOf(product?.description.orEmpty())
    }

    var unit by rememberSaveable(editId) {
        mutableStateOf(product?.unit ?: "PCS")
    }

    var purchasePrice by rememberSaveable(editId) {
        mutableStateOf(product?.purchasePrice?.toString() ?: "0")
    }

    var sellingPrice by rememberSaveable(editId) {
        mutableStateOf(product?.sellingPrice?.toString() ?: "0")
    }

    var taxRate by rememberSaveable(editId) {
        mutableStateOf(product?.taxRate?.toString() ?: "0")
    }

    var openingStock by rememberSaveable(editId) {
        mutableStateOf(product?.openingStock?.toString() ?: "0")
    }

    var minimumStock by rememberSaveable(editId) {
        mutableStateOf(product?.minimumStock?.toString() ?: "0")
    }

    var hsnCode by rememberSaveable(editId) {
        mutableStateOf(product?.hsnCode.orEmpty())
    }

    var trackInventory by rememberSaveable(editId) {
        mutableStateOf(product?.trackInventory ?: true)
    }

    var isActive by rememberSaveable(editId) {
        mutableStateOf(product?.isActive ?: true)
    }

    var showDiscardDialog by rememberSaveable(editId) {
        mutableStateOf(false)
    }

    val validation = validateProductForm(
        sku = sku,
        name = name,
        unit = unit,
        barcode = barcode,
        description = description,
        hsnCode = hsnCode,
        purchasePrice = purchasePrice,
        sellingPrice = sellingPrice,
        taxRate = taxRate,
        openingStock = openingStock,
        minimumStock = minimumStock
    )

    val initialSku = product?.sku.orEmpty()
    val initialName = product?.name.orEmpty()
    val initialBarcode = product?.barcode.orEmpty()
    val initialDescription = product?.description.orEmpty()
    val initialUnit = product?.unit ?: "PCS"
    val initialPurchasePrice = product?.purchasePrice?.toString() ?: "0"
    val initialSellingPrice = product?.sellingPrice?.toString() ?: "0"
    val initialTaxRate = product?.taxRate?.toString() ?: "0"
    val initialOpeningStock = product?.openingStock?.toString() ?: "0"
    val initialMinimumStock = product?.minimumStock?.toString() ?: "0"
    val initialHsnCode = product?.hsnCode.orEmpty()
    val initialTrackInventory = product?.trackInventory ?: true
    val initialIsActive = product?.isActive ?: true

    val hasUnsavedChanges =
        sku != initialSku ||
            name != initialName ||
            barcode != initialBarcode ||
            description != initialDescription ||
            unit != initialUnit ||
            purchasePrice != initialPurchasePrice ||
            sellingPrice != initialSellingPrice ||
            taxRate != initialTaxRate ||
            openingStock != initialOpeningStock ||
            minimumStock != initialMinimumStock ||
            hsnCode != initialHsnCode ||
            trackInventory != initialTrackInventory ||
            isActive != initialIsActive

    fun requestBack() {
        if (isSaving) {
            return
        }

        if (hasUnsavedChanges) {
            showDiscardDialog = true
        } else {
            onBack()
        }
    }

    BackHandler(
        enabled = hasUnsavedChanges && !isSaving
    ) {
        showDiscardDialog = true
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
                    "You have unsaved product changes. " +
                        "If you leave now, those changes will be lost."
                )
            },
            confirmButton = {
                TextButton(
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

    Column(
        modifier = Modifier
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text =
                if (product == null) {
                    "Add product"
                } else {
                    "Edit product"
                },
            style = MaterialTheme.typography.headlineMedium
        )

        FormSectionTitle("Basic information")

        ProductTextField(
            value = sku,
            onValueChange = { sku = it },
            label = "SKU *",
            errorMessage = validation.skuError,
            imeAction = ImeAction.Next,
            onNext = {
                focusManager.moveFocus(FocusDirection.Down)
            }
        )

        ProductTextField(
            value = name,
            onValueChange = { name = it },
            label = "Product name *",
            errorMessage = validation.nameError,
            imeAction = ImeAction.Next,
            onNext = {
                focusManager.moveFocus(FocusDirection.Down)
            }
        )

        ProductTextField(
            value = barcode,
            onValueChange = { barcode = it },
            label = "Barcode",
            errorMessage = validation.barcodeError,
            imeAction = ImeAction.Next,
            onNext = {
                focusManager.moveFocus(FocusDirection.Down)
            }
        )

        ProductTextField(
            value = description,
            onValueChange = { description = it },
            label = "Description",
            errorMessage = validation.descriptionError,
            singleLine = false,
            minLines = 2,
            imeAction = ImeAction.Default
        )

        ProductTextField(
            value = unit,
            onValueChange = { unit = it },
            label = "Unit *",
            errorMessage = validation.unitError,
            supportingMessage =
                if (
                    validation.unitError == null &&
                    unit.isNotBlank() &&
                    unit != normalizeProductUnit(unit)
                ) {
                    "Will be saved as ${normalizeProductUnit(unit)}"
                } else {
                    null
                },
            imeAction = ImeAction.Next,
            onNext = {
                focusManager.moveFocus(FocusDirection.Down)
            }
        )

        FormSectionTitle("Pricing")

        ProductNumericField(
            label = "Purchase price (€)",
            value = purchasePrice,
            onValueChange = { purchasePrice = it },
            errorMessage = validation.purchasePriceError,
            imeAction = ImeAction.Next,
            onNext = {
                focusManager.moveFocus(FocusDirection.Down)
            }
        )

        ProductNumericField(
            label = "Selling price (€)",
            value = sellingPrice,
            onValueChange = { sellingPrice = it },
            errorMessage = validation.sellingPriceError,
            imeAction = ImeAction.Next,
            onNext = {
                focusManager.moveFocus(FocusDirection.Down)
            }
        )

        FormSectionTitle("Inventory")

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text("Track inventory")
                Text(
                    "Maintain stock quantity for this product.",
                    style = MaterialTheme.typography.bodySmall
                )
            }

            Switch(
                checked = trackInventory,
                onCheckedChange = {
                    trackInventory = it
                }
            )
        }

        ProductNumericField(
            label = "Opening stock",
            value = openingStock,
            onValueChange = { openingStock = it },
            errorMessage = validation.openingStockError,
            enabled = trackInventory,
            supportingMessage =
                if (!trackInventory) {
                    "Inventory tracking is disabled."
                } else {
                    null
                },
            imeAction = ImeAction.Next,
            onNext = {
                focusManager.moveFocus(FocusDirection.Down)
            }
        )

        ProductNumericField(
            label = "Minimum stock",
            value = minimumStock,
            onValueChange = { minimumStock = it },
            errorMessage = validation.minimumStockError,
            enabled = trackInventory,
            supportingMessage =
                if (!trackInventory) {
                    "Inventory tracking is disabled."
                } else {
                    "Used for low-stock warnings."
                },
            imeAction = ImeAction.Next,
            onNext = {
                focusManager.moveFocus(FocusDirection.Down)
            }
        )

        FormSectionTitle("Tax & other")

        ProductNumericField(
            label = "Tax rate (%)",
            value = taxRate,
            onValueChange = { taxRate = it },
            errorMessage = validation.taxRateError,
            imeAction = ImeAction.Next,
            onNext = {
                focusManager.moveFocus(FocusDirection.Down)
            }
        )

        ProductTextField(
            value = hsnCode,
            onValueChange = { hsnCode = it },
            label = "HSN code",
            errorMessage = validation.hsnCodeError,
            imeAction = ImeAction.Done,
            onDone = {
                focusManager.clearFocus()
            }
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text("Active")
                Text(
                    if (isActive) {
                        "Product is available for normal use."
                    } else {
                        "Product is inactive."
                    },
                    style = MaterialTheme.typography.bodySmall
                )
            }

            Switch(
                checked = isActive,
                onCheckedChange = {
                    isActive = it
                }
            )
        }

        HorizontalDivider()

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            OutlinedButton(
                onClick = {
                    requestBack()
                },
                enabled = !isSaving,
                modifier = Modifier.weight(1f)
            ) {
                Text("Cancel")
            }

            Button(
                onClick = {
                    if (!validation.isValid || isSaving) {
                        return@Button
                    }

                    val numbers = productFormNumbersOrNull(
                        purchasePrice = purchasePrice,
                        sellingPrice = sellingPrice,
                        taxRate = taxRate,
                        openingStock = openingStock,
                        minimumStock = minimumStock
                    ) ?: return@Button

                    focusManager.clearFocus()

                    onSave(
                        SaveProductRequest(
                            sku = normalizeProductSku(sku),
                            barcode = normalizeOptionalProductText(barcode),
                            name = normalizeProductName(name),
                            description =
                                normalizeOptionalProductText(description),
                            unit = normalizeProductUnit(unit),
                            purchasePrice = numbers.purchasePrice,
                            sellingPrice = numbers.sellingPrice,
                            taxRate = numbers.taxRate,
                            openingStock = numbers.openingStock,
                            minimumStock = numbers.minimumStock,
                            trackInventory = trackInventory,
                            hsnCode = normalizeOptionalProductText(hsnCode),
                            isActive = isActive
                        )
                    )
                },
                enabled = validation.isValid && !isSaving,
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    when {
                        isSaving -> "Saving…"
                        product == null -> "Save product"
                        else -> "Update product"
                    }
                )
            }
        }
    }
}

@Composable
private fun FormSectionTitle(
    title: String
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 8.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium
        )

        HorizontalDivider()
    }
}

@Composable
private fun ProductTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    errorMessage: String?,
    supportingMessage: String? = null,
    singleLine: Boolean = true,
    minLines: Int = 1,
    imeAction: ImeAction = ImeAction.Next,
    onNext: (() -> Unit)? = null,
    onDone: (() -> Unit)? = null
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = {
            Text(label)
        },
        modifier = Modifier.fillMaxWidth(),
        singleLine = singleLine,
        minLines = minLines,
        isError = errorMessage != null,
        keyboardOptions = KeyboardOptions(
            imeAction = imeAction
        ),
        keyboardActions = KeyboardActions(
            onNext = {
                onNext?.invoke()
            },
            onDone = {
                onDone?.invoke()
            }
        ),
        supportingText = {
            when {
                errorMessage != null ->
                    Text(errorMessage)

                supportingMessage != null ->
                    Text(supportingMessage)
            }
        }
    )
}

@Composable
private fun ProductNumericField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    errorMessage: String?,
    enabled: Boolean = true,
    supportingMessage: String? = null,
    imeAction: ImeAction = ImeAction.Next,
    onNext: (() -> Unit)? = null
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = {
            Text(label)
        },
        modifier = Modifier.fillMaxWidth(),
        enabled = enabled,
        singleLine = true,
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.Decimal,
            imeAction = imeAction
        ),
        keyboardActions = KeyboardActions(
            onNext = {
                onNext?.invoke()
            }
        ),
        isError = errorMessage != null,
        supportingText = {
            when {
                errorMessage != null ->
                    Text(errorMessage)

                supportingMessage != null ->
                    Text(supportingMessage)
            }
        }
    )
}