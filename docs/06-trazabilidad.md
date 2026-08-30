# Trazabilidad y prueba de autoría — Dedícalo Play

- **Última revisión:** 30 de agosto de 2026
- **Autor del proyecto:** Rodrigo Negrete Aros
- **Inicio documentado:** 13 de junio de 2026

---

## 1. Lo que hay que entender primero

> **Un repositorio git, por sí solo, prueba poco.**

Esto es importante y suele pasarse por alto. El historial de git **se puede
reescribir**: `git commit --date=...` permite poner cualquier fecha,
`git rebase` reescribe commits enteros, y `--amend` cambia el pasado. Un
repositorio en tu ordenador no demuestra *cuándo* hiciste algo, solo lo que
tú dices que hiciste.

Lo que sí tiene valor probatorio es **que un tercero independiente registre
que algo existía en una fecha**. Esa es la diferencia entre «tengo commits» y
«tengo trazabilidad».

## 2. Las cuatro capas (todas gratuitas)

Ordenadas de menos a más sólidas. Conviene tenerlas todas.

### Capa 1 — Historial de git ⚠️ Débil por sí solo
Commits con autor, fecha y contenido. **Valor:** contexto y evolución.
**Límite:** manipulable. Sirve para *entender*, no para *probar*.

### Capa 2 — Publicación en GitHub ✅ Ya lo tienes
Repositorio: `github.com/Ronegret/playdedicalo`

Al hacer `push`, GitHub registra **en sus servidores** la fecha de llegada.
Eso ya no lo controlas tú, y por eso vale. Los *releases* y las fechas de
push son registro de un tercero.

### Capa 3 — Etiquetas firmadas y releases ⬜ Pendiente
Marcar cada versión con una **etiqueta anotada** (lleva autor y fecha) y
publicarla como *release* en GitHub. Si además se firma con GPG, queda
vinculada criptográficamente a tu identidad.

### Capa 4 — Sello de tiempo independiente ⬜ Pendiente (paso manual)
**OpenTimestamps** (`opentimestamps.org`) ancla el hash de un archivo en la
cadena de bloques de Bitcoin. Es **gratis** y demuestra que un contenido
concreto existía antes de una fecha, sin depender de GitHub ni de nadie.

> **Nota de esta máquina (30/08/2026):** se intentó automatizar con el cliente
> de línea de comandos y **no funciona aquí**. `opentimestamps-client` depende
> de `python-bitcoinlib`, que es incompatible con Python 3.14 (falla al cargar
> libssl por ctypes), y además el Control de aplicaciones de Windows bloquea
> el `ots.exe` instalado. No se ha generado ningún `.ots`.

**Alternativa que sí funciona hoy, sin instalar nada:**

1. Abrir <https://opentimestamps.org>
2. Arrastrar el manifiesto (`docs/evidencias/manifiesto-vX.Y.Z-FECHA.txt`)
3. Descargar el `.ots` que devuelve
4. Guardarlo junto al manifiesto y commitearlo

Son 30 segundos por versión. El sitio calcula el hash **en el navegador**: el
contenido del archivo no se sube, solo su huella. Verificable después por
cualquiera, para siempre, sin coste.

Si en el futuro se quiere automatizar, hace falta un Python 3.11 o 3.12 y
`pip install opentimestamps-client`; entonces bastaría:

```bash
ots stamp docs/evidencias/manifiesto-v0.4.0-2026-08-30.txt
ots verify docs/evidencias/manifiesto-v0.4.0-2026-08-30.txt.ots
```

## 3. Procedimiento al cerrar una versión

```bash
# 1. Actualizar CHANGELOG.md y la versión en package.json

# 2. Generar el manifiesto de evidencia (hashes + fecha + commit)
npm run evidencia

# 3. Commit de cierre
git add -A
git commit -m "Release v0.4.0"

# 4. Etiqueta ANOTADA (lleva autor y fecha; -s la firma si tienes GPG)
git tag -a v0.4.0 -m "v0.4.0 — Usabilidad y accesibilidad"

# 5. Publicar: esto es lo que deja el registro en un tercero
git push origin main --tags

# 6. Crear el release en GitHub (fecha de publicación de un tercero)
gh release create v0.4.0 --title "v0.4.0" --notes-file CHANGELOG.md

# 7. Opcional pero recomendable: sello de tiempo independiente
ots stamp docs/evidencias/manifiesto-v0.4.0.txt
```

## 4. Qué guardar como evidencia

| Tipo | Dónde | Estado |
|---|---|---|
| Código y su historia | Repositorio git | ✅ 114 commits desde 13/06/2026 |
| Documento de concepto | `docs/01-concepto.md` | ✅ |
| Game Design Document | `docs/02-gdd.md` | ✅ |
| Arquitectura | `docs/03-arquitectura.md` | ✅ |
| Marca | `docs/04-marca.md` | ✅ |
| Decisiones (ADR) | `docs/decisiones/` | ✅ |
| Historial de versiones | `CHANGELOG.md` | ✅ |
| Manifiestos con hash | `docs/evidencias/` | ⬜ Al cerrar cada versión |
| Capturas fechadas | `docs/evidencias/capturas/` | ⬜ |
| Vídeos de funcionamiento | `docs/evidencias/` | ⬜ |
| Diseños Figma | — | ⬜ No existen |
| Logo vectorial | — | ⬜ Solo PNG |

## 5. Registro oficial (esto sí cuesta dinero)

Lo anterior es trazabilidad, **no registro oficial**. Si en algún momento
quieres protección formal en España:

| Vía | Coste orientativo | Qué protege |
|---|---|---|
| **Registro de la Propiedad Intelectual** (autonómico) | ~15-40 € | El código y la documentación como obra |
| **Safe Creative** | Gratis / de pago | Registro privado con sello de tiempo |
| **Marca registrada (OEPM)** | ~150 € por clase | El **nombre** «Dedícalo Play» |

> La marca y el software son cosas distintas. El registro de propiedad
> intelectual **no protege el nombre**; para eso hace falta marca registrada.
> Si el plan es comercializar, el nombre es probablemente lo más urgente de
> los dos, porque es lo que otro te puede quitar.

Nada de esto es asesoramiento legal: son las vías habituales, conviene
contrastarlas con un profesional antes de gastar.

## 6. Estado actual de la trazabilidad

| | Estado |
|---|---|
| Historial completo desde el inicio | ✅ 114 commits, 13/06 → 30/08/2026 |
| Publicado en servidor de terceros | ✅ GitHub |
| Autoría consistente en los commits | ✅ Rodrigo Negrete Aros |
| Documentación fechada | ✅ Desde v0.4.0 |
| Versiones etiquetadas | ⬜ Pendiente (ver §3) |
| Releases publicados | ⬜ Pendiente |
| Sellos de tiempo independientes | ⬜ Pendiente |
| Registro oficial | ⬜ No iniciado |
