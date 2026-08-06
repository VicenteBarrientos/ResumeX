# Deuda arquitectónica — auditoría 2026-08-06 y plan de Fase 12

> **Qué es este archivo.** El diseño y el razonamiento detrás de las tareas **T-12.x**: por qué cada una existe, qué trampa tiene y cómo se verifica. Es el documento largo; `ROADMAP.md` § Fase 12 lleva la versión tomable de cada tarea.
>
> **Qué NO es.** No es el estado del trabajo — eso vive en [`AGENT_HANDOFF.md`](../AGENT_HANDOFF.md). Si este archivo contradice al handoff, **manda el handoff**.
>
> **Espejo en el wiki.** Este contenido debe reflejarse en `ObsidianVault/ResumeX/Deuda arquitectónica ResumeX.md` y linkearse desde el hub. El wiki no está en git, así que **la copia canónica es ésta**: si las dos difieren, manda este archivo y hay que re-ingestar el wiki.

## Cómo se produjo esta auditoría

Lectura directa del código, no del roadmap ni de la bitácora. Se leyeron: `prisma/schema.prisma` completo, los 50 archivos `route.ts` bajo `app/api/**`, `lib/analyze.ts`, `lib/criteria-evidence.ts`, `lib/types.ts`, `lib/products.ts`, `lib/entitlements.ts`, `lib/require-auth.ts`, `lib/rate-limit.ts`, `lib/talent-mapper/scoring.ts`, `lib/ats/http-response.ts`, y se grepearon los imports de `chrome-extension/`.

Todo hallazgo lleva `archivo:línea`. Si un agente no puede reproducirlo leyendo esa línea, el hallazgo está obsoleto: anotarlo y corregir este archivo.

## Lo que está bien y no hay que tocar

Esto va primero a propósito: la mitad del valor de una auditoría es decir qué **no** refactorizar.

- **`lib/analyze.ts` está bien diseñado.** `runStructuredAnalysis` es el mecanismo compartido y recibe prompt, schema, validador y normalizador por producto. Es R-005 ejecutado correctamente: se comparte el verbo, no el sustantivo. La versión mala sería un `analyze(mode)` con condicionales adentro. No "simplificar" fusionando los dos prompts.
- **La procedencia se enforcea en el servidor, no en el prompt.** `normalizeCriteriaItem` (`lib/criteria-evidence.ts:64-71`) chequea la cita contra el CV real y degrada a `insufficient` lo que no puede verificar. La garantía de R-007 no depende de que el modelo obedezca. No mover este check al prompt ni al cliente.
- **El scoring es determinista y el LLM está afuera.** `scoreResearcher` (`lib/talent-mapper/scoring.ts:42`) es una función pura de seis componentes con techo propio; dato ausente puntúa 0, no negativo. Hay tests que fijan los pesos (R-012). El ranking *es* el producto y es auditable. No meter el LLM acá.
- **La capa ATS está bien factorizada.** Adapter + registry + capability matrix + normalizadores por proveedor + HTTP con allowlist + demo adapter detrás de la misma interfaz. Que el demo adapter implemente la interfaz real es lo que hace que el fallback demo no sea un mock de mentira.
- **La frontera Career/Talent se respeta.** Cero imports de `lib/talent-mapper/*` y `lib/ats/*` desde superficies Career, y cero imports de módulos Career desde Talent. Verificado por grep, no asumido. **T-12.1 ya lo volvió mecánico.**
- **T-3.2 y T-3.3 se cancelaron con evidencia.** Negarse a abstraer dos cosas que sólo riman es la señal más sana del repo. No reabrirlas sin un segundo consumidor real.

## La restricción que ordena todo el plan

**El cliente que no podemos actualizar define el contrato de errores.**

```js
// chrome-extension/popup.js:275
$("login-error").textContent = data.error ?? "Login failed.";
```

La extensión desplegada lee `data.error` como **string** y lo asigna a `textContent`. Si `error` pasa a ser un objeto, el usuario ve `[object Object]`.

