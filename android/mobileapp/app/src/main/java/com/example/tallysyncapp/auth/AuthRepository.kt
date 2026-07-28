package com.example.tallysyncapp.auth

import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val authApi: AuthApi,
    private val tokenStorage: TokenStorage
) {
    fun hasSession(): Boolean = tokenStorage.hasSession()
    fun currentUserName(): String? = tokenStorage.userName()
    fun currentUserEmail(): String? = tokenStorage.userEmail()

    suspend fun login(email: String, password: String): Result<AuthResponse> = runCatching {
        authApi.login(LoginRequest(email.trim().lowercase(), password)).also {
            tokenStorage.saveSession(it)
        }
    }

    suspend fun logout(): Result<Unit> {
        val refreshToken = tokenStorage.refreshToken()
        return try {
            if (!refreshToken.isNullOrBlank()) {
                runCatching { authApi.logout(LogoutRequest(refreshToken)) }
            }
            Result.success(Unit)
        } finally {
            tokenStorage.clear()
        }
    }
}
