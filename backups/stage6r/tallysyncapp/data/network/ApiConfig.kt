package com.example.tallysyncapp.data.network

object ApiConfig {
    /*
     * Emulator: HOST = "10.0.2.2"
     * Physical phone, same Wi-Fi: HOST = Windows PC LAN IPv4
     * USB with `adb reverse tcp:3000 tcp:3000`: HOST = "127.0.0.1"
     *
     * Android host configuration does not change backend TALLY_URL.
     */
    private const val HOST = "10.0.2.2"
    private const val PORT = 3000
    const val BASE_URL = "http://$HOST:$PORT/api/v1/"
}
