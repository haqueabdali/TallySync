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
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.tallysyncapp.data.network.CustomerRecord
import com.example.tallysyncapp.data.network.SaveCustomerRequest

@Composable
fun CustomerFormScreen(
    isSaving: Boolean,
    customer: CustomerRecord? = null,
    onSave: (SaveCustomerRequest) -> Unit,
    onBack: () -> Unit
) {
    val editId = customer?.id.orEmpty()
    val focusManager = LocalFocusManager.current

    var name by rememberSaveable(editId) {
        mutableStateOf(customer?.name.orEmpty())
    }

    var email by rememberSaveable(editId) {
        mutableStateOf(customer?.email.orEmpty())
    }

    var phone by rememberSaveable(editId) {
        mutableStateOf(customer?.phone.orEmpty())
    }

    var address by rememberSaveable(editId) {
        mutableStateOf(customer?.address.orEmpty())
    }

    var tallyLedgerName by rememberSaveable(editId) {
        mutableStateOf(customer?.tallyLedgerName.orEmpty())
    }

    var creditLimit by rememberSaveable(editId) {
        mutableStateOf(customer?.creditLimit?.toString() ?: "0")
    }

    var showDiscardDialog by rememberSaveable(editId) {
        mutableStateOf(false)
    }

    val validation = validateCustomerForm(
        name = name,
        email = email,
        phone = phone,
        address = address,
        tallyLedgerName = tallyLedgerName,
        creditLimit = creditLimit
    )

    val initialName = customer?.name.orEmpty()
    val initialEmail = customer?.email.orEmpty()
    val initialPhone = customer?.phone.orEmpty()
    val initialAddress = customer?.address.orEmpty()
    val initialTallyLedgerName = customer?.tallyLedgerName.orEmpty()
    val initialCreditLimit =
        customer?.creditLimit?.toString() ?: "0"

    val hasUnsavedChanges =
        name != initialName ||
            email != initialEmail ||
            phone != initialPhone ||
            address != initialAddress ||
            tallyLedgerName != initialTallyLedgerName ||
            creditLimit != initialCreditLimit

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
                    "You have unsaved customer changes. " +
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
                if (customer == null) {
                    "Add customer"
                } else {
                    "Edit customer"
                },
            style = MaterialTheme.typography.headlineMedium
        )

        CustomerSectionTitle("Customer information")

        CustomerTextField(
            value = name,
            onValueChange = { name = it },
            label = "Name *",
            errorMessage = validation.nameError,
            imeAction = ImeAction.Next,
            onNext = {
                focusManager.moveFocus(FocusDirection.Down)
            }
        )

        CustomerTextField(
            value = email,
            onValueChange = { email = it },
            label = "Email",
            errorMessage = validation.emailError,
            keyboardType = KeyboardType.Email,
            imeAction = ImeAction.Next,
            onNext = {
                focusManager.moveFocus(FocusDirection.Down)
            }
        )

        CustomerTextField(
            value = phone,
            onValueChange = { phone = it },
            label = "Phone",
            errorMessage = validation.phoneError,
            keyboardType = KeyboardType.Phone,
            imeAction = ImeAction.Next,
            onNext = {
                focusManager.moveFocus(FocusDirection.Down)
            }
        )

        CustomerTextField(
            value = address,
            onValueChange = { address = it },
            label = "Address",
            errorMessage = validation.addressError,
            singleLine = false,
            minLines = 2,
            imeAction = ImeAction.Default
        )

        CustomerSectionTitle("Accounting")

        CustomerTextField(
            value = tallyLedgerName,
            onValueChange = { tallyLedgerName = it },
            label = "Tally ledger name",
            errorMessage = validation.tallyLedgerNameError,
            supportingMessage =
                "Leave blank to use the customer name.",
            imeAction = ImeAction.Next,
            onNext = {
                focusManager.moveFocus(FocusDirection.Down)
            }
        )

        OutlinedTextField(
            value = creditLimit,
            onValueChange = {
                creditLimit = it
            },
            label = {
                Text("Credit limit (€)")
            },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Decimal,
                imeAction = ImeAction.Done
            ),
            keyboardActions = KeyboardActions(
                onDone = {
                    focusManager.clearFocus()
                }
            ),
            isError = validation.creditLimitError != null,
            supportingText = {
                validation.creditLimitError?.let {
                    Text(it)
                }
            }
        )

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

                    val parsedCreditLimit =
                        parseCustomerCreditLimit(creditLimit)
                            ?: return@Button

                    focusManager.clearFocus()

                    onSave(
                        SaveCustomerRequest(
                            name = normalizeCustomerName(name),
                            email = normalizeCustomerEmail(email),
                            phone = normalizeOptionalCustomerText(phone),
                            address = normalizeOptionalCustomerText(address),
                            tallyLedgerName =
                                normalizeOptionalCustomerText(
                                    tallyLedgerName
                                ),
                            creditLimit = parsedCreditLimit
                        )
                    )
                },
                enabled = validation.isValid && !isSaving,
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    when {
                        isSaving -> "Saving…"
                        customer == null -> "Save customer"
                        else -> "Update customer"
                    }
                )
            }
        }
    }
}

@Composable
private fun CustomerSectionTitle(
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
private fun CustomerTextField(
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