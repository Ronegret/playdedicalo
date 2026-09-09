/**
 * DATOS DEL TITULAR Y TEXTOS LEGALES
 *
 * Están aquí, en un solo sitio, por dos motivos: para no tener el NIF y el
 * domicilio repartidos por cuatro pantallas, y para que rellenarlos sea
 * cambiar cinco líneas y no buscar por todo el código.
 *
 * ⚠️ LO MARCADO COMO `PENDIENTE` HAY QUE RELLENARLO ANTES DE COBRAR NADA.
 *
 * La Ley de Servicios de la Sociedad de la Información (Ley 34/2002, el
 * "aviso legal") obliga a que quien presta un servicio por internet con
 * actividad económica se identifique con nombre o razón social, NIF,
 * domicilio y un medio de contacto directo. Mientras el juego sea gratis y
 * sin publicidad la exigencia es más laxa; en cuanto se cobre —o entren
 * anuncios o donaciones— deja de serlo.
 */

export const TITULAR = {
  // Nombre completo (autónomo) o denominación social (S.L.)
  nombre: 'PENDIENTE — nombre completo o razón social',
  nif: 'PENDIENTE — NIF / CIF',
  domicilio: 'PENDIENTE — domicilio a efectos de notificaciones',
  // Solo para sociedades: tomo, folio, hoja del Registro Mercantil
  registro: null,
  correo: 'rodrigo.negrete.aros@gmail.com',
  web: 'play.dedicalo.es'
};

/** ¿Ya están rellenados los datos del titular? */
export const TITULAR_COMPLETO = !Object.values(TITULAR)
  .some((v) => typeof v === 'string' && v.startsWith('PENDIENTE'));

/**
 * Edad mínima: 14 años.
 *
 * No es un número elegido a ojo. El artículo 7 de la LOPDGDD fija en 14 años
 * la edad a partir de la cual alguien puede consentir por sí mismo el
 * tratamiento de sus datos en España. Por debajo hace falta el permiso de
 * quien tenga la patria potestad, y gestionar eso en un juego de fiesta no
 * tiene sentido.
 */
export const EDAD_MINIMA = 14;

export const ULTIMA_ACTUALIZACION = '10 de septiembre de 2026';

/**
 * A quién llegan datos al usar el juego.
 *
 * Esta lista NO es decorativa: la política de privacidad la recorre para
 * escribirse sola. Si algún día se añade otro servicio externo, se añade
 * aquí y el texto legal se actualiza con él, en vez de quedarse desfasado
 * como acaba pasando siempre.
 */
export const TERCEROS = [
  {
    nombre: 'Google (Firebase)',
    quien: 'Google Ireland Limited y Google LLC',
    para: 'Guardar la partida en marcha (sala, jugadores, respuestas) y gestionar el inicio de sesión.',
    donde: 'Servidores en la Unión Europea (europe-west1). El grupo Google puede acceder desde Estados Unidos.'
  },
  {
    nombre: 'Vercel',
    quien: 'Vercel Inc.',
    para: 'Alojar la web y servirla desde el servidor más cercano.',
    donde: 'Estados Unidos, con red de distribución mundial.'
  },
  {
    nombre: 'Apple',
    quien: 'Apple Inc. / Apple Distribution International',
    para: 'Servir los fragmentos de audio de 30 segundos y las carátulas de los discos.',
    donde: 'Red de distribución mundial. Apple recibe la dirección IP del aparato que reproduce.'
  },
  {
    nombre: 'Google Fonts',
    quien: 'Google Ireland Limited y Google LLC',
    para: 'Servir las tipografías de la interfaz.',
    donde: 'Recibe la dirección IP al cargar la página. Está previsto alojar las tipografías en el propio servidor para dejar de enviarla.'
  }
];
