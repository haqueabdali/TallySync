package com.example.tallysyncapp.data.network

import com.example.tallysyncapp.BuildConfig

object ApiConfig {
    /**
     * Debug:
     *   http://10.0.2.2:3000/api/v1/
     *
     * Release:
     *   supplied through the Gradle property TALLYSYNC_API_BASE_URL.
     *
     * Production release builds require HTTPS.
     */
    const val BASE_URL: String = BuildConfig.API_BASE_URL
}
