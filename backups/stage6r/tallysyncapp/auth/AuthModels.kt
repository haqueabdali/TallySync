package com.example.tallysyncapp.auth

data class LoginRequest(
    val email: String,
    val password: String
)

data class RefreshTokenRequest(
    val refreshToken: String,
    val userId: String
)

data class LogoutRequest(
    val refreshToken: String
)

data class AuthUser(
    val id: String,
    val fullName: String,
    val email: String,
    val role: String,
    val companyId: String? = null
)

data class AuthResponse(
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Long,
    val tokenType: String,
    val user: AuthUser
)

data class MessageResponse(val message: String)
