package com.example.tallysyncapp.auth

import retrofit2.Call
import retrofit2.http.Body
import retrofit2.http.POST

interface AuthApi {
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): AuthResponse

    @POST("auth/logout")
    suspend fun logout(@Body request: LogoutRequest): MessageResponse

    @POST("auth/refresh")
    fun refreshBlocking(@Body request: RefreshTokenRequest): Call<AuthResponse>
}