Consecuencia contraintuitiva y central: la capa ATS, que es la más nueva y mejor escrita, tiene la forma de error **equivocada** para este sistema:

```ts
// lib/ats/http-response.ts:26
return NextResponse.json({ error: error.toSafeJSON() }, { status });
```

Eso produce `{ error: { message, code, retryable } }` — anidado. Sus consumidores son sólo componentes React internos (`AtsIntegrationsClient.tsx`, `SendToAtsModal.tsx`), que sí podemos actualizar en el mismo commit. La extensión, no.

**Por lo tanto la unificación va de ATS hacia Career, no de Career hacia ATS.** Un revisor apurado concluiría lo opuesto ("el código nuevo está mejor, migremos el viejo"). Sería un incidente en producción para todo usuario de la extensión.

Envelope destino, superset compatible hacia atrás:

```ts
{
  error: string,          // legible; lo que ya leen extensión y UI actuales
  code?: string,          // "validation" | "authentication" | "rate_limit" | "upgrade_required" | …
  retryable?: boolean,
  details?: unknown       // sólo en desarrollo
}
```

Nada de lo que hoy lee `data.error` se rompe, y la info estructurada que ATS ya usa se preserva.

## Diagnóstico

Diez hallazgos, ordenados por lo que cuesta si no se arreglan.

### D-1 · La capa HTTP tiene dos dialectos

Sobre ~68 handlers en 50 archivos: **5 patrones de auth, 5 de validación, 4 formas de error**.

| Dialecto | Auth | Validación | Error |
|---|---|---|---|
| Talent / ATS (nuevo) | `requireSession` | Zod | `{error:{message,code,retryable}}` |
| Career (viejo) | `getServerSession` inline, o `resolveUserId` local | chequeos manuales de campo | `{error:"…"}` plano |

Lo concreto y peor: `lib/require-auth.ts` **ya existe** con `requireSession` y `requireUserId`, y aun así tres archivos reimplementan localmente lo mismo (`app/api/profile/route.ts:7-11`, `app/api/tracker/route.ts:7-11`, `app/api/answers/route.ts:7-11`).

Hoy no hay bug: todas las rutas revisadas filtran por `userId`. El problema es que la corrección depende de que cada agente **se acuerde**. Es la única deuda de esta lista que **empeora con el tiempo**: cada ruta nueva escrita antes del arreglo es otra migración pendiente.

Dos inconsistencias puntuales que sí son bugs latentes:

- `app/api/answers/[id]/route.ts:8` chequea `if (!session)` en vez de `session?.user?.id`. Una sesión sin `user.id` pasa el guard.
- `app/api/match-score/route.ts:27-28` devuelve **200 con `{score:null,error}`** cuando no hay auth, en vez de 401. Ver ⚠️ en T-12.7: la extensión consume esta ruta y cambiarlo puede romperla.

### D-2 · Exposición de costo sin techo

- **Una sola** ruta tiene rate limit: `app/api/extension/token/route.ts:14-44`.
- `lib/rate-limit.ts:8` es un `Map` en memoria del proceso. En Vercel serverless eso es **por instancia**: decorativo, no enforcing.
- Los entitlements cubren exactamente dos rutas (`lib/entitlements.ts:38,56`).
- **`/api/talent-assess` no tiene entitlement ni límite.** Llama a OpenAI sin fricción.
- **Talent Mapper live search tampoco**: hasta 12 queries contra OpenAlex + PubMed, `maxDuration = 60`.

Es la única deuda que cuesta **dinero real** en vez de credibilidad. Ya estaba anotada como B-12 y nunca se agendó.

### D-3 · Type assertions en el borde de confianza

```ts
// app/api/talent-mapper/searches/route.ts:40 (y [id]/route.ts:52)
… as TalentSearchWriteInput
```

