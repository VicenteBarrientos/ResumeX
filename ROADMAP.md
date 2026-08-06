# Roadmap — ResumeX

> **Qué es este archivo.** El plan de trabajo a mediano plazo, desglosado en tareas que otro agente puede tomar sin contexto previo de la conversación que las originó.
>
> **Qué NO es.** No es el estado del proyecto: eso vive en [`AGENT_HANDOFF.md`](./AGENT_HANDOFF.md). No es el reglamento de código: eso vive en [`AGENTS.md`](./AGENTS.md). Si este archivo contradice al handoff, **manda el handoff** — el roadmap describe intención, el handoff describe realidad.

---

## Cómo usar este roadmap

1. **Leé primero `AGENT_HANDOFF.md`.** Estado actual, decisiones vigentes R-001…R-020 y bitácora. Una tarea de acá puede haber quedado obsoleta por una decisión de allá.
2. **Tomá una tarea completa, no media.** Cada tarea tiene ID (`T-7.3`), precondiciones, pasos y una **definición de terminado** verificable. Si no podés cumplir la definición de terminado, la tarea no está lista para cerrarse: dejá lo hecho, anotá en la bitácora qué falta y por qué.
3. **Respetá el orden de fase.** Las fases están ordenadas por dependencia real, no por preferencia.
4. **Dentro de una fase, las tareas sin dependencia declarada son paralelizables.**
5. **Al terminar**, actualizá el handoff (estado + bitácora) y marcá acá el estado de la tarea.

### Estados

| Marca | Significado |
|---|---|
| ⬜ | Pendiente |
| 🟨 | En curso — hay trabajo commiteado pero la definición de terminado no se cumple |
| ✅ | Terminada y verificada |
| ⛔ | Bloqueada — la razón está escrita en la tarea |
| 🤔 | Requiere decisión humana antes de empezar |
| ⏸️ | Diferida a demanda real — no empezar sin trigger explícito |

### Reglas transversales

Aplican a **toda** tarea de este roadmap. No se repiten en cada una.

