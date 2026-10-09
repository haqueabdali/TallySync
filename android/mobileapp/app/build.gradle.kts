plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.hilt)
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.example.tallysyncapp"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.example.tallysyncapp"
        minSdk = 26
        targetSdk = 36

        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner =
            "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        create("release") {
            val keystoreFile =
                System.getenv("TALLYSYNC_KEYSTORE_FILE")

            val keystorePassword =
                System.getenv("TALLYSYNC_KEYSTORE_PASSWORD")

            val keyAliasValue =
                System.getenv("TALLYSYNC_KEY_ALIAS")

            val keyPasswordValue =
                System.getenv("TALLYSYNC_KEY_PASSWORD")

            if (!keystoreFile.isNullOrBlank()) {
                storeFile = file(keystoreFile)
            }

            storePassword = keystorePassword
            keyAlias = keyAliasValue
            keyPassword = keyPasswordValue
        }
    }

    buildTypes {
        debug {
            buildConfigField(
                "String",
                "API_BASE_URL",
                "\"http://10.0.2.2:3000/api/v1/\"",
            )

            manifestPlaceholders["usesCleartextTraffic"] = "true"
        }

        release {
            signingConfig = signingConfigs.getByName("release")

            isMinifyEnabled = false

            val releaseRequested =
                gradle.startParameter.taskNames.any { taskName ->
                    taskName.contains(
                        "release",
                        ignoreCase = true,
                    )
                }

            val releaseApiBaseUrl =
                providers.gradleProperty("TALLYSYNC_API_BASE_URL")
                    .orNull
                    ?.trim()
                    ?.trimEnd('/')

            if (
                releaseRequested &&
                releaseApiBaseUrl.isNullOrBlank()
            ) {
                throw GradleException(
                    "Release build requires -PTALLYSYNC_API_BASE_URL=https://your-domain/api/v1",
                )
            }

            if (
                !releaseApiBaseUrl.isNullOrBlank() &&
                !releaseApiBaseUrl.startsWith("https://")
            ) {
                throw GradleException(
                    "Release API URL must use HTTPS.",
                )
            }

            val configuredReleaseApiBaseUrl =
                if (releaseApiBaseUrl.isNullOrBlank()) {
                    "https://release-api-not-configured.invalid/api/v1"
                } else {
                    releaseApiBaseUrl
                }

            buildConfigField(
                "String",
                "API_BASE_URL",
                "\"${configuredReleaseApiBaseUrl}/\"",
            )

            manifestPlaceholders["usesCleartextTraffic"] = "false"

            proguardFiles(
                getDefaultProguardFile(
                    "proguard-android-optimize.txt"
                ),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(
            org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
        )
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)

    implementation(
        platform(libs.androidx.compose.bom)
    )

    androidTestImplementation(
        platform(libs.androidx.compose.bom)
    )

    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.material)

    implementation(
        "androidx.compose.material:material-icons-extended"
    )

    implementation(libs.navigation.compose)

    implementation(libs.retrofit)
    implementation(libs.retrofit.gson)
    implementation(libs.okhttp.logging)

    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.hilt.navigation.compose)

    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    ksp(libs.androidx.room.compiler)

    implementation(libs.androidx.work.runtime.ktx)
    implementation(libs.androidx.hilt.work)
    ksp(libs.androidx.hilt.compiler)

    implementation(libs.androidx.camera.core)
    implementation(libs.androidx.camera.camera2)
    implementation(libs.androidx.camera.lifecycle)
    implementation(libs.androidx.camera.view)
    implementation(libs.mlkit.barcode.scanning)

    testImplementation(libs.junit)

    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)

    androidTestImplementation(
        "androidx.compose.ui:ui-test-junit4"
    )

    debugImplementation(libs.androidx.compose.ui.tooling)

    debugImplementation(
        "androidx.compose.ui:ui-test-manifest"
    )
}