Las rutas de escritura más grandes aceptan payloads anidados grandes (`criteriaJson`, `resultJson`) por *cast* y los persisten en columnas `Json`. Un cast no es validación: es una nota pidiéndole al compilador que deje de preguntar. Después la UI los lee de vuelta asumiendo forma.

Es el único lugar donde "Zod es convención de la casa" y "no validamos" coexisten en la misma familia de rutas. Mismo patrón en `app/api/profile/route.ts:37-51` (`as Record<string, unknown>`).

### D-4 · `TalentMapperWorkspace.tsx` — 1.497 líneas

36 `useState`, 2 `useEffect`, 3 `useCallback`, 1 `useRef`. En un solo componente conviven:

1. orquestación de `fetch` contra tres endpoints (líneas 226, 486, 547),
2. draft en `localStorage` (82-90, 249-281),
3. sync de snapshot al servidor (`persistSnapshot`, imports 23-29),
4. export CSV (632-658),
5. todo el wizard y los filtros (684 en adelante).

La asimetría es lo grave: el **motor** debajo está fijado por tests de caracterización según R-012, y el componente que **maneja** el motor no tiene ninguno. Sólo lo cubre el script E2E. 36 piezas de estado son una máquina de estados que nadie nombró todavía.

### D-5 · La documentación describía un `lib/` que no existe

`AGENT_HANDOFF.md` § Destino mostraba `lib/career/` y `lib/talent/`. La realidad: **40 archivos planos** en la raíz de `lib/` más dos subárboles de feature (`talent-mapper/` 47 archivos, `ats/` 37).

Precisión importante: la frontera de producto **sí se respeta**; la sostenía la convención, no la estructura de carpetas. Era un problema de **legibilidad, no de acoplamiento** — un revisor superficial lo llamaría acoplamiento y movería carpetas sin necesidad. Lo que faltaba no eran carpetas: era que la regla fuera **mecánica**. Resuelto por T-12.1 + R-025.

### D-6 · Índices faltantes

`Application.userId` y `Answer.userId` no tenían índice. Cada listado del tracker era un scan. Comparar con `TalentSearch`, que sí lo tiene. **Cerrado por T-12.2.**

### D-7 · `Profile.profileJson` es JSON dentro de un `String`

`prisma/schema.prisma:61` guarda JSON en `String?` mientras el resto del schema usa columnas `Json` reales. Se parseaba sin `try`/`catch` en `app/api/profile/route.ts:29`: un valor malformado tiraba 500 en el GET del perfil. **Parseo defensivo cerrado por T-12.2; la conversión de columna queda en T-12.11.**

### D-8 · Endpoints públicos sin fricción

- `app/api/analytics/route.ts:25` — POST sin auth. Valida con Zod y sólo escribe a consola, así que el blast radius es chico, pero es un POST abierto.
- `app/api/auth/register/route.ts:9` — sin rate limit ni CAPTCHA.

### D-9 · Sin observabilidad de errores

No hay Sentry ni equivalente; los únicos logs son los de Vercel (B-11). Consecuencia práctica: **ninguna corrección de este plan se puede verificar en producción** más allá de mirar logs a mano.

### D-10 · PubMed se agregó antes de calibrar OpenAlex

R-013 superó la postura previa de "segunda fuente sólo tras calibrar". La objeción es concreta, no estética:

- La tabla de riesgos del propio handoff lista **desambiguación de autores** como riesgo abierto y no resuelto.
- Fusionar dos fuentes con modelos de identidad distintos **multiplica exactamente ese riesgo**.
- R-014 dice precisión sobre recall. Agregar superficie de recall antes de tener línea base de precisión va contra la regla propia.

No es "sacar PubMed". Es **medir** antes de seguir agregando fuentes (B-10 sigue en cola pidiendo una tercera).

---

## Plan

Cuatro olas. El número de fase (12) es orden de creación, **no** de prioridad: esta fase va **antes** de las Fases 8 y 9 y compite de igual a igual con lo que queda de la 7.

Verificación mínima de toda tarea: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; más `test:e2e:talent-mapper` si toca Talent y `test:e2e:career` si toca Career.

### Ola 0 — Poder medir

#### ✅ T-12.1 · Frontera Career/Talent enforceada por lint (R-023)

Hecha. `eslint.config.mjs` define dos zonas y las restringe **en ambas direcciones** con `no-restricted-imports`. El mensaje de error cita R-005/R-023 y apunta a R-009 como salida correcta.

Corrección respecto del diseño original: **no hace falta allowlistear ningún puente.** `lib/ats/**` y `lib/talent-mapper/**` son **ambos** Talent, así que `lib/ats/from-researcher.ts` importando `ResearcherCandidate` es intra-producto y legal por construcción. No existe un puente Career↔Talent que exceptuar.

**Verificado:** `npm run lint` queda con 0 errores sin tocar ningún import existente (confirma que la frontera ya se cumplía), y una violación deliberada en cada dirección falla con el mensaje de R-005.

#### ✅ T-12.2 · Índices por usuario y parseo defensivo del perfil

Hecha. `@@index([userId, createdAt])` en `Application` y `Answer` — compuesto y no sólo `[userId]` porque los dos listados filtran por `userId` y ordenan por `createdAt`, así que un índice sirve al `WHERE` y al `ORDER BY`. Migración `20260806130000_userid_indexes`, con `IF NOT EXISTS` para que sea replayable (este repo ya tuvo que recuperar a mano una migración a medio aplicar, P3009) y sin `CONCURRENTLY` porque `migrate deploy` envuelve cada migración en una transacción.

`parseProfileJson` en `app/api/profile/route.ts` devuelve `null` ante JSON corrupto en vez de tirar 500. El cliente ya maneja `profileJson` falsy (`components/AutoApplyDashboard.tsx:51`), así que degrada a perfil AutoApply vacío.

**Verificado:** `prisma validate` OK, `prisma generate` OK, migración sin BOM (`od` confirma `2d 2d 20`), typecheck/lint/tests verdes. **No verificado con base de datos real:** la ruta de valor corrupto no tiene test de integración porque este entorno no tiene Postgres. Queda como comprobación de deploy.

#### ⬜ T-12.3 · Observabilidad mínima (cierra B-11)

- Primer paso gratis: documentar en `VERCEL.md` que `get_runtime_errors`/`get_runtime_logs` del MCP de Vercel ya dan errores de runtime, y cómo consultarlos. Cero código.
- Después decidir Sentry o equivalente, para tener agrupación y alertas y no sólo un feed.
- Instrumentar como mínimo: fallos de OpenAI, fallos de proveedor ATS, y el `catch` de `runStructuredAnalysis`.
- Sin PII: nunca el CV ni el JD completos, sólo longitudes, como ya hace `debugLog`.

**Terminado cuando:** un error provocado a propósito en una API route aparece en la herramienta elegida con stack y ruta, y está escrito dónde mirarlo.

### Ola 1 — Frenar la sangría

#### ✅ T-12.4 · Cuota durable sobre `UsageEvent` (R-022, cierra B-12)

El repo ya tiene la mitad construida y nadie la generalizó: `UsageEvent` con `@@index([userId, name, createdAt])` y `countUsage`/`recordUsage` en `lib/entitlements.ts:24-36`.

- Nuevo `lib/quota.ts` con `assertQuota({ userId, name, limit, windowMs })`, extraído de `countUsage`. **Sin dependencia nueva y sin tabla nueva**: no hace falta Redis ni Upstash para este volumen.
- `lib/entitlements.ts` se reescribe encima sin cambiar su API pública ni los límites actuales (1 analyzer/semana, 1 cover letter/día). Es refactor, no cambio de producto.
- Aplicar cuota a **toda** ruta autenticada que llame a OpenAI o a una fuente externa: `talent-assess` (hoy sin nada), `talent-mapper/search` (hoy sin nada), `format`, `extract-job`, `extract-criteria`, `outreach`, `match-score`, `autoapply/parse-profile`, `profile/resume`.
- El límite de Pro debe ser **alto, no infinito**. Un límite ausente no es un plan de precios, es un incidente esperando.
- **Budget cap**, que es la protección real: agregar `costUsd Float?` a `UsageEvent` y escribir el `estimatedCostUsd` que `lib/token-usage.ts` ya calcula. Con eso se corta por gasto diario acumulado, no sólo por conteo de llamadas.
- `consumeRateLimit` en memoria **se queda** para ráfagas pre-auth (`register`, `extension/token`), donde no hay `userId` con el que indexar. Documentar en el archivo que es best-effort por instancia y por qué ahí alcanza.
- Las denegaciones salen con el envelope de T-12.5: `code: "quota_exceeded"` o `"upgrade_required"`, 402 o 429 según corresponda, `Retry-After` cuando aplique.

**Terminado cuando:** un test agota la cuota de `talent-assess` y recibe 429/402 con `code`; el segundo intento del mismo usuario en la misma ventana no llega a OpenAI (verificable con el mock); y existe test de que el gasto acumulado corta.

**Hecha** (2026-08-06, rama `cursor/architecture-debt-t12-4-quota-8725`): `lib/quota.ts`, `lib/quota-limits.ts` (números propuestos), migración `costUsd`, rutas cableadas, demos sin burn, tests de agotamiento + budget.

#### ✅ T-12.5 · Un envelope de error, en la dirección correcta (R-021)

Leer primero § *La restricción que ordena todo el plan*. La dirección de la migración es lo único que no se puede equivocar acá.

- Nuevo `lib/api/response.ts`: `apiError(message, { status, code, retryable })` y `apiOk(data)`. Forma **plana**, `error` sigue siendo string.
- `lib/ats/http-response.ts` pasa a wrapper delgado sobre `apiError`, **preservando** su mapeo `AtsError.code → status` (`lib/ats/http-response.ts:13-25`, que está bien).
- Actualizar en el mismo commit los consumidores del shape anidado: `components/talent/ats/AtsIntegrationsClient.tsx`, `components/talent/ats/SendToAtsModal.tsx`.
- Migrar las rutas Career al helper **sin cambiar el string de `error`** que ya devuelven: son copy visible, y mezclar refactor de forma con cambio de contenido hace irrevisable el diff.
- ⚠️ **Verificar antes de tocar** el 402 de entitlements: hoy devuelve `upgradeUrl`, que consume el CTA de upgrade. El envelope tiene que preservarlo (`code: "upgrade_required"` + `upgradeUrl`), no aplanarlo a un string.

**Terminado cuando:** ninguna ruta construye `NextResponse.json({error…})` a mano (grep vacío salvo en `lib/api/response.ts`); el login de la extensión desempaquetada contra el dev server sigue mostrando el mensaje real y no `[object Object]`; los dos E2E verdes.

**Hecha** (2026-08-06): envelope plano; ATS → Career; `upgradeUrl` intacto.

#### ⬜ T-12.6 · Zod en el borde de escritura (R-024, mata los casts de D-3)

- `talent-mapper/searches` POST y PATCH: reemplazar `as TalentSearchWriteInput` por esquemas Zod reales.
- `profile` PUT: reemplazar `as Record<string, unknown>` por esquema del perfil.
- **Decisión de diseño, y conviene entenderla antes de discutirla:** para `resultJson` **no** escribir un esquema campo por campo. Es un snapshot completo de resultados del Mapper; un esquema exhaustivo duplicaría `ResearcherCandidate` y se desincronizaría al primer cambio del motor. En su lugar: (1) esquema del **envelope**, (2) **cap de bytes** del payload serializado, (3) campo **`schemaVersion`** en el snapshot guardado. El interior queda opaco pero acotado y versionado, y la lectura puede fallar fuerte cuando la versión no coincide en vez de renderizar basura.
- Un cast que quede tiene que llevar comentario explicando por qué es seguro. Si no se puede explicar, no es seguro.