- **Antes de escribir Next.js**, leer la guía pertinente en `node_modules/next/dist/docs/`. Esta versión tiene breaking changes respecto al conocimiento previo de cualquier modelo.
- **Antes de tocar `lib/talent-mapper/scoring.ts` o `aggregate-authors.ts`**, confirmar que los tests de caracterización existentes (R-012) siguen pasando sin modificarlos. Si hay que tocarlos, cambiaste comportamiento.
- **Toda ruta de página que se mueva deja un 308** en `PRODUCT_SEGMENT_REDIRECTS` (`next.config.ts`, R-018).
- **Nombres y rutas de producto salen de `lib/products.ts`** (R-019). Nada de `"ResumeX Talent"` hardcodeado.
- **Las APIs siguen planas** hasta que exista versionado (R-017).
- **Verificación mínima antes de commitear:** `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. Si la tarea toca Talent Mapper, además `npm run test:e2e:talent-mapper` con el dev server arriba. Si toca Career analyzer/tracker/cover-letter, además `npm run test:e2e:career`.
- **Sin secretos** en el repo, el handoff ni el wiki (R-015).
- **Extraer al segundo uso, no antes (R-009).** Ya causó dos cancelaciones (T-3.2, T-3.3). No repetir el error en las fases nuevas.

---

## El terreno, hoy (2026-08-05, tras el cierre de Fases 1–6)

Las seis fases del plan de separación de productos están **completas y en producción** (`add4208`). Números reales, para que nadie los redescubra:

| Dimensión | Estado |
|---|---|
| Rutas de página | 10 en `/career/*`, 3 en `/talent/*`, 5 compartidas, 10 redirects 308 desde rutas planas |
| Rutas de API | ~30, todas planas bajo `/api/*` (R-017), incluida persistencia Talent |
| Tests | 11 archivos: 9 de Talent Mapper/Assess (`lib/talent-mapper/__tests__`, `lib/__tests__/{analyze,criteria-evidence}.test.ts`). **Cero para `format-resume.ts` (244 líneas), `merge-profile.ts` (102) y `parse-profile.ts` (164)** |
| E2E | Uno: `scripts/e2e-talent-mapper.mjs`. **Career no tiene E2E** — ni `/career/tracker`, ni `/career/analyzer`, ni `/career/autoapply` |
| CI | **No existe.** No hay `.github/workflows/`. La verificación depende de que cada agente corra los comandos localmente antes de commitear |
| Modelos Prisma | `User`, `Application`, `Profile`, `Answer`, `TalentSearch`, `ShortlistEntry`, `CandidateNote`. **Sin `Organization`** — búsquedas y notas son por usuario, no por equipo |
| Evidencia | `CriteriaItem`/`StrongMatch` (Career+Assess) y `EvidenceMatch` (Mapper) ya llevan procedencia (R-007): quote/snippet real, `status`/`confidence`, `aiInferred`/`matchType`. El estándar T-3.4 quedó cerrado |
| i18n | `lib/i18n/resumex.ts` (386 líneas) existe pero cubre Career; **Talent (`/talent`, `/talent/mapper`, `/talent/assess`, `/talent/searches`) no tiene strings traducibles** |
| a11y | `grep -rn "aria-" app/talent` → **0 resultados**. Ningún atributo ARIA en toda la superficie Talent |
| Tema | ResumeX web es paleta clara (R-020) desde `b7ffc87`. **La extensión Chrome (`chrome-extension/popup.html`) y el puente `/extension-auth` siguen en dark navy + cyan (`#0d1117`/`#22d3ee`)** — riesgo ya anotado en el handoff, nunca resuelto |
| Precio Talent | No existe. Pro Career es `$5/mo` vía `formatProPriceLabel`; Talent no tiene plan propio |
| Equipos/Ashby | Diferidos por falta de cliente concreto (T-4.7, Organization) |

La foto: el producto **funciona y está separado correctamente**, pero tiene deuda de confiabilidad (tests, CI, E2E) y de superficie (i18n, a11y, tema de la extensión) que quedó pospuesta durante el sprint de separación. Esta es la deuda que las Fases 7–9 cierran antes de que el roadmap vuelva a mirar features nuevas.

---

# Fase 7 — Red de seguridad

**Objetivo.** Cerrar los huecos de cobertura que quedaron abiertos en el backlog de la Fase 2–6 (B-2, B-3) y agregar la verificación automática que hoy no existe. Sin esto, cada cambio futuro se apoya en que el agente de turno se acuerde de correr `npm test` a mano.

**Por qué ahora.** Es la fase de menor riesgo y mayor apalancamiento: no toca producto, sólo lo protege. Las fases siguientes (8, 9) tocan superficie visible — conviene tener la red antes.

**Precondiciones.** Ninguna. Puede arrancar de inmediato y en paralelo con cualquier otra fase.

### ✅ T-7.1 — Tests de caracterización para `format-resume.ts`, `merge-profile.ts`, `parse-profile.ts`

- Mismos criterios que T-2.1: mockear lo externo (parseo de PDF/DOCX vía `unpdf`/`mammoth`, llamadas a OpenAI si las hay), fijar comportamiento actual — no el ideal.
- `format-resume.ts` (244 líneas): fijar la forma del resumé formateado, qué pasa con secciones vacías o campos faltantes del perfil.
- `merge-profile.ts` (102 líneas): fijar la resolución de conflictos cuando el perfil existente y el nuevo extraído difieren en el mismo campo.
- `parse-profile.ts` (164 líneas): fijar el parseo de un CV bien formado y el comportamiento ante texto no estructurado o vacío.

**Terminado (2026-08-05):** `lib/__tests__/format-resume.test.ts`, `merge-profile.test.ts`, `parse-profile.test.ts` — OpenAI mockeado; ramas de normalización, merge conflict, y errores `NO_*`/`MALFORMED_*` fijadas.

### ✅ T-7.2 — E2E de Career (cierra B-3)

- Nuevo `scripts/e2e-career.mjs`, mismo patrón que `e2e-talent-mapper.mjs` (Playwright, usuario demo, dev server en otra terminal).
- Camino mínimo: login → `/career/analyzer` (CV + JD demo → resultado con criterios y quotes) → `/career/tracker` (crear aplicación → verla en la lista) → `/career/cover-letter` (generar una carta).
- Agregar el script a `package.json` (`test:e2e:career`) y a la lista de verificación de `AGENTS.md`/reglas transversales de este archivo cuando la tarea toque esas superficies.

**Terminado (2026-08-05):** `scripts/e2e-career.mjs` + `npm run test:e2e:career`. Demo analyzer/cover-letter determinísticos vía `lib/demo-career.ts` (sin OpenAI ni burn de free-tier). Documentado en `README.md` y `AGENTS.md`.

### 🟨 T-7.3 — CI mínima en GitHub Actions

- `.github/workflows/ci.yml`: en cada push/PR a `main`, correr `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`. `npm run build` sólo si hay forma de proveer un `DATABASE_URL` de CI (Postgres efímero en el job o skip documentado — el handoff ya registra que el build local falla sin `DATABASE_URL`).
- No agregar despliegue desde CI: Vercel ya despliega en push. Este workflow es sólo verificación.

**Progreso (2026-08-05):** workflow creado (`prisma generate` + typecheck + lint + test; build omitido a propósito). Falta el smoke en GitHub (PR con test roto → check rojo) para marcar ✅.

**Terminado cuando:** un PR con un test roto a propósito falla el check en GitHub; uno limpio pasa. Documentar el resultado en la bitácora del handoff con el link al run.

### ⬜ T-7.4 — Tests de caracterización para `resolve-resume-job-input.ts` y `criteria-evidence.ts` en sus bordes

- Estos dos ya tienen algo de cobertura indirecta vía `analyze.test.ts`/`criteria-evidence.test.ts`; esta tarea es sólo cerrar los bordes: input vacío, CV sin texto extraíble, JD ausente.
- Menor prioridad que T-7.1–T-7.3; tomarla si sobra tiempo dentro de la fase.

**Terminado cuando:** casos borde documentados arriba tienen un test que falla si se elimina el manejo correspondiente.

### Riesgos de la Fase 7

| Riesgo | Mitigación |
|---|---|
| Escribir tests de caracterización sobre código que ya tiene bugs silenciosos fija el bug, no el comportamiento correcto | Si un test revela un bug obvio al escribirlo, anotarlo en la bitácora como hallazgo separado — no corregirlo dentro de esta fase sin decisión explícita |
| CI sin `DATABASE_URL` bloquea `build` y genera falsos rojos | Documentar explícitamente en el workflow qué pasos corren y cuáles se saltan, con un comentario que explique por qué |

---

# Fase 8 — Accesibilidad e internacionalización de Talent

**Objetivo.** Llevar `/talent/*` al mismo estándar que Career ya tiene parcialmente: navegable con teclado/lector de pantalla y disponible en los mismos idiomas que Career. Cierra B-8 y B-9.

**Por qué ahora.** Talent es el producto más caro por usuario y el que se vende a equipos de contratación — más expuesto a auditorías de accesibilidad corporativas y a usuarios que no leen inglés o español indistintamente. Hoy tiene cero atributos ARIA y cero strings traducibles propios.

**Precondiciones.** Ninguna dura. Recomendable después de T-7.2 (E2E de Career) para tener el patrón de test fresco, pero no bloqueante.

### ⬜ T-8.1 — Auditoría de accesibilidad de `/talent`, `/talent/mapper`, `/talent/assess`, `/talent/searches`

- Recorrer las cuatro páginas con un lector de pantalla (o `axe-core`/Playwright `@axe-core/playwright`) y listar: falta de `aria-label` en botones icon-only, falta de `role` en tarjetas de resultado que funcionan como items de lista, contraste de la paleta clara nueva (R-020) contra WCAG AA, foco visible en elementos interactivos custom (los charts de score, los toggles de shortlist).
- Documentar hallazgos en la bitácora del handoff antes de arreglar nada — es una auditoría, no un fix a ciegas.

**Terminado cuando:** existe una lista concreta de violaciones con archivo y línea, no una impresión general.

### ⬜ T-8.2 — Corregir los hallazgos de T-8.1

- Depende de T-8.1.
- Priorizar: navegación por teclado del flujo de búsqueda → shortlist → notas (es el camino de trabajo diario de un recruiter), luego el resto.

**Terminado cuando:** `@axe-core/playwright` corre contra las cuatro rutas sin violaciones de nivel `serious` o `critical`, y el camino shortlist→notas es completable sólo con teclado (verificado a mano, documentado en la bitácora).

### ⬜ T-8.3 — Extraer los strings de `/talent/*` a `lib/i18n/`

- Mismo patrón que `lib/i18n/resumex.ts` ya usa para Career: no inventar un sistema nuevo, extenderlo o crear su análogo para Talent si la estructura actual no separa bien por producto.
- Cubrir como mínimo: landing pública de Talent, `TalentAssessor`/`AssessmentCards`, el flujo de Mapper (incluida la sección "What this does not tell you", R-007/R-014 — su honestidad no puede perderse en la traducción), `/talent/searches`.

**Terminado cuando:** cambiar el idioma activo (el mecanismo que ya usa Career) traduce también las cuatro páginas de Talent, sin strings en inglés/español mezclados por accidente.

### Riesgos de la Fase 8

| Riesgo | Mitigación |
|---|---|
| Traducir la sección "What this does not tell you" pierde matiz y suena a disclaimer legal genérico | Traducción revisada por una persona, no sólo generada; es contenido que sostiene R-007/R-014, no boilerplate |
| Arreglos de a11y tocan estructura DOM de componentes compartidos con Career | Verificar que `npm run test:e2e:talent-mapper` y el nuevo `test:e2e:career` (T-7.2) sigan pasando después de cada cambio |

---

# Fase 9 — Paridad visual de superficies satélite

**Objetivo.** Alinear la extensión Chrome y el puente `/extension-auth` a la paleta clara R-020. Hoy son las dos únicas superficies que todavía muestran el tema oscuro descartado, con acento cyan que ya no existe en ningún otro lugar del producto.

**Por qué ahora.** Es deuda visual heredada de la Fase 1 (dark-only) que sobrevivió al cambio a paleta clara porque requiere publicar una nueva versión de la extensión — se documentó como riesgo abierto y nunca se resolvió. Cuanto más tiempo pase, más raro se ve un login que entra a una extensión oscura desde una web clara.

**Precondiciones.** Ninguna. Independiente de las Fases 7 y 8.

### ⬜ T-9.1 — Repintar `app/extension-auth/page.tsx`

- Reemplazar `bg-[#0d1117]`, `text-cyan-400` y el resto de la paleta oscura hardcodeada por los tokens `--canvas-*`/`brand-*` que ya usa el resto de la app.
- Es una sola página; no requiere versión nueva de la extensión para desplegarse (corre en el dominio de ResumeX, no en el paquete de la extensión).

**Terminado cuando:** `/extension-auth` renderiza con el mismo canvas gris y acento navy que `/login`, verificado visualmente en el navegador (Playwright screenshot o inspección manual).

### ⬜ T-9.2 — Repintar `chrome-extension/popup.html` / `popup.js`

- Mismo criterio de color que la web: canvas claro, acento `#1d3559`, sin cyan.
- Depende de publicar una nueva versión del paquete de la extensión (cambia `manifest.json` versión) — coordinar con quien administra la Chrome Web Store antes de asumir que un commit alcanza.

**Terminado cuando:** el popup usa la paleta clara y la nueva versión está subida (o al menos empaquetada y lista para subir, si publicar requiere una cuenta que el agente no tiene).

### Riesgos de la Fase 9

| Riesgo | Mitigación |
|---|---|
| La extensión ya está en manos de usuarios con la versión oscura instalada | Cambio de color no rompe funcionalidad; no requiere migración de datos ni aviso especial |
| Publicar en la Chrome Web Store puede requerir acceso que el agente no tiene | T-9.2 puede cerrarse dejando el paquete listo (`terminado cuando` ajustado) si publicar está fuera de alcance — documentarlo explícitamente, no fingir que se publicó |

---

# Fase 10 — Talent como producto de equipo 🤔

**Estado.** Requiere decisión humana antes de empezar. No tomar ninguna tarea de esta fase sin que exista un cliente o prospecto concreto pidiendo esto — es exactamente el tipo de trabajo especulativo que R-009 y las cancelaciones de T-3.2/T-3.3/T-4.7 ya mostraron que sale mal diseñado sin un consumidor real.

**Objetivo, si se activa.** Búsquedas y notas de Talent hoy son por usuario (`TalentSearch.userId`, decisión "Ownership: Usuario" del cierre de roadmap anterior). Un equipo de contratación con más de un recruiter necesita compartir shortlists y notas sobre el mismo research de candidatos.

**Trigger para activar esta fase:** un cliente de Talent con ≥2 recruiters pidiendo ver el trabajo del otro, o una venta enterprise que lo condicione.

### 🤔 T-10.1 — Modelar `Organization`

- `Organization`, `OrganizationMember` (rol: admin/recruiter), `TalentSearch.organizationId` opcional junto a `userId` (no reemplazarlo — una búsqueda sigue teniendo un autor).
- Migración Prisma que no rompa las búsquedas existentes (todas quedan sin organización, visibles sólo para su dueño, como hoy).

**Depende de:** decisión humana de activar la fase.

### 🤔 T-10.2 — Compartir shortlist y notas dentro de una organización

- `ShortlistEntry`/`CandidateNote` visibles para todo miembro de la organización dueña de la búsqueda, no sólo el creador.
- Decidir si las notas son de autor único (con atribución) o editables por cualquier miembro — probablemente la primera, dado R-014 (declarar lo que no se sabe: una nota sin autor claro pierde procedencia).

**Depende de:** T-10.1.

### 🤔 T-10.3 — Invitaciones y gestión de miembros

- Flujo mínimo: el admin de una organización invita por email, el invitado acepta y queda vinculado.
- No construir roles granulares por feature (RBAC completo) sin un segundo caso de uso — dos roles (admin/recruiter) alcanzan hasta que aparezca demanda de un tercero.

**Depende de:** T-10.1.

---

# Fase 11 — Comercialización ⏸️

**Estado.** Diferida, igual que en el cierre de roadmap anterior (T-6.2, T-6.3). Se deja escrita para no perder el trabajo de diseño cuando llegue el momento, no para tomarse ahora.

### ⏸️ T-11.1 — Precio de Talent

- Hoy sólo existe `PLANS`/`formatProPriceLabel` para Career ($5/mo). Talent no tiene plan, ni Stripe price ID, ni gate de features.
- Antes de precificar: decidir el modelo (por asiento, por búsqueda, flat) — es una decisión de negocio, no técnica. No adivinar un número.
- **Trigger para activar:** intención de cobrar por Talent, aunque sea a un solo cliente piloto.

### ⏸️ T-11.2 — Ashby (integración ATS)

- T-4.7 quedó diferida por falta de cliente concreto. Sigue diferida.
- **Trigger para activar:** un cliente de Talent que use Ashby y pida exportar/sincronizar candidatos ahí. Sin eso, es una integración especulativa contra una API que puede haber cambiado para cuando haya demanda real — revisar la documentación de Ashby de nuevo en ese momento, no confiar en lo que se sabía en 2026-08-05.

### ⏸️ T-11.3 — Revisión de marca

- "ResumeX" es vocabulario de candidato; un recruiter no compra una herramienta nombrada por el documento que recibe (riesgo ya anotado en el handoff).
- **Trigger para activar:** Talent empieza a traer clientes empresariales de forma sostenida, no un solo lead.

---

# Fase 12 — Deuda arquitectónica (capa HTTP, límites y fronteras)

> **El detalle completo vive en [`docs/ARCHITECTURE_DEBT.md`](./docs/ARCHITECTURE_DEBT.md):** diagnóstico D-1…D-10 con `archivo:línea`, el razonamiento de cada decisión, las **anti-tareas** y la lista de lo que está bien y no hay que tocar. **Leerlo antes de tomar cualquier T-12.x** — varias de estas tareas tienen una trampa que no se ve desde el título.

**Objetivo.** Cerrar la deuda estructural que encontró la auditoría del 2026-08-06: la capa HTTP tiene dos dialectos (5 patrones de auth, 5 de validación, 4 formas de error sobre ~68 handlers), el gasto de OpenAI no tiene techo, hay type assertions en el borde de confianza, y el componente más valioso del producto es el menos testeable.

**Por qué el número 12 no es la prioridad.** El número es orden de creación. Esta fase va **antes** de las Fases 8 y 9 y compite de igual a igual con lo que queda de la 7. Razón: D-1 (drift de auth) es la única deuda que **empeora con el tiempo** — cada ruta nueva escrita antes del arreglo es otra migración pendiente — y D-2 es la única que cuesta **dinero real**.

**Decisiones que fija esta fase.** R-021 (envelope plano), R-022 (cuota durable), R-023 (frontera por lint), R-024 (sin casts en el borde), R-025 (retirado el destino `lib/career`/`lib/talent`). Están en `AGENT_HANDOFF.md` § Capa HTTP, límites y fronteras.

## Ola 0 — Poder medir

### ✅ T-12.1 — Frontera Career/Talent enforceada por ESLint (R-023)

Mejor relación valor/esfuerzo del plan: un archivo de config y R-005 deja de depender de la memoria de nadie.

**Terminado (2026-08-06):** `eslint.config.mjs` define zona Career y zona Talent y las restringe **en ambas direcciones** con `no-restricted-imports`; el mensaje cita R-005/R-023 y apunta a R-009. `npm run lint` queda con 0 errores **sin tocar ningún import existente** (confirma que la frontera ya se cumplía), y una violación deliberada en cada dirección falla.

Corrección respecto del diseño original: **no hace falta allowlistear ningún puente.** `lib/ats/**` y `lib/talent-mapper/**` son ambos Talent, así que `lib/ats/from-researcher.ts` es intra-producto y legal por construcción.

### ✅ T-12.2 — Índices por usuario y parseo defensivo del perfil

**Terminado (2026-08-06):** `@@index([userId, createdAt])` en `Application` y `Answer` — compuesto, no sólo `[userId]`, porque los dos listados filtran por `userId` y ordenan por `createdAt`, así que un índice sirve al `WHERE` y al `ORDER BY`. Migración `20260806130000_userid_indexes` con `IF NOT EXISTS` (replayable: este repo ya recuperó a mano una migración a medio aplicar, P3009) y sin `CONCURRENTLY` porque `migrate deploy` envuelve cada migración en una transacción. `parseProfileJson` en `app/api/profile/route.ts` devuelve `null` ante JSON corrupto en vez de tirar 500; el cliente ya maneja `profileJson` falsy.

Verificado: `prisma validate`, `prisma generate`, migración sin BOM, typecheck/lint/tests verdes. **No verificado contra Postgres real** (sin base de datos en el entorno): la ruta de valor corrupto queda como comprobación de deploy. La conversión de la columna a `Json` es T-12.11.

### ⬜ T-12.3 — Observabilidad mínima (cierra B-11)

- Paso gratis primero: documentar en `VERCEL.md` que `get_runtime_errors`/`get_runtime_logs` del MCP de Vercel ya sirven, y cómo consultarlos.
- Después decidir Sentry o equivalente. Instrumentar fallos de OpenAI, de proveedor ATS, y el `catch` de `runStructuredAnalysis`.
- Sin PII: nunca CV ni JD completos, sólo longitudes (como ya hace `debugLog`).

**Terminado cuando:** un error provocado a propósito aparece con stack y ruta en la herramienta elegida, y está escrito dónde mirarlo.

## Ola 1 — Frenar la sangría

### ⬜ T-12.4 — Cuota durable sobre `UsageEvent` (R-022, cierra B-12)

La única deuda con **dinero en juego**. Media implementación ya existe y nadie la generalizó: `UsageEvent` con `@@index([userId, name, createdAt])` y `countUsage`/`recordUsage` en `lib/entitlements.ts:24-36`.

- `lib/quota.ts` con `assertQuota({ userId, name, limit, windowMs })`. **Sin dependencia nueva ni tabla nueva** — no hace falta Redis para este volumen.
- `lib/entitlements.ts` se reescribe encima sin cambiar su API pública ni los límites actuales.
- Aplicar a toda ruta autenticada que llame a OpenAI o fuente externa: **`talent-assess` y `talent-mapper/search` hoy no tienen nada**, más `format`, `extract-job`, `extract-criteria`, `outreach`, `match-score`, `autoapply/parse-profile`, `profile/resume`.
- Budget cap real: `costUsd Float?` en `UsageEvent`, escribiendo el `estimatedCostUsd` que `lib/token-usage.ts` ya calcula.
- `consumeRateLimit` en memoria se queda sólo para ráfagas pre-auth (`register`, `extension/token`), documentando que es best-effort por instancia.
- Pro con límite **alto, no infinito**: un límite ausente no es un plan de precios.

**Terminado cuando:** un test agota la cuota de `talent-assess` y recibe 429/402 con `code`; el segundo intento no llega a OpenAI (verificable con el mock); hay test de corte por gasto acumulado.

### ⬜ T-12.5 — Envelope de error único y plano (R-021)

⚠️ **Leer R-021 antes de escribir una línea.** La migración va **de ATS hacia Career**, no al revés — la intuición contraria rompe el login de la extensión en producción, porque `chrome-extension/popup.js:275` asigna `data.error` (string) a `textContent`.

- `lib/api/response.ts` con `apiError`/`apiOk`. Forma plana: `error` string, `code`/`retryable`/`details` al lado.
- `lib/ats/http-response.ts` pasa a wrapper delgado, **preservando** su mapeo `AtsError.code → status`.
- Actualizar en el mismo commit `AtsIntegrationsClient.tsx` y `SendToAtsModal.tsx`.
- No cambiar los strings de `error` existentes: son copy visible y mezclarlo hace irrevisable el diff.
- ⚠️ Verificar que el 402 de entitlements siga entregando `upgradeUrl` (lo consume el CTA de upgrade).

**Terminado cuando:** grep de `NextResponse.json({ error` vacío fuera de `lib/api/response.ts`; el login de la extensión desempaquetada muestra el mensaje real y no `[object Object]`; ambos E2E verdes.

### ⬜ T-12.6 — Zod en el borde de escritura (R-024)

- Reemplazar `as TalentSearchWriteInput` (`searches/route.ts:40`, `[id]/route.ts:52`) y `as Record<string, unknown>` (`profile/route.ts`) por esquemas.
- **`resultJson` no lleva esquema campo por campo** — duplicaría `ResearcherCandidate` y se desincronizaría. Lleva: esquema de envelope + cap de bytes + `schemaVersion`. El motivo está en `docs/ARCHITECTURE_DEBT.md`; entenderlo antes de discutirlo.

**Terminado cuando:** un POST con `criteriaJson` malformado devuelve 400 con `code: "validation"` en vez de persistir; un `resultJson` sobre el cap devuelve 413/400; hay test de que un `schemaVersion` desconocido no revienta la UI.

## Ola 2 — Estructura

### ⬜ T-12.7 — Un solo punto de entrada de auth

**Depende de T-12.5** (el envelope debe existir para que los 401 sean consistentes).

- Borrar las tres copias locales de `resolveUserId` (`profile:7-11`, `tracker:7-11`, `answers:7-11`) y usar `requireUserId`, que ya hace exactamente eso.
- Migrar los ~11 handlers con `getServerSession` inline a `requireSession`.
- Arreglar `answers/[id]/route.ts:8`: `session?.user?.id`, no `!session`.
- ⚠️ **`match-score` necesita verificación, no arreglo directo.** Devuelve 200 + `{score:null,error}` sin auth (`:27-28`). Antes de cambiarlo a 401, leer `chrome-extension/content.js` y `background.js`; si la extensión trata non-200 como fatal, el cambio viaja junto con la publicación de T-9.2.
- Regla de lint que prohíba `getServerSession` fuera de `lib/auth-options.ts` y `lib/require-auth.ts`.

**Terminado cuando:** `rg "getServerSession" app/api` sólo matchea vía helpers; `rg "resolveUserId"` vacío; los dos E2E verdes.

### ⬜ T-12.8 — `defineRoute`

**Depende de T-12.5 y T-12.7.** Con ~68 handlers R-009 está satisfecho de sobra; el riesgo acá es abstraer **de más**.

- `lib/api/handler.ts`: auth → cuota → Zod → handler → mapeo de error. Sin registro de middlewares, sin DI, sin decoradores.
- Migrar 3-4 rutas piloto (una Career simple, una con Bearer, una ATS con ownership). **Si no quedan más cortas y claras, abandonar la tarea** — 12.5 + 12.7 ya dan el 80%.

**Terminado cuando:** las rutas piloto quedan sin boilerplate, y la decisión de seguir o abandonar está en la bitácora con esas rutas como evidencia.

## Ola 3 — El componente grande

### ⬜ T-12.9 — Descomponer `TalentMapperWorkspace.tsx`

1.497 líneas, 36 `useState`. Mezcla fetch, `localStorage`, sync al servidor, CSV y todo el wizard. El motor debajo está fijado por tests (R-012); el componente que lo maneja, no.

**Refactor puro: cero cambio de comportamiento.** `npm run test:e2e:talent-mapper` verde **después de cada paso**, no sólo al final.

1. `useTalentSearchDraft` (localStorage + URL).
2. `useTalentSearchPersistence` (create/update/shortlist/notes + debounce).
3. `useMapperFilters` (sort/filtros/derivados) — lógica pura, la primera testeable unitariamente.
4. Nombrar la máquina de estados: `step` + flags → `useReducer`.
5. Separar presentación: `RoleStep`, `CriteriaStep`, `ResultsStep`, `FiltersBar`.

- **No** introducir Zustand/Redux: R-009 aplica a dependencias igual que a abstracciones.

**Terminado cuando:** el workspace queda < 300 líneas; los hooks 1-3 tienen test unitario; E2E verde; comparación visual antes/después sin diferencias (mismo método que `b7ffc87`).

## Ola 4 — Requiere decisión humana

### 🤔 T-12.10 — Calibrar precisión antes de agregar fuentes

Resuelve la tensión R-013 / R-014: PubMed entró **antes** de medir la precisión de OpenAlex, y la desambiguación de autores ya era riesgo abierto — fusionar dos fuentes con modelos de identidad distintos lo multiplica.

- Fixtures: 3-5 roles reales con investigadores etiquetados bueno/malo/dudoso **por criterio humano de dominio**. El etiquetado *es* la tarea y no lo puede hacer un agente.
- Script (no test) que imprima `precision@10` para OpenAlex solo, PubMed solo y merge dual. Es una **medición**: reporta un número, no falla el build.
- Si el merge dual empeora la precisión, la respuesta puede ser dejar PubMed detrás de un flag apagado, no borrarlo.
- **Bloquea B-10** (tercera fuente).

**Terminado cuando:** el script reporta las tres cifras y la conclusión sobre R-013 queda en la bitácora.

### 🤔 T-12.11 — `Profile.profileJson` a columna `Json`

**Depende de T-12.3** (migrar datos sin ver errores de producción es apostar). Migración con backfill de `String?` a `Json?` y lectura tolerante durante la transición. Separada de T-12.2 a propósito.

### Riesgos de la Fase 12

| Riesgo | Mitigación |
|---|---|
| Unificar el error hacia el shape anidado de ATS porque "es el código más nuevo" | R-021 y `docs/ARCHITECTURE_DEBT.md` explican por qué es al revés. Verificación obligatoria con la extensión desempaquetada en T-12.5 |
| Mover los 40 archivos planos de `lib/` a carpetas por producto | Anti-tarea explícita. R-025 lo retira: churn de imports con cero cambio de acoplamiento. T-12.1 ya dio el beneficio |
| T-12.9 cambia comportamiento sin que nadie lo note | Es refactor puro por contrato; E2E después de cada paso y comparación visual antes/después |
| Cambiar el 200 de `match-score` rompe la extensión desplegada | Verificar consumo en `content.js`/`background.js` antes; si rompe, viaja con T-9.2 |
| Meter Redis/Upstash para el rate limit | Anti-tarea: `UsageEvent` ya existe e indexado. Sobreingeniería para este volumen |

---

# Backlog transversal

Heredado del cierre de roadmap anterior más lo que surgió de esta auditoría. No tiene fase asignada porque cada ítem es independiente y de tamaño pequeño — tomar cualquiera sin esperar el orden de fases.

| ID | Estado | Descripción |
|---|---|---|
| ⬜ B-2 | `format-resume`/`merge-profile`/`parse-profile` sin tests | Absorbido por **T-7.1** |
| ✅ B-3 | E2E Career | Cerrado por **T-7.2** |
| ⏸️ B-6 | `criterionKind` (tipar categoría del criterio: técnica/organismo/área/geografía) | Diferida — sin segundo consumidor que lo necesite hoy; revivir si Talent Mapper o Assess necesitan pesos por tipo de criterio |
| ✅ B-7 | `aiInferred` en `CriteriaItem`/`StrongMatch` | Confirmado presente en `lib/types.ts:35,42` — cerrar como hecho |
| ⬜ B-8 | i18n Talent pendiente | Absorbido por **T-8.3** |
| ⬜ B-9 | a11y `/talent` pendiente | Absorbido por **T-8.1**/**T-8.2** |
| ⛔ B-10 | Segunda fuente de evidencia (NIH RePORTER o Europe PMC) | **Bloqueada por T-12.10.** Ya entró PubMed sin medir precisión (R-013); no agregar una tercera fuente hasta tener la línea base. No es "diferida por falta de tiempo": sin medición no se puede saber si ayuda |
| ⬜ B-11 | Observabilidad de errores en producción | Absorbido por **T-12.3**. Sube de prioridad: sin esto no se puede verificar en prod ninguna corrección de la Fase 12 |
| ⬜ B-12 | Límite de costo/uso de OpenAI | Absorbido por **T-12.4**. Confirmado peor de lo anotado: `/api/talent-assess` y `/api/talent-mapper/search` no tienen **ni entitlement ni rate limit**, y `lib/rate-limit.ts` es un `Map` en memoria — por instancia, o sea nada en serverless |

