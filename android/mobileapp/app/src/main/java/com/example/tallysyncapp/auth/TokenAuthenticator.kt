package com.example.tallysyncapp.auth

import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import javax.inject.Inject
import javax.inject.Provider
import javax.inject.Singleton

@Singleton
class TokenAuthenticator @Inject constructor(
    private val tokenStorage: TokenStorage,
    private val authApiProvider: Provider<AuthApi>
) : Authenticator {
    override fun authenticate(route: Route?, response: Response): Request? {
        if (responseCount(response) >= 2) return null

        synchronized(this) {
            // Read inside the lock: a stale (already rotated) refresh token trips the
            // backend's reuse detection, which revokes every session for the user.
            val refreshToken = tokenStorage.refreshToken() ?: return null
            val userId = tokenStorage.userId() ?: return null

            val tokenUsed = response.request.header("Authorization")
                ?.removePrefix("Bearer ")
            val currentToken = tokenStorage.accessToken()

            if (!currentToken.isNullOrBlank() && currentToken != tokenUsed) {
                return response.request.newBuilder()
                    .header("Authorization", "Bearer $currentToken")
                    .build()
            }

            val refreshResponse = try {
                authApiProvider.get()
                    .refreshBlocking(RefreshTokenRequest(refreshToken, userId))
                    .execute()
            } catch (_: Exception) {
                // Network failure: keep the session so the user isn't logged out offline.
                return null
            }

            val newSession = refreshResponse.body()
            if (!refreshResponse.isSuccessful || newSession == null) {
                // Only a rejected refresh token ends the session; 5xx/429 are transient.
                if (refreshResponse.code() in setOf(400, 401, 403)) tokenStorage.clear()
                return null
            }

            tokenStorage.saveSession(newSession)
            return response.request.newBuilder()
                .header("Authorization", "Bearer ${newSession.accessToken}")
                .build()
        }
    }

    private fun responseCount(response: Response): Int {
        var count = 1
        var previous = response.priorResponse
        while (previous != null) {
            count++
            previous = previous.priorResponse
        }
        return count
    }
}