**Terminado cuando:** un POST con `criteriaJson` malformado devuelve 400 con `code: "validation"` en vez de persistir; un `resultJson` que excede el cap devuelve 413/400; hay test de que un `schemaVersion` desconocido en lectura no revienta la UI.

### Ola 2 — Estructura

#### ⬜ T-12.7 · Un solo punto de entrada de auth

**Depende de T-12.5** (el envelope tiene que existir para que los 401 sean consistentes).

- Borrar las tres copias locales de `resolveUserId` (`profile`, `tracker`, `answers`) y usar `requireUserId` de `lib/require-auth.ts`, que ya hace exactamente eso.
- Migrar los ~11 handlers con `getServerSession` inline a `requireSession`.
- Arreglar `app/api/answers/[id]/route.ts:8`: `session?.user?.id`, no `!session`.
- ⚠️ **`match-score` necesita decisión, no arreglo directo.** Hoy devuelve 200 + `{score:null,error}` sin auth. Es incorrecto como API, pero la extensión consume esa ruta con Bearer y puede estar tratando cualquier non-200 como fatal. Antes de cambiarlo: leer `chrome-extension/content.js` y `background.js` y confirmar. Si la extensión se rompe, el cambio viaja **junto con** la publicación de T-9.2, no antes.
- Regla de lint que prohíba importar `getServerSession` fuera de `lib/auth-options.ts` y `lib/require-auth.ts`. Igual que T-12.1: convertir convención en error de build.

**Terminado cuando:** `rg "getServerSession" app/api` sólo matchea vía los helpers; `rg "resolveUserId"` vacío; toda ruta autenticada responde 401 con el mismo envelope; los dos E2E verdes.

#### ⬜ T-12.8 · `defineRoute` — sólo después de 12.5 y 12.7

Con ~68 handlers, R-009 está satisfecho de sobra; el riesgo acá no es abstraer temprano, es abstraer **de más**.

- `lib/api/handler.ts` con `defineRoute({ auth, quota, body, handler })` que componga: auth → cuota → parseo Zod → handler → mapeo de error.
- **Límite explícito:** que siga siendo legible como una función que llama a cuatro cosas en orden. Sin registro de middlewares, sin DI, sin decoradores. Si un agente futuro no puede seguir el flujo de una request leyendo un archivo, se fue de alcance.
- Migrar primero 3-4 rutas representativas (una Career simple, una con Bearer, una ATS con ownership). Si las tres no quedan más cortas y más claras, **abandonar la tarea** y quedarse con 12.5 + 12.7, que ya dan el 80%.

**Terminado cuando:** las rutas piloto no tienen boilerplate de auth/validación/error, y la decisión de seguir o abandonar está escrita en la bitácora con esas rutas como evidencia.

### Ola 3 — El componente grande

#### ⬜ T-12.9 · Descomponer `TalentMapperWorkspace.tsx`

**Refactor puro: cero cambio de comportamiento.** Si algo tiene que cambiar de comportamiento, es otra tarea. `npm run test:e2e:talent-mapper` tiene que pasar **después de cada paso**, no sólo al final.

1. `useTalentSearchDraft` — `localStorage` + sync de URL.
2. `useTalentSearchPersistence` — create/update/shortlist/notes y los timers de debounce.
3. `useMapperFilters` — sort, filtros y listas derivadas. Es lógica **pura**: la primera testeable unitariamente y la que más rinde.
4. Nombrar la máquina de estados: `step` más los flags de status pasan a un `useReducer` con estados explícitos. Acá bajan de golpe los 36 `useState`.
5. Separar presentación: `RoleStep`, `CriteriaStep`, `ResultsStep`, `FiltersBar`.

- **No** introducir Zustand, Redux ni similar: `useReducer` alcanza y R-009 aplica a dependencias igual que a abstracciones.

**Terminado cuando:** `TalentMapperWorkspace.tsx` < 300 líneas; los hooks 1-3 tienen test unitario; E2E verde; comparación visual antes/después sin diferencias (mismo método que la migración de paleta en `b7ffc87`).

