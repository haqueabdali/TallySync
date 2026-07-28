package com.example.tallysyncapp.model

data class CustomerListItem(
    val id: String,
    val code: String,
    val name: String,
    val phone: String? = null,
    val email: String? = null,
    val address: String? = null,
    val creditLimit: Double = 0.0,
    val outstandingBalance: Double = 0.0
)
