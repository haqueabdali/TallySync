package com.example.tallysyncapp.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
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
import com.example.tallysyncapp.data.network.SaveSupplierRequest
import com.example.tallysyncapp.data.network.SupplierListItem
import java.text.NumberFormat
import java.util.Currency
import java.util.Locale

private val SUPPLIER_EMAIL_REGEX =
    Regex(
        "^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+" +
            "@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?" +
            "(?:\\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$"
    )

/*
 * ============================================================
 * SUPPLIER LIST
 * ============================================================
 */

@Composable
fun SuppliersScreen(
    state: AppUiState,
    onSearchChange: (String) -> Unit,
    onSearch: () -> Unit,
    onAdd: () -> Unit,
    onOpen: (SupplierListItem) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Suppliers",
                style = MaterialTheme.typography.headlineMedium
            )

            Button(
                onClick = onAdd
            ) {
                Text("Add supplier")
            }
        }

        OutlinedTextField(
            value = state.supplierSearch,
            onValueChange = onSearchChange,
            label = {
                Text("Search suppliers")
            },
            supportingText = {
                Text("Search by name, email, phone, tax/VAT number or code.")
            },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            keyboardOptions = KeyboardOptions(
                imeAction = ImeAction.Search
            ),
            keyboardActions = KeyboardActions(
                onSearch = {
                    onSearch()
                }
            )
        )

        Button(
            onClick = onSearch,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Search")
        }

        when {
            state.loading && state.suppliers.isEmpty() -> {
                CircularProgressIndicator()
            }

            state.suppliers.isEmpty() -> {
                Text("No suppliers found.")
            }

            else -> {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(
                        items = state.suppliers,
                        key = { it.id }
                    ) { supplier ->
                        SupplierListCard(
                            supplier = supplier,
                            onClick = {
                                onOpen(supplier)
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SupplierListCard(
    supplier: SupplierListItem,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = supplier.name,
                style = MaterialTheme.typography.titleMedium
            )

            if (supplier.supplierCode.isNotBlank()) {
                Text(
                    text = supplier.supplierCode,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            supplier.companyName
                ?.takeIf { it.isNotBlank() }
                ?.let {
                    Text("Company: $it")
                }

            supplier.contactPerson
                ?.takeIf { it.isNotBlank() }
                ?.let {
                    Text("Contact: $it")
                }

            supplier.phone
                ?.takeIf { it.isNotBlank() }
                ?.let {
                    Text("Phone: $it")
                }

            supplier.mobile
                ?.takeIf { it.isNotBlank() }
                ?.let {
                    Text("Mobile: $it")
                }

            supplier.email
                ?.takeIf { it.isNotBlank() }
                ?.let {
                    Text(it)
                }

            val location = listOfNotNull(
                supplier.city?.takeIf { it.isNotBlank() },
                supplier.country?.takeIf { it.isNotBlank() }
            ).joinToString(", ")

            if (location.isNotBlank()) {
                Text(location)
            }

            Text(
                text =
                    if (supplier.isActive) {
                        "Active"
                    } else {
                        "Inactive"
                    }
            )

            if (supplier.currentBalance != 0.0) {
                Text(
                    text = "Current balance: ${
                        formatSupplierMoney(
                            supplier.currentBalance,
                            supplier.currency
                        )
                    }"
                )
            }
        }
    }
}

/*
 * ============================================================
 * SUPPLIER EDITOR ROUTE
 * ============================================================
 */

@Composable
fun SupplierEditorRoute(
    supplier: SupplierListItem?,
    isSaving: Boolean,
    onSave: (SaveSupplierRequest) -> Unit,
    onDelete: (() -> Unit)?,
    onBack: () -> Unit
) {
    val editId = supplier?.id.orEmpty()

    var name by rememberSaveable(editId) {
        mutableStateOf(supplier?.name.orEmpty())
    }

    var companyName by rememberSaveable(editId) {
        mutableStateOf(supplier?.companyName.orEmpty())
    }

    var contactPerson by rememberSaveable(editId) {
        mutableStateOf(supplier?.contactPerson.orEmpty())
    }

    var email by rememberSaveable(editId) {
        mutableStateOf(supplier?.email.orEmpty())
    }

    var phone by rememberSaveable(editId) {
        mutableStateOf(supplier?.phone.orEmpty())
    }

    var mobile by rememberSaveable(editId) {
        mutableStateOf(supplier?.mobile.orEmpty())
    }

    var taxNumber by rememberSaveable(editId) {
        mutableStateOf(supplier?.taxNumber.orEmpty())
    }

    var vatNumber by rememberSaveable(editId) {
        mutableStateOf(supplier?.vatNumber.orEmpty())
    }

    var billingAddress by rememberSaveable(editId) {
        mutableStateOf(supplier?.billingAddress.orEmpty())
    }

    var shippingAddress by rememberSaveable(editId) {
        mutableStateOf(supplier?.shippingAddress.orEmpty())
    }

    var city by rememberSaveable(editId) {
        mutableStateOf(supplier?.city.orEmpty())
    }

    var stateProvince by rememberSaveable(editId) {
        mutableStateOf(supplier?.state.orEmpty())
    }

    var postalCode by rememberSaveable(editId) {
        mutableStateOf(supplier?.postalCode.orEmpty())
    }

    var country by rememberSaveable(editId) {
        mutableStateOf(supplier?.country.orEmpty())
    }

    var creditLimit by rememberSaveable(editId) {
        mutableStateOf(
            supplier?.creditLimit?.toString() ?: "0"
        )
    }

    var openingBalance by rememberSaveable(editId) {
        mutableStateOf(
            supplier?.openingBalance?.toString() ?: "0"
        )
    }

    var currency by rememberSaveable(editId) {
        mutableStateOf(
            supplier?.currency
                ?.takeIf { it.isNotBlank() }
                ?: "EUR"
        )
    }

    var paymentTerms by rememberSaveable(editId) {
        mutableStateOf(
            supplier?.paymentTerms?.toString() ?: "0"
        )
    }

    var notes by rememberSaveable(editId) {
        mutableStateOf(supplier?.notes.orEmpty())
    }

    var isActive by rememberSaveable(editId) {
        mutableStateOf(supplier?.isActive ?: true)
    }

    var showDiscardDialog by rememberSaveable(editId) {
        mutableStateOf(false)
    }

    var showDeleteDialog by rememberSaveable(editId) {
        mutableStateOf(false)
    }

    val validation = validateSupplierForm(
        name = name,
        companyName = companyName,
        contactPerson = contactPerson,
        email = email,
        phone = phone,
        mobile = mobile,
        taxNumber = taxNumber,
        vatNumber = vatNumber,
        billingAddress = billingAddress,
        shippingAddress = shippingAddress,
        city = city,
        state = stateProvince,
        postalCode = postalCode,
        country = country,
        creditLimit = creditLimit,
        openingBalance = openingBalance,
        currency = currency,
        paymentTerms = paymentTerms,
        notes = notes
    )

    val hasUnsavedChanges =
        name != supplier?.name.orEmpty() ||
            companyName != supplier?.companyName.orEmpty() ||
            contactPerson != supplier?.contactPerson.orEmpty() ||
            email != supplier?.email.orEmpty() ||
            phone != supplier?.phone.orEmpty() ||
            mobile != supplier?.mobile.orEmpty() ||
            taxNumber != supplier?.taxNumber.orEmpty() ||
            vatNumber != supplier?.vatNumber.orEmpty() ||
            billingAddress != supplier?.billingAddress.orEmpty() ||
            shippingAddress != supplier?.shippingAddress.orEmpty() ||
            city != supplier?.city.orEmpty() ||
            stateProvince != supplier?.state.orEmpty() ||
            postalCode != supplier?.postalCode.orEmpty() ||
            country != supplier?.country.orEmpty() ||
            creditLimit !=
            (supplier?.creditLimit?.toString() ?: "0") ||
            openingBalance !=
            (supplier?.openingBalance?.toString() ?: "0") ||
            currency !=
            (supplier?.currency
                ?.takeIf { it.isNotBlank() } ?: "EUR") ||
            paymentTerms !=
            (supplier?.paymentTerms?.toString() ?: "0") ||
            notes != supplier?.notes.orEmpty() ||
            isActive != (supplier?.isActive ?: true)

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
                    "You have unsaved supplier changes. " +
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

    if (showDeleteDialog && onDelete != null) {
        AlertDialog(
            onDismissRequest = {
                showDeleteDialog = false
            },
            title = {
                Text("Delete supplier?")
            },
            text = {
                Text(
                    "This supplier will be removed from the normal supplier list."
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteDialog = false
                        onDelete()
                    },
                    enabled = !isSaving
                ) {
                    Text("Delete")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        showDeleteDialog = false
                    }
                ) {
                    Text("Cancel")
                }
            }
        )
    }

    SupplierFormScreen(
        supplier = supplier,
        isSaving = isSaving,
        name = name,
        companyName = companyName,
        contactPerson = contactPerson,
        email = email,
        phone = phone,
        mobile = mobile,
        taxNumber = taxNumber,
        vatNumber = vatNumber,
        billingAddress = billingAddress,
        shippingAddress = shippingAddress,
        city = city,
        stateProvince = stateProvince,
        postalCode = postalCode,
        country = country,
        creditLimit = creditLimit,
        openingBalance = openingBalance,
        currency = currency,
        paymentTerms = paymentTerms,
        notes = notes,
        isActive = isActive,
        validation = validation,
        onNameChange = {
            name = it
        },
        onCompanyNameChange = {
            companyName = it
        },
        onContactPersonChange = {
            contactPerson = it
        },
        onEmailChange = {
            email = it
        },
        onPhoneChange = {
            phone = it
        },
        onMobileChange = {
            mobile = it
        },
        onTaxNumberChange = {
            taxNumber = it
        },
        onVatNumberChange = {
            vatNumber = it
        },
        onBillingAddressChange = {
            billingAddress = it
        },
        onShippingAddressChange = {
            shippingAddress = it
        },
        onCityChange = {
            city = it
        },
        onStateProvinceChange = {
            stateProvince = it
        },
        onPostalCodeChange = {
            postalCode = it
        },
        onCountryChange = {
            country = it
        },
        onCreditLimitChange = {
            creditLimit = it
        },
        onOpeningBalanceChange = {
            openingBalance = it
        },
        onCurrencyChange = {
            currency = it
        },
        onPaymentTermsChange = {
            paymentTerms = it
        },
        onNotesChange = {
            notes = it
        },
        onActiveChange = {
            isActive = it
        },
        onSave = {
            if (!validation.isValid || isSaving) {
                return@SupplierFormScreen
            }

            val parsedCredit =
                parseSupplierNumber(creditLimit)
                    ?: return@SupplierFormScreen

            val parsedOpeningBalance =
                parseSupplierNumber(openingBalance)
                    ?: return@SupplierFormScreen

            val parsedPaymentTerms =
                paymentTerms.trim().toIntOrNull()
                    ?: return@SupplierFormScreen

            onSave(
                SaveSupplierRequest(
                    name = name.trim(),
                    companyName =
                        optionalSupplierText(companyName),
                    contactPerson =
                        optionalSupplierText(contactPerson),
                    email =
                        optionalSupplierText(email),
                    phone =
                        optionalSupplierText(phone),
                    mobile =
                        optionalSupplierText(mobile),
                    taxNumber =
                        optionalSupplierText(taxNumber),
                    vatNumber =
                        optionalSupplierText(vatNumber),
                    billingAddress =
                        optionalSupplierText(billingAddress),
                    shippingAddress =
                        optionalSupplierText(shippingAddress),
                    city =
                        optionalSupplierText(city),
                    state =
                        optionalSupplierText(stateProvince),
                    postalCode =
                        optionalSupplierText(postalCode),
                    country =
                        optionalSupplierText(country),
                    creditLimit = parsedCredit,
                    openingBalance = parsedOpeningBalance,
                    currency = currency
                        .trim()
                        .uppercase(),
                    paymentTerms = parsedPaymentTerms,
                    notes =
                        optionalSupplierText(notes),
                    isActive = isActive
                )
            )
        },
        onDelete = if (onDelete != null) {
            {
                showDeleteDialog = true
            }
        } else {
            null
        },
        onBack = {
            requestBack()
        }
    )
}

/*
 * ============================================================
 * SUPPLIER FORM
 * ============================================================
 */

@Composable
fun SupplierFormScreen(
    supplier: SupplierListItem?,
    isSaving: Boolean,
    name: String,
    companyName: String,
    contactPerson: String,
    email: String,
    phone: String,
    mobile: String,
    taxNumber: String,
    vatNumber: String,
    billingAddress: String,
    shippingAddress: String,
    city: String,
    stateProvince: String,
    postalCode: String,
    country: String,
    creditLimit: String,
    openingBalance: String,
    currency: String,
    paymentTerms: String,
    notes: String,
    isActive: Boolean,
    validation: SupplierFormValidation,
    onNameChange: (String) -> Unit,
    onCompanyNameChange: (String) -> Unit,
    onContactPersonChange: (String) -> Unit,
    onEmailChange: (String) -> Unit,
    onPhoneChange: (String) -> Unit,
    onMobileChange: (String) -> Unit,
    onTaxNumberChange: (String) -> Unit,
    onVatNumberChange: (String) -> Unit,
    onBillingAddressChange: (String) -> Unit,
    onShippingAddressChange: (String) -> Unit,
    onCityChange: (String) -> Unit,
    onStateProvinceChange: (String) -> Unit,
    onPostalCodeChange: (String) -> Unit,
    onCountryChange: (String) -> Unit,
    onCreditLimitChange: (String) -> Unit,
    onOpeningBalanceChange: (String) -> Unit,
    onCurrencyChange: (String) -> Unit,
    onPaymentTermsChange: (String) -> Unit,
    onNotesChange: (String) -> Unit,
    onActiveChange: (Boolean) -> Unit,
    onSave: () -> Unit,
    onDelete: (() -> Unit)?,
    onBack: () -> Unit
) {
    val focusManager = LocalFocusManager.current

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text(
                text =
                    if (supplier == null) {
                        "Add supplier"
                    } else {
                        "Edit supplier"
                    },
                style = MaterialTheme.typography.headlineMedium
            )
        }

        if (supplier != null) {
            item {
                Text(
                    text = "Supplier code: ${supplier.supplierCode}",
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }

        item {
            SupplierSectionTitle("Supplier information")
        }

        item {
            SupplierTextField(
                value = name,
                onValueChange = onNameChange,
                label = "Supplier name *",
                errorMessage = validation.nameError,
                imeAction = ImeAction.Next,
                onNext = {
                    focusManager.moveFocus(FocusDirection.Down)
                }
            )
        }

        item {
            SupplierTextField(
                value = companyName,
                onValueChange = onCompanyNameChange,
                label = "Company name",
                errorMessage = validation.companyNameError,
                imeAction = ImeAction.Next,
                onNext = {
                    focusManager.moveFocus(FocusDirection.Down)
                }
            )
        }

        item {
            SupplierTextField(
                value = contactPerson,
                onValueChange = onContactPersonChange,
                label = "Contact person",
                errorMessage = validation.contactPersonError,
                imeAction = ImeAction.Next,
                onNext = {
                    focusManager.moveFocus(FocusDirection.Down)
                }
            )
        }

        item {
            SupplierSectionTitle("Contact")
        }

        item {
            SupplierTextField(
                value = email,
                onValueChange = onEmailChange,
                label = "Email",
                errorMessage = validation.emailError,
                keyboardType = KeyboardType.Email,
                imeAction = ImeAction.Next,
                onNext = {
                    focusManager.moveFocus(FocusDirection.Down)
                }
            )
        }

        item {
            SupplierTextField(
                value = phone,
                onValueChange = onPhoneChange,
                label = "Phone",
                errorMessage = validation.phoneError,
                keyboardType = KeyboardType.Phone,
                imeAction = ImeAction.Next,
                onNext = {
                    focusManager.moveFocus(FocusDirection.Down)
                }
            )
        }

        item {
            SupplierTextField(
                value = mobile,
                onValueChange = onMobileChange,
                label = "Mobile",
                errorMessage = validation.mobileError,
                keyboardType = KeyboardType.Phone,
                imeAction = ImeAction.Next,
                onNext = {
                    focusManager.moveFocus(FocusDirection.Down)
                }
            )
        }

        item {
            SupplierSectionTitle("Tax")
        }

        item {
            SupplierTextField(
                value = taxNumber,
                onValueChange = onTaxNumberChange,
                label = "Tax number",
                errorMessage = validation.taxNumberError,
                imeAction = ImeAction.Next,
                onNext = {
                    focusManager.moveFocus(FocusDirection.Down)
                }
            )
        }

        item {
            SupplierTextField(
                value = vatNumber,
                onValueChange = onVatNumberChange,
                label = "VAT number",
                errorMessage = validation.vatNumberError,
                imeAction = ImeAction.Next,
                onNext = {
                    focusManager.moveFocus(FocusDirection.Down)
                }
            )
        }

        item {
            SupplierSectionTitle("Address")
        }

        item {
            SupplierTextField(
                value = billingAddress,
                onValueChange = onBillingAddressChange,
                label = "Billing address",
                errorMessage = validation.billingAddressError,
                singleLine = false,
                minLines = 2,
                imeAction = ImeAction.Default
            )
        }

        item {
            SupplierTextField(
                value = shippingAddress,
                onValueChange = onShippingAddressChange,
                label = "Shipping address",
                errorMessage = validation.shippingAddressError,
                singleLine = false,
                minLines = 2,
                imeAction = ImeAction.Default
            )
        }

        item {
            SupplierTextField(
                value = city,
                onValueChange = onCityChange,
                label = "City",
                errorMessage = validation.cityError,
                imeAction = ImeAction.Next,
                onNext = {
                    focusManager.moveFocus(FocusDirection.Down)
                }
            )
        }

        item {
            SupplierTextField(
                value = stateProvince,
                onValueChange = onStateProvinceChange,
                label = "State / Province",
                errorMessage = validation.stateError,
                imeAction = ImeAction.Next,
                onNext = {
                    focusManager.moveFocus(FocusDirection.Down)
                }
            )
        }

        item {
            SupplierTextField(
                value = postalCode,
                onValueChange = onPostalCodeChange,
                label = "Postal code",
                errorMessage = validation.postalCodeError,
                imeAction = ImeAction.Next,
                onNext = {
                    focusManager.moveFocus(FocusDirection.Down)
                }
            )
        }

        item {
            SupplierTextField(
                value = country,
                onValueChange = onCountryChange,
                label = "Country",
                errorMessage = validation.countryError,
                imeAction = ImeAction.Next,
                onNext = {
                    focusManager.moveFocus(FocusDirection.Down)
                }
            )
        }

        item {
            SupplierSectionTitle("Accounting")
        }

        item {
            SupplierNumericField(
                value = creditLimit,
                onValueChange = onCreditLimitChange,
                label = "Credit limit",
                errorMessage = validation.creditLimitError
            )
        }

        item {
            SupplierNumericField(
                value = openingBalance,
                onValueChange = onOpeningBalanceChange,
                label = "Opening balance",
                errorMessage = validation.openingBalanceError,
                allowNegative = true
            )
        }

        item {
            SupplierTextField(
                value = currency,
                onValueChange = onCurrencyChange,
                label = "Currency *",
                errorMessage = validation.currencyError,
                supportingMessage =
                    if (
                        currency.isNotBlank() &&
                        currency != currency.trim().uppercase()
                    ) {
                        "Will be saved as ${currency.trim().uppercase()}"
                    } else {
                        "Use a 3-letter currency code, e.g. EUR."
                    },
                imeAction = ImeAction.Next,
                onNext = {
                    focusManager.moveFocus(FocusDirection.Down)
                }
            )
        }

        item {
            OutlinedTextField(
                value = paymentTerms,
                onValueChange = onPaymentTermsChange,
                label = {
                    Text("Payment terms (days)")
                },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Number,
                    imeAction = ImeAction.Next
                ),
                keyboardActions = KeyboardActions(
                    onNext = {
                        focusManager.moveFocus(FocusDirection.Down)
                    }
                ),
                isError = validation.paymentTermsError != null,
                supportingText = {
                    validation.paymentTermsError?.let {
                        Text(it)
                    }
                }
            )
        }

        item {
            if (supplier != null) {
                Column(
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        "Current balance",
                        style = MaterialTheme.typography.labelLarge
                    )

                    Text(
                        formatSupplierMoney(
                            supplier.currentBalance,
                            supplier.currency
                        ),
                        style = MaterialTheme.typography.titleMedium
                    )

                    Text(
                        "Current balance is maintained by accounting transactions.",
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }

        item {
            SupplierSectionTitle("Other")
        }

        item {
            SupplierTextField(
                value = notes,
                onValueChange = onNotesChange,
                label = "Notes",
                errorMessage = validation.notesError,
                singleLine = false,
                minLines = 3,
                imeAction = ImeAction.Default
            )
        }

        item {
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
                        text =
                            if (isActive) {
                                "Supplier can be used normally."
                            } else {
                                "Supplier is inactive."
                            },
                        style = MaterialTheme.typography.bodySmall
                    )
                }

                Switch(
                    checked = isActive,
                    onCheckedChange = onActiveChange
                )
            }
        }

        item {
            HorizontalDivider()
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedButton(
                    onClick = onBack,
                    enabled = !isSaving,
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Cancel")
                }

                Button(
                    onClick = onSave,
                    enabled = validation.isValid && !isSaving,
                    modifier = Modifier.weight(1f)
                ) {
                    Text(
                        when {
                            isSaving ->
                                "Saving…"

                            supplier == null ->
                                "Save supplier"

                            else ->
                                "Update supplier"
                        }
                    )
                }
            }
        }

        if (onDelete != null) {
            item {
                OutlinedButton(
                    onClick = onDelete,
                    enabled = !isSaving,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Delete supplier")
                }
            }
        }
    }
}