### Ola 4 — Requiere decisión humana

#### 🤔 T-12.10 · Calibrar precisión antes de agregar fuentes

Resuelve la tensión R-013 / R-014 de D-10. **No empezar sin que el humano etiquete**, porque el etiquetado *es* la tarea; no lo puede hacer un agente.

- Fixtures: 3-5 roles reales y, para cada uno, investigadores etiquetados bueno / malo / dudoso **por criterio humano de dominio**.
- Script (no test) que imprima `precision@10` para: sólo OpenAlex, sólo PubMed, y merge dual. Es una **medición**, no un assert: reporta un número, no debe fallar el build.
- Recién con ese número se puede responder si el merge dual ayudó o metió ruido, y si B-10 (tercera fuente) tiene sentido.
- Si el merge dual empeora la precisión, la respuesta correcta puede ser dejar PubMed detrás de un flag apagado por defecto, no borrarlo.

**Terminado cuando:** el script corre y reporta las tres cifras, y la conclusión sobre R-013 queda en la bitácora.

#### 🤔 T-12.11 · `Profile.profileJson` a columna `Json`

- Migración con backfill de `String?` a `Json?`, más lectura tolerante durante la transición.
- Separada de T-12.2 a propósito: T-12.2 evitó el 500 sin migrar datos. Esto migra datos y merece su propia ventana.
- **Depende de** T-12.3 (observabilidad): migrar datos sin ver errores de producción es apostar.

---

## Anti-tareas

Cosas que parecen mejoras de esta lista y no lo son.

- **Unificar el error hacia el shape anidado de ATS.** Rompe la extensión desplegada. Es el error más fácil de cometer leyendo este código, porque ATS parece "el bueno".
- **Mover los 40 archivos de `lib/` a `lib/career/` y `lib/talent/`.** Churn grande de imports, cero cambio en el acoplamiento real. T-12.1 ya dio el beneficio entero a costo de un archivo. Ver R-025.
- **Allowlistear `lib/ats/from-researcher.ts` en la regla de lint.** No hace falta: `lib/ats` y `lib/talent-mapper` son ambos Talent. Si aparece en una discusión, es que alguien está copiando el diseño original de esta nota en vez del código final.
- **Fusionar `CriteriaItem` y `EvidenceMatch` "ahora que igual estamos refactorizando".** Ya se evaluó y descartó en T-3.1 con evidencia: comparten un campo con garantías opuestas.
- **Meter Redis/Upstash para el rate limit.** `UsageEvent` ya existe, ya está indexado y ya se consulta para entitlements. Dependencia de infraestructura nueva para este volumen es sobreingeniería.
- **Reescribir `TalentMapperWorkspace` de cero.** Es el flujo que da plata y no tiene tests unitarios. Extracción incremental con el E2E como red, o nada.
- **Sacar PubMed por lo de D-10.** El problema es que no se midió, no que exista. Medir primero (T-12.10).
- **Agregar una tercera fuente (B-10).** Bloqueada por la misma razón, y ahora explícitamente por T-12.10.
- **Traducir los strings de error mientras se migra el envelope (T-12.5).** Son copy visible; mezclar refactor de forma con cambio de contenido hace irrevisable el diff.

## Orden sugerido

```
Ola 0  ✅ T-12.1 lint frontera · ✅ T-12.2 índices · ⬜ T-12.3 observabilidad
Ola 1  T-12.4 cuota → T-12.5 envelope → T-12.6 zod
Ola 2  T-12.7 auth (necesita 12.5) → T-12.8 defineRoute (necesita 12.5+12.7)
Ola 3  T-12.9 descomponer workspace
Ola 4  T-12.10 🤔 calibración · T-12.11 🤔 profileJson (necesita 12.3)
```

Con la ola 0 casi cerrada, lo siguiente de mayor valor es **T-12.4** (techo de gasto) y después **T-12.5** (contrato de error único).
