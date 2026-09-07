package es.dedicalo.tv

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity

/**
 * DEDÍCALO PLAY — APLICACIÓN DE TELEVISIÓN
 *
 * Es una carcasa muy fina: abre la pantalla de televisión del juego dentro de
 * un WebView a pantalla completa. Nada más.
 *
 * Por qué así y no una app nativa:
 *
 *  - Se actualiza sola. Al publicar cambios en la web, todas las teles ven lo
 *    nuevo sin que nadie reinstale nada. Para un juego que se retoca a menudo
 *    esto vale más que cualquier ventaja de una app nativa.
 *  - El APK pesa unos cientos de KB.
 *  - Android TV usa el WebView de Chrome, que sí está al día — al contrario
 *    que los navegadores de Samsung o LG, que van años por detrás.
 *
 * La tele NO se toca: el mando son los móviles de los jugadores. Por eso aquí
 * no hay navegación por foco ni gestión de la cruceta, que es lo que más
 * trabajo da al programar para televisión. Lo único que se maneja es el botón
 * "atrás" del mando.
 */
class MainActivity : ComponentActivity() {

    private lateinit var web: WebView

    // La pantalla de tele del juego. El parámetro marca que viene de la app
    // instalada, para poder distinguirlo en las estadísticas.
    private val urlInicio = "https://play.dedicalo.es/tv?src=androidtv"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Una partida son muchos minutos mirando sin tocar el mando: sin esto
        // la tele se pone en reposo a mitad de ronda.
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        web = WebView(this)
        setContentView(web)

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            // El juego reproduce los fragmentos en cuanto empieza la ronda,
            // sin que nadie toque la tele. Sin esto el navegador los bloquea
            // por no haber "gesto del usuario" y la sala se queda en silencio.
            mediaPlaybackRequiresUserGesture = false
            cacheMode = WebSettings.LOAD_DEFAULT
            useWideViewPort = true
            loadWithOverviewMode = true
            // La pantalla ya está pensada para verse a tres metros: que la
            // tele no reescale nada por su cuenta.
            textZoom = 100
        }

        // Que los enlaces se abran aquí dentro y no lancen un navegador que en
        // muchas teles ni existe.
        web.webViewClient = WebViewClient()
        web.webChromeClient = WebChromeClient()

        // Pantalla completa de verdad: sin barras del sistema encima del PIN.
        web.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            )

        web.loadUrl(urlInicio)
    }

    /**
     * "Atrás" del mando: primero retrocede dentro de la web (por ejemplo, del
     * juego a la pantalla de meter el PIN) y solo sale de la app cuando ya no
     * hay a dónde volver. Es lo que espera cualquiera con un mando en la mano.
     */
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK && web.canGoBack()) {
            web.goBack()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onPause() {
        super.onPause()
        // Si alguien deja la app en segundo plano, que no siga sonando música
        // por debajo de lo que esté viendo.
        web.onPause()
    }

    override fun onResume() {
        super.onResume()
        web.onResume()
    }

    override fun onDestroy() {
        web.destroy()
        super.onDestroy()
    }
}
