plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "es.dedicalo.tv"
    compileSdk = 35

    defaultConfig {
        applicationId = "es.dedicalo.tv"
        // 21 cubre prácticamente cualquier Android TV y Fire TV en circulación.
        minSdk = 21
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
    }

    buildTypes {
        release {
            // Sin ofuscar: la app son cien líneas que abren una web, y así el
            // APK que se instala es exactamente lo que se ve en el repositorio.
            isMinifyEnabled = false
            // Se firma con la clave de depuración para poder instalarlo por
            // Downloader sin montar un almacén de claves. Vale para uso propio;
            // para publicar en una tienda hará falta una clave de verdad.
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.activity:activity:1.9.3")
}
