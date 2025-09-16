plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android") 
    // Flutter Gradle Plugin phải sau Android & Kotlin
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.example.mobile"
<<<<<<< Updated upstream
    compileSdk = 36
    ndkVersion = "27.0.12077973"
=======
    compileSdk = flutter.compileSdkVersion

    ndkVersion = "27.0.12077973"


    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_11.toString()
    }
>>>>>>> Stashed changes

    defaultConfig {
        applicationId = "com.example.mobile"

        // Lấy từ gradle.properties
        minSdk = flutter.minSdkVersion
        targetSdk = 36

        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

flutter {
    source = "../.."
}
