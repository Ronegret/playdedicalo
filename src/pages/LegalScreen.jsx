import { useNavigate, useParams } from 'react-router-dom';
import { EDAD_MINIMA, TERCEROS, TITULAR, TITULAR_COMPLETO, ULTIMA_ACTUALIZACION } from '../config/legal';

/**
 * PÁGINAS LEGALES
 *
 * Las cuatro viven en un solo componente y se eligen por la ruta. Van
 * separadas por dirección propia (no en pestañas) porque hay sitios que
 * piden una URL directa: Google Play exige un enlace a la política de
 * privacidad, y una reclamación o una consulta se responden con un enlace
 * concreto, no con "entra y busca la pestaña".
 *
 * El texto se escribe SOLO a partir de `config/legal.js`. Es a propósito:
 * una política de privacidad que enumera a mano los servicios externos se
 * queda desfasada la primera vez que se añade uno y nadie se acuerda de
 * tocarla. Aquí, si se añade un tercero a la lista, el texto lo cuenta.
 */

const DOCUMENTOS = {
  privacidad: 'Política de privacidad',
  cookies: 'Cookies y almacenamiento',
  terminos: 'Condiciones de uso',
  'aviso-legal': 'Aviso legal'
};

function Seccion({ titulo, children }) {
  return (
    <section className="mt-8">
      <h2 className="font-headline-lg text-xl font-black text-white">{titulo}</h2>
      <div className="mt-3 space-y-3 text-on-surface-variant">{children}</div>
    </section>
  );
}

function Dato({ etiqueta, valor }) {
  const pendiente = typeof valor === 'string' && valor.startsWith('PENDIENTE');
  return (
    <p>
      <span className="font-bold text-white">{etiqueta}: </span>
      <span className={pendiente ? 'font-bold text-vinyl-orange' : undefined}>{valor}</span>
    </p>
  );
}

