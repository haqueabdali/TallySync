package com.example.tallysyncapp.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.tallysyncapp.data.network.SupplierListItem
import java.text.NumberFormat
import java.util.Locale

@Composable
fun SuppliersScreen(
    state: AppUiState,
    onSearchChange: (String) -> Unit,
    onSearch: () -> Unit,
    onAdd: () -> Unit,
    onOpen: (SupplierListItem) -> Unit
) {
    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("Suppliers", style = MaterialTheme.typography.headlineMedium)
            Button(onClick = onAdd) { Text("Add supplier") }
        }
        OutlinedTextField(
            value = state.supplierSearch,
            onValueChange = onSearchChange,
            label = { Text("Search name, phone, email or tax number") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )
        Button(onClick = onSearch, modifier = Modifier.fillMaxWidth()) { Text("Search") }
        if (state.loading && state.suppliers.isEmpty()) {
            CircularProgressIndicator()
        } else if (state.suppliers.isEmpty()) {
            Text("No suppliers found.")
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(state.suppliers, key = { it.id }) { supplier ->
                    Card(modifier = Modifier.fillMaxWidth().clickable { onOpen(supplier) }) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(supplier.name, style = MaterialTheme.typography.titleMedium)
                            supplier.contactPerson?.let { Text("Contact: $it") }
                            supplier.phone?.let { Text(it) }
                            supplier.email?.let { Text(it) }
                            Text(if (supplier.isActive) "Active" else "Inactive")
                            if (supplier.openingBalance != 0.0) {
                                Text("Opening balance: ${NumberFormat.getCurrencyInstance(Locale.US).format(supplier.openingBalance)}")
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SupplierFormScreen(
    supplier: SupplierListItem?,
    isSaving: Boolean,
    name: String,
    contactPerson: String,
    email: String,
    phone: String,
    address: String,
    taxNumber: String,
    paymentTermsDays: String,
    openingBalance: String,
    notes: String,
    isActive: Boolean,
    onNameChange: (String) -> Unit,
    onContactPersonChange: (String) -> Unit,
    onEmailChange: (String) -> Unit,
    onPhoneChange: (String) -> Unit,
    onAddressChange: (String) -> Unit,
    onTaxNumberChange: (String) -> Unit,
    onPaymentTermsDaysChange: (String) -> Unit,
    onOpeningBalanceChange: (String) -> Unit,
    onNotesChange: (String) -> Unit,
    onToggleActive: () -> Unit,
    onSave: () -> Unit,
    onDelete: (() -> Unit)?,
    onBack: () -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item { Text(if (supplier == null) "Add supplier" else "Edit supplier", style = MaterialTheme.typography.headlineMedium) }
        item { OutlinedTextField(name, onNameChange, label = { Text("Supplier name *") }, modifier = Modifier.fillMaxWidth()) }
        item { OutlinedTextField(contactPerson, onContactPersonChange, label = { Text("Contact person") }, modifier = Modifier.fillMaxWidth()) }
        item { OutlinedTextField(email, onEmailChange, label = { Text("Email") }, modifier = Modifier.fillMaxWidth()) }
        item { OutlinedTextField(phone, onPhoneChange, label = { Text("Phone") }, modifier = Modifier.fillMaxWidth()) }
        item { OutlinedTextField(address, onAddressChange, label = { Text("Address") }, modifier = Modifier.fillMaxWidth(), minLines = 2) }
        item { OutlinedTextField(taxNumber, onTaxNumberChange, label = { Text("Tax/VAT number") }, modifier = Modifier.fillMaxWidth()) }
        item { OutlinedTextField(paymentTermsDays, onPaymentTermsDaysChange, label = { Text("Payment terms (days)") }, modifier = Modifier.fillMaxWidth()) }
        item { OutlinedTextField(openingBalance, onOpeningBalanceChange, label = { Text("Opening balance") }, modifier = Modifier.fillMaxWidth()) }
        item { OutlinedTextField(notes, onNotesChange, label = { Text("Notes") }, modifier = Modifier.fillMaxWidth(), minLines = 3) }
        item { OutlinedButton(onClick = onToggleActive, modifier = Modifier.fillMaxWidth()) { Text(if (isActive) "Status: Active" else "Status: Inactive") } }
        item { Button(onClick = onSave, enabled = !isSaving, modifier = Modifier.fillMaxWidth()) { Text(if (isSaving) "Saving…" else "Save supplier") } }
        if (onDelete != null) item { OutlinedButton(onClick = onDelete, enabled = !isSaving, modifier = Modifier.fillMaxWidth()) { Text("Delete supplier") } }
        item { OutlinedButton(onClick = onBack, modifier = Modifier.fillMaxWidth()) { Text("Back") } }
    }
}

@Composable
fun SupplierEditorRoute(
    supplier: SupplierListItem?,
    isSaving: Boolean,
    onSave: (com.example.tallysyncapp.data.network.SaveSupplierRequest) -> Unit,
    onDelete: (() -> Unit)?,
    onBack: () -> Unit
) {
    var name by androidx.compose.runtime.remember(supplier?.id) { androidx.compose.runtime.mutableStateOf(supplier?.name.orEmpty()) }
    var contactPerson by androidx.compose.runtime.remember(supplier?.id) { androidx.compose.runtime.mutableStateOf(supplier?.contactPerson.orEmpty()) }
    var email by androidx.compose.runtime.remember(supplier?.id) { androidx.compose.runtime.mutableStateOf(supplier?.email.orEmpty()) }
    var phone by androidx.compose.runtime.remember(supplier?.id) { androidx.compose.runtime.mutableStateOf(supplier?.phone.orEmpty()) }
    var address by androidx.compose.runtime.remember(supplier?.id) { androidx.compose.runtime.mutableStateOf(supplier?.address.orEmpty()) }
    var taxNumber by androidx.compose.runtime.remember(supplier?.id) { androidx.compose.runtime.mutableStateOf(supplier?.taxNumber.orEmpty()) }
    var paymentTermsDays by androidx.compose.runtime.remember(supplier?.id) { androidx.compose.runtime.mutableStateOf((supplier?.paymentTermsDays ?: 0).toString()) }
    var openingBalance by androidx.compose.runtime.remember(supplier?.id) { androidx.compose.runtime.mutableStateOf((supplier?.openingBalance ?: 0.0).toString()) }
    var notes by androidx.compose.runtime.remember(supplier?.id) { androidx.compose.runtime.mutableStateOf(supplier?.notes.orEmpty()) }
    var isActive by androidx.compose.runtime.remember(supplier?.id) { androidx.compose.runtime.mutableStateOf(supplier?.isActive ?: true) }

    SupplierFormScreen(
        supplier = supplier,
        isSaving = isSaving,
        name = name,
        contactPerson = contactPerson,
        email = email,
        phone = phone,
        address = address,
        taxNumber = taxNumber,
        paymentTermsDays = paymentTermsDays,
        openingBalance = openingBalance,
        notes = notes,
        isActive = isActive,
        onNameChange = { name = it },
        onContactPersonChange = { contactPerson = it },
        onEmailChange = { email = it },
        onPhoneChange = { phone = it },
        onAddressChange = { address = it },
        onTaxNumberChange = { taxNumber = it },
        onPaymentTermsDaysChange = { paymentTermsDays = it.filter(Char::isDigit) },
        onOpeningBalanceChange = { value -> openingBalance = value.filter { it.isDigit() || it == '.' || it == '-' } },
        onNotesChange = { notes = it },
        onToggleActive = { isActive = !isActive },
        onSave = {
            onSave(
                com.example.tallysyncapp.data.network.SaveSupplierRequest(
                    name = name.trim(),
                    contactPerson = contactPerson.trim().takeIf(String::isNotEmpty),
                    email = email.trim().takeIf(String::isNotEmpty),
                    phone = phone.trim().takeIf(String::isNotEmpty),
                    address = address.trim().takeIf(String::isNotEmpty),
                    taxNumber = taxNumber.trim().takeIf(String::isNotEmpty),
                    paymentTermsDays = paymentTermsDays.toIntOrNull() ?: 0,
                    openingBalance = openingBalance.toDoubleOrNull() ?: 0.0,
                    isActive = isActive,
                    notes = notes.trim().takeIf(String::isNotEmpty)
                )
            )
        },
        onDelete = onDelete,
        onBack = onBack
    )
}