/*
 * ============================================================
 * VALIDATION
 * ============================================================
 */



/*
 * ============================================================
 * REUSABLE FORM COMPONENTS
 * ============================================================
 */

@Composable
private fun SupplierSectionTitle(
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
private fun SupplierTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    errorMessage: String?,
    supportingMessage: String? = null,
    keyboardType: KeyboardType = KeyboardType.Text,
    singleLine: Boolean = true,
    minLines: Int = 1,
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
        singleLine = singleLine,
        minLines = minLines,
        keyboardOptions = KeyboardOptions(
            keyboardType = keyboardType,
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

@Composable
private fun SupplierNumericField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    errorMessage: String?,
    allowNegative: Boolean = false
) {
    OutlinedTextField(
        value = value,
        onValueChange = { newValue ->
            val allowed =
                newValue.all {
                    it.isDigit() ||
                        it == '.' ||
                        it == ',' ||
                        (allowNegative && it == '-')
                }

            if (allowed) {
                onValueChange(newValue)
            }
        },
        label = {
            Text(label)
        },
        modifier = Modifier.fillMaxWidth(),
        singleLine = true,
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.Decimal
        ),
        isError = errorMessage != null,
        supportingText = {
            errorMessage?.let {
                Text(it)
            }
        }
    )
}

/*
 * ============================================================
 * DISPLAY HELPERS
 * ============================================================
 */

private fun formatSupplierMoney(
    value: Double,
    currencyCode: String
): String {
    return try {
        val formatter =
            NumberFormat.getCurrencyInstance(
                Locale.getDefault()
            )

        formatter.currency =
            Currency.getInstance(
                currencyCode
                    .trim()
                    .uppercase()
                    .takeIf { it.length == 3 }
                    ?: "EUR"
            )

        formatter.format(value)
    } catch (_: Exception) {
        String.format(
            Locale.US,
            "%.2f %s",
            value,
            currencyCode.ifBlank { "EUR" }
        )
    }
}