---

# Decisiones humanas pendientes

| # | Pregunta | Qué depende de la respuesta |
|---|---|---|
| 1 | ¿Algún cliente de Talent ya pidió compartir shortlists entre recruiters? | Activa la Fase 10 |
| 2 | ¿Hay intención de cobrar por Talent en el corto plazo? | Activa T-11.1 |
| 3 | ¿Algún cliente de Talent usa Ashby? | Activa T-11.2 |
| 4 | ¿Vale la pena publicar ya una versión nueva de la extensión Chrome, o esperar a acumular más cambios? | Afecta el timing de T-9.2 (no su necesidad) |

---

## Bitácora de este archivo

- **2026-08-05** — Roadmap cerrado en alcance agente: Fases 3–6 + backlog viable (entrada anterior, preservada en el historial de git).
- **2026-08-05** — T-3.4 procedencia; T-3.1/T-3.2; Fase 2 completa (entrada anterior, preservada en el historial de git).
- **2026-08-06** — **Fase 12 abierta y arrancada** tras la auditoría de arquitectura (sólo lectura, contra el código real y no contra este archivo). Diagnóstico D-1…D-10 y razonamiento completo en [`docs/ARCHITECTURE_DEBT.md`](./docs/ARCHITECTURE_DEBT.md); decisiones R-021…R-025 en el handoff. Cuatro olas, T-12.1…T-12.11; **T-12.1 y T-12.2 ya hechas** en `cursor/architecture-debt-phase-12-7496`. Prioridad por encima de las Fases 8 y 9 pese al número, porque D-1 (drift de auth) empeora con el tiempo y D-2 (gasto sin techo) cuesta dinero. Backlog: B-11 absorbido por T-12.3, B-12 por T-12.4, B-10 pasa de ⏸️ a ⛔ bloqueada por T-12.10. Hallazgo que reordena el trabajo: la extensión desplegada lee `data.error` como string (`chrome-extension/popup.js:275`), así que la unificación del envelope va **de ATS hacia Career** y no al revés.
- **2026-08-05** — Nuevo roadmap post-cierre: Fases 1–6 confirmadas completas en producción (`add4208`). Auditoría de terreno (tests, CI, i18n, a11y, tema de extensión, modelos Prisma) y apertura de Fases 7–11: red de seguridad (tests + E2E Career + CI), accesibilidad/i18n de Talent, paridad visual de la extensión, equipos (🤔 condicionada) y comercialización (⏸️ diferida). Backlog transversal actualizado: B-2/B-3/B-8/B-9 absorbidos por tareas nuevas, B-7 cerrado como ya hecho, B-11/B-12 nuevos (observabilidad, límite de costo OpenAI). El detalle tarea-por-tarea de las Fases 1–6 se conserva íntegro en `AGENT_HANDOFF.md` § Bitácora de cambios y en el historial de git de este archivo; no se repite acá para no diluir las fases nuevas.
