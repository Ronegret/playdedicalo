# 0005 — Seguridad de la base de datos

**Fecha:** 2026-09-10
**Estado:** parcialmente aplicada. El punto 3 está pendiente y es la tarea
técnica número uno antes de comercializar.

## Lo que se comprobó

No es una sospecha: se probó contra la base de datos de producción con una
sesión anónima creada desde la clave pública de la app, que es exactamente lo
que puede hacer cualquiera abriendo el código de la web.

| Prueba | Resultado |
|---|---|
| Leer la base sin sesión | **Denegado** (las reglas están desplegadas) |
| Listar todas las salas con sesión anónima | **Denegado** |
| Leer `rooms/1234` con sesión anónima | **Permitido** |
| Escribir en `rooms/1234` con sesión anónima | **Permitido** |
| Escribir `users/{mi-uid}` | **Denegado** ← fallo, ver punto 1 |

La marca de prueba que se escribió durante la comprobación se borró en el acto.

## 1. `users/{uid}` no existía en las reglas — ARREGLADO

La app escribe el perfil (nombre, avatar, correo) en `users/{uid}` cuando
alguien entra con Google. Pero `users` no aparecía en las reglas, así que caía
en el `.read/.write: false` de la raíz y **todas esas escrituras fallaban en
silencio** (el código las traga con `.catch(() => {})`).

Consecuencia: el asistente prometía «Entra con tu cuenta para guardar tu perfil
y tus partidas» y el perfil no se guardaba en ningún sitio. Además de un fallo,
es una promesa que la app no cumplía, y eso en una app que se va a cobrar es un
problema de consumo, no solo de programación.

Ahora cada persona puede leer y escribir su propio perfil, y el de nadie más.

## 2. El correo electrónico salía en la sala — ARREGLADO

`rooms/{pin}/players/{id}` guardaba `email` con el correo real de quien entrara
con Google. Y una sala la puede leer cualquiera que acierte el PIN: cuatro
dígitos son diez mil combinaciones, que se prueban en segundos.

El correo no lo necesita nadie para jugar —el juego usa el nombre y el avatar—
así que ya no viaja a la sala. Los datos de la cuenta viven en `users/{uid}`,
que solo lee su dueño.

Además, la sala ahora **se borra** unos segundos después de cerrarla. Antes
solo se marcaba como terminada y se quedaba ahí para siempre con los nombres de
quienes jugaron: datos personales guardados sin ningún fin, que es justo lo que
el RGPD no permite.

## 3. Cualquiera puede escribir en cualquier sala — PENDIENTE

Sigue en pie: con una sesión anónima y un PIN acertado se puede modificar una
partida ajena (cambiar marcadores, echar gente, romper la ronda).

**Por qué no se ha arreglado en el mismo día:** en Firebase las reglas se
heredan hacia dentro y un permiso concedido arriba **no se puede revocar
abajo**. Hoy `rooms/$pin` concede escritura entera, así que no vale con añadir
una regla más restrictiva en `players`: no haría absolutamente nada. El primer
intento de arreglo fue exactamente ese, y habría quedado bonito en el archivo
sin proteger nada.

Arreglarlo de verdad obliga a **quitar la escritura del nodo de la sala** y
concederla camino a camino:

- `rooms/$pin` — solo crear (`!data.exists()`), nunca sobrescribir.
- `rooms/$pin/players/$id` — quien se une (si el nodo no existe) o quien ya es
  ese jugador (`data.child('authUid').val() === auth.uid`) o el anfitrión.
- `rooms/$pin/{phase,round,currentQuestion,settings,audio}` — solo el anfitrión.
- `rooms/$pin/joinRequests/$id` — la crea quien pide entrar; la borra el
  anfitrión.

Para que eso funcione, cada jugador tiene que llevar su `authUid`. **Ya se
guarda** (también en las sesiones anónimas): ese trabajo está hecho y es la
mitad del arreglo.

Lo que falta es cambiar las reglas y **probar la partida entera** contra ellas:
crear sala, entrar dos invitados, jugar una ronda, sabotear, echar a alguien,
cerrar. Sin ese repaso, unas reglas mal puestas dejan el juego inservible para
todo el mundo, que es peor que el problema que arreglan. No se hace a ciegas el
día antes de abrir al público.

## 4. Lo que NO arregla nada de esto

El PIN de cuatro dígitos seguirá siendo adivinable. Las reglas de Firebase no
saben limitar intentos por minuto. Si en algún momento hay salas con algo que
proteger de verdad, la respuesta no es una regla más: es un código más largo, o
un servidor propio delante que sí pueda contar intentos.

Para una partida entre amigos en un salón, un código corto es lo correcto —es
lo que hacen Kahoot o Jackbox— siempre que dentro no haya nada personal. Por eso
sacar el correo era lo primero.