export default function LegalScreen() {
  const navigate = useNavigate();
  const { documento } = useParams();
  const actual = DOCUMENTOS[documento] ? documento : 'privacidad';

  return (
    <main className="app-screen relative z-10 overflow-y-auto pt-safe-header pb-16">
      <header className="fixed left-0 top-0 z-50 flex h-16 w-full items-center justify-between border-b border-white/10 bg-background/97 app-blur-permitido px-margin-mobile">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex min-h-touch items-center gap-2 font-label-caps text-xs tracking-[0.18em] text-on-surface-variant transition-colors hover:text-white"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-xl">arrow_back</span> VOLVER
        </button>
        <p className="font-label-caps text-xs tracking-[0.18em] text-white">LEGAL</p>
      </header>

      <div className="mx-auto w-full max-w-2xl px-margin-mobile">
        {/* Navegación entre los cuatro documentos */}
        <nav className="mt-4 flex flex-wrap gap-2">
          {Object.entries(DOCUMENTOS).map(([clave, nombre]) => (
            <button
              key={clave}
              type="button"
              onClick={() => navigate(`/legal/${clave}`)}
              aria-current={clave === actual ? 'page' : undefined}
              className={`min-h-touch rounded-xl border px-4 font-label-caps text-[0.8rem] transition-colors ${
                clave === actual
                  ? 'border-neon-green bg-neon-green/15 font-black text-neon-green'
                  : 'border-white/12 bg-white/5 font-bold text-on-surface-variant'
              }`}
            >
              {nombre}
            </button>
          ))}
        </nav>

        <h1 className="mt-8 font-headline-lg text-3xl font-black text-white">{DOCUMENTOS[actual]}</h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Última actualización: {ULTIMA_ACTUALIZACION}
        </p>

        {!TITULAR_COMPLETO && (
          <div className="mt-5 rounded-2xl border border-vinyl-orange/40 bg-vinyl-orange/10 p-4">
            <p className="text-sm font-bold text-vinyl-orange">
              Documento en preparación
            </p>
            <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
              Faltan por cerrar los datos identificativos del titular. Hasta entonces
              este texto describe con exactitud cómo funciona el juego y qué datos se
              tratan, pero no sustituye a la versión definitiva.
            </p>
          </div>
        )}

        {actual === 'privacidad' && (
          <>
            <Seccion titulo="Quién trata tus datos">
              <Dato etiqueta="Responsable" valor={TITULAR.nombre} />
              <Dato etiqueta="NIF" valor={TITULAR.nif} />
              <Dato etiqueta="Domicilio" valor={TITULAR.domicilio} />
              <Dato etiqueta="Correo de contacto" valor={TITULAR.correo} />
            </Seccion>

            <Seccion titulo="Qué datos se tratan">
              <p>
                <span className="font-bold text-white">Para jugar, sin cuenta: </span>
                el nombre que escribes y el avatar que eliges, el PIN de la sala, tus
                respuestas y tu puntuación mientras dura la partida. Nada de eso se te
                pide verificado: puedes poner el nombre que quieras.
              </p>
              <p>
                <span className="font-bold text-white">Si entras con Google (opcional, solo el anfitrión): </span>
                tu nombre, tu dirección de correo, tu foto de perfil y el identificador
                que asigna Google. Sirve para reconocerte entre partidas y guardar tu
                perfil.
              </p>
              <p>
                <span className="font-bold text-white">Datos técnicos: </span>
                dirección IP y datos del navegador, que reciben inevitablemente los
                servicios que sirven la web, la base de datos y la música.
              </p>
              <p>
                No se usan cookies publicitarias, no hay analítica, no hay perfilado y
                no se hacen decisiones automatizadas sobre ti.
              </p>
            </Seccion>

            <Seccion titulo="Para qué y con qué base legal">
              <p>
                <span className="font-bold text-white">Hacer funcionar la partida. </span>
                Base: la ejecución del servicio que pides al entrar a jugar
                (art. 6.1.b RGPD).
              </p>
              <p>
                <span className="font-bold text-white">Guardar tu perfil si entras con Google. </span>
                Base: tu consentimiento, que das al pulsar «Entrar con Google» y puedes
                retirar cuando quieras (art. 6.1.a RGPD).
              </p>
              <p>
                <span className="font-bold text-white">Mantener el servicio seguro y funcionando. </span>
                Base: el interés legítimo en que el juego no se caiga ni se use para
                molestar a otros (art. 6.1.f RGPD).
              </p>
            </Seccion>

            <Seccion titulo="Cuánto tiempo se guardan">
              <p>
                <span className="font-bold text-white">La sala se borra. </span>
                Cuando el anfitrión cierra la partida, la sala —con los nombres, los
                avatares y las puntuaciones— se elimina de la base de datos a los pocos
                segundos. No se conserva un histórico de partidas.
              </p>
              <p>
                <span className="font-bold text-white">El perfil, hasta que lo borres. </span>
                Si entraste con Google, tu perfil se guarda hasta que pidas eliminarlo.
              </p>
            </Seccion>

            <Seccion titulo="Quién más recibe datos">
              <p>
                No se venden ni se ceden datos a nadie. Para funcionar, el juego se
                apoya en estos servicios:
              </p>
              <ul className="mt-2 space-y-3">
                {TERCEROS.map((t) => (
                  <li key={t.nombre} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="font-bold text-white">{t.nombre}</p>
                    <p className="text-sm">{t.quien}</p>
                    <p className="mt-1 text-sm">{t.para}</p>
                    <p className="mt-1 text-sm text-on-surface-variant/80">{t.donde}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-3">
                Algunos están en Estados Unidos. Esas transferencias se amparan en el
                Marco de Privacidad de Datos UE-EE. UU. y en las cláusulas contractuales
                tipo aprobadas por la Comisión Europea.
              </p>
            </Seccion>

            <Seccion titulo="Tus derechos">
              <p>
                Puedes pedir acceso a tus datos, rectificarlos, borrarlos, oponerte al
                tratamiento, limitarlo o llevártelos a otro sitio. Basta con escribir a{' '}
                <span className="font-bold text-white">{TITULAR.correo}</span> indicando qué
                quieres. Se responde en el plazo de un mes.
              </p>
              <p>
                Si crees que no se ha hecho bien, puedes reclamar ante la Agencia
                Española de Protección de Datos (<span className="text-white">www.aepd.es</span>),
                que es la autoridad de control en España.
              </p>
            </Seccion>

            <Seccion titulo="Menores">
              <p>
                El juego está pensado para mayores de {EDAD_MINIMA} años. Por debajo de
                esa edad, la ley española exige el permiso de quien tenga la patria
                potestad. Si detectamos una cuenta de un menor de {EDAD_MINIMA} años sin
                ese permiso, se eliminará.
              </p>
            </Seccion>
          </>
        )}

        {actual === 'cookies' && (
          <>
            <Seccion titulo="No hay banner de cookies, y hay un motivo">
              <p>
                Este juego <span className="font-bold text-white">no usa cookies de
                publicidad, ni de analítica, ni de redes sociales</span>. No hay Google
                Analytics, ni píxel de Facebook, ni rastreadores de ningún tipo.
              </p>
              <p>
                La ley (art. 22.2 de la LSSI) solo obliga a pedir permiso para lo que no
                sea estrictamente necesario para prestar el servicio. Como aquí solo se
                usa almacenamiento técnico imprescindible, no hace falta pedirte permiso
                ni interrumpirte con una ventana. Lo que sí corresponde es contarte
                exactamente qué se guarda, y es esto:
              </p>
            </Seccion>

            <Seccion titulo="Qué se guarda en tu navegador">
              <ul className="space-y-3">
                {[
                  ['dedicalo_room_pin, dedicalo_player_id, dedicalo_role',
                    'Tu sesión de juego: en qué sala estás y quién eres dentro de ella. Sin esto, cerrar el navegador sin querer te dejaría fuera de la partida.'],
                  ['dedicalo_tocadas_v2',
                    'Qué canciones ya te han sonado, para no repetirlas en la misma noche.'],
                  ['auth_redirect_intent',
                    'Solo si entras con Google: a dónde devolverte cuando Google termina.'],
                  ['Sesión de Firebase',
                    'La credencial que permite a tu aparato hablar con la base de datos. La pone Google.']
                ].map(([clave, para]) => (
                  <li key={clave} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="font-mono text-sm font-bold text-neon-green">{clave}</p>
                    <p className="mt-1 text-sm">{para}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-3">
                Todo eso vive en tu propio aparato y puedes borrarlo cuando quieras
                desde los ajustes del navegador. Si lo borras, saldrás de la partida en
                curso, y nada más.
              </p>
            </Seccion>
          </>
        )}

        {actual === 'terminos' && (
          <>
            <Seccion titulo="Qué es esto">
              <p>
                Dedícalo Play es un juego de fiesta musical. Suena un fragmento de una
                canción y hay que colocar en qué año salió. Se juega en grupo: un
                anfitrión abre una sala y el resto entra desde su móvil.
              </p>
              <p>
                <span className="font-bold text-white">Ahora mismo es gratuito</span> y no
                tiene publicidad. Si eso cambia, se avisará antes y estas condiciones se
                actualizarán.
              </p>
            </Seccion>

            <Seccion titulo="Quién puede jugar">
              <p>
                Hace falta tener {EDAD_MINIMA} años o más. No hay que registrarse para
                jugar como invitado: solo el anfitrión puede entrar con su cuenta de
                Google si quiere guardar su perfil.
              </p>
            </Seccion>

            <Seccion titulo="Qué se espera de ti">
              <p>
                Que uses nombres y avatares que no insulten ni suplanten a nadie, que no
                intentes reventar la partida de otros ni forzar el sistema, y que no
                emplees el juego para nada ilegal.
              </p>
              <p>
                El nombre que escribes lo ven las demás personas de la sala. No pongas
                ahí datos personales que no quieras enseñar.
              </p>
            </Seccion>

            <Seccion titulo="La música">
              <p>
                Los fragmentos de audio y las carátulas se sirven desde catálogos
                públicos de terceros. Los derechos de las canciones, las grabaciones y
                las portadas pertenecen a sus autores, intérpretes y discográficas. Este
                juego no vende música ni permite descargarla.
              </p>
            </Seccion>

            <Seccion titulo="Sin garantías, y hasta dónde llega la responsabilidad">
              <p>
                El servicio se ofrece tal cual, gratuitamente. Se pone empeño en que
                funcione y en que los años del catálogo sean correctos, pero no se
                garantiza que esté siempre disponible ni libre de errores.
              </p>
              <p>
                No se responde de los daños derivados de no poder usar el servicio,
                salvo en los casos en que la ley no permite excluir esa responsabilidad.
              </p>
            </Seccion>

            <Seccion titulo="Cambios y ley aplicable">
              <p>
                Estas condiciones pueden cambiar; la fecha de arriba dice cuándo se
                tocaron por última vez. Se aplica la ley española, y para cualquier
                conflicto son competentes los juzgados que correspondan según la
                normativa de consumo.
              </p>
            </Seccion>
          </>
        )}

        {actual === 'aviso-legal' && (
          <>
            <Seccion titulo="Titular del sitio">
              <Dato etiqueta="Titular" valor={TITULAR.nombre} />
              <Dato etiqueta="NIF" valor={TITULAR.nif} />
              <Dato etiqueta="Domicilio" valor={TITULAR.domicilio} />
              {TITULAR.registro && <Dato etiqueta="Datos registrales" valor={TITULAR.registro} />}
              <Dato etiqueta="Correo" valor={TITULAR.correo} />
              <Dato etiqueta="Sitio" valor={TITULAR.web} />
            </Seccion>

            <Seccion titulo="Propiedad intelectual">
              <p>
                El nombre Dedícalo, el logotipo, el diseño de las pantallas y el código
                del juego pertenecen a su titular. Las canciones, las grabaciones y las
                carátulas pertenecen a sus respectivos titulares y aquí solo se
                reproducen fragmentos servidos desde catálogos de terceros.
              </p>
            </Seccion>

            <Seccion titulo="Enlaces a otros sitios">
              <p>
                Al reproducir música o cargar carátulas, el navegador se conecta a
                servidores de terceros. Ni el contenido ni las prácticas de privacidad
                de esos terceros dependen del titular de este sitio.
              </p>
            </Seccion>

            <Seccion titulo="Avisar de un problema">
              <p>
                Si eres titular de derechos sobre algún contenido y consideras que aquí
                se usa indebidamente, escribe a{' '}
                <span className="font-bold text-white">{TITULAR.correo}</span> indicando qué
                contenido es y en qué te basas. Se atenderá cuanto antes.
              </p>
            </Seccion>
          </>
        )}
      </div>
    </main>
  );
}
