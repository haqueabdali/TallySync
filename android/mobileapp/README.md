# Android Client V1

A small Jetpack Compose Android client for the NestJS mobile API.

## Included screens

- Dashboard
- Sales Orders
- Sales Order Details
- Tally status
- Sync one order
- Retry failed order
- Sync all pending orders

## Important

Set your backend URL in:

```text
app/src/main/java/com/example/tallymobile/data/network/ApiConfig.kt
```

For Android Emulator and a backend running on your computer:

```kotlin
const val BASE_URL = "http://10.0.2.2:3000/api/v1/"
```

For a real Android phone, replace `10.0.2.2` with your computer's local IP,
for example:

```kotlin
const val BASE_URL = "http://192.168.1.20:3000/api/v1/"
```

The phone and computer must be connected to the same network.

## Recommended project setup

Create an Empty Activity project in Android Studio using:

- Kotlin
- Jetpack Compose
- Minimum SDK 26

Then replace/add the files from this package.

## Required dependencies

Copy the dependencies from `APP_DEPENDENCIES.gradle.kts.txt` into the
`dependencies` block of your app module.

Also add this permission to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

For development over plain HTTP, add this to the `<application>` element:

```xml
android:usesCleartextTraffic="true"
```
