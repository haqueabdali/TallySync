package com.example.tallysyncapp.data.network

import com.example.tallysyncapp.BuildConfig

object ApiConfig {
    /*
     * Set at build time: ./gradlew assembleDebug -PapiBaseUrl=http://<host>:3000/api/v1/
     *
     * Emulator (default):                 http://10.0.2.2:3000/api/v1/
     * Physical phone, same Wi-Fi:         http://<computer LAN IPv4>:3000/api/v1/
     * USB with `adb reverse tcp:3000 tcp:3000`: http://127.0.0.1:3000/api/v1/
     *
     * Android host configuration does not change backend TALLY_URL.
     */
    val BASE_URL: String = BuildConfig.API_BASE_URL
}
