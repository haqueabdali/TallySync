package com.example.tallysyncapp.auth

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TokenStorage @Inject constructor(
    @ApplicationContext context: Context
) {
    private val preferences = context.getSharedPreferences(
        "tallysync_secure_session",
        Context.MODE_PRIVATE
    )

    @Synchronized
    fun saveSession(response: AuthResponse) {
        preferences.edit()
            .putString(KEY_ACCESS_TOKEN, response.accessToken)
            .putString(KEY_REFRESH_TOKEN, response.refreshToken)
            .putString(KEY_USER_ID, response.user.id)
            .putString(KEY_USER_NAME, response.user.fullName)
            .putString(KEY_USER_EMAIL, response.user.email)
            .putString(KEY_USER_ROLE, response.user.role)
            .putString(KEY_COMPANY_ID, response.user.companyId)
            .putLong(KEY_EXPIRES_AT, System.currentTimeMillis() + response.expiresIn * 1_000L)
            .apply()
    }

    fun accessToken(): String? = preferences.getString(KEY_ACCESS_TOKEN, null)
    fun refreshToken(): String? = preferences.getString(KEY_REFRESH_TOKEN, null)
    fun userId(): String? = preferences.getString(KEY_USER_ID, null)
    fun userName(): String? = preferences.getString(KEY_USER_NAME, null)
    fun userEmail(): String? = preferences.getString(KEY_USER_EMAIL, null)
    fun userRole(): String? = preferences.getString(KEY_USER_ROLE, null)
    fun companyId(): String? = preferences.getString(KEY_COMPANY_ID, null)
    fun hasSession(): Boolean = !accessToken().isNullOrBlank() && !refreshToken().isNullOrBlank()

    @Synchronized
    fun clear() {
        preferences.edit().clear().apply()
    }

    private companion object {
        const val KEY_ACCESS_TOKEN = "access_token"
        const val KEY_REFRESH_TOKEN = "refresh_token"
        const val KEY_USER_ID = "user_id"
        const val KEY_USER_NAME = "user_name"
        const val KEY_USER_EMAIL = "user_email"
        const val KEY_USER_ROLE = "user_role"
        const val KEY_COMPANY_ID = "company_id"
        const val KEY_EXPIRES_AT = "expires_at"
    }
}
