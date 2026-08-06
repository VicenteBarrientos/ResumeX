# Agent Handoff ? ResumeX

> Bit?cora compartida para que cualquier agente pueda conocer el estado del trabajo, las decisiones vigentes, la arquitectura de los dos productos y el siguiente paso recomendado.
>
> Este archivo es la **fuente de verdad del d?a a d?a**. El wiki de Obsidian (`ObsidianVault/ResumeX/`) guarda el conocimiento estable; si los dos difieren, manda este archivo.

## Estado actual

- **Última actualización:** 2026-08-06 17:30 UTC — America/Santiago
- **Versión del handoff:** 1.7
- **Estado:** ATS en `main`/`prod`; Demo Ashby E2E OK; CI **verde** en `9301330` ([Actions](https://github.com/VicenteBarrientos/ResumeX/actions/runs/31108825300)). **Auditoría de arquitectura del 2026-08-06** hecha; plan completo en [`docs/ARCHITECTURE_DEBT.md`](./docs/ARCHITECTURE_DEBT.md). **Fase 12 arrancada** en la rama `cursor/architecture-debt-phase-12-7496`: T-12.1 y T-12.2 hechas y verificadas, todavía **sin mergear ni desplegar**.
- **Próximo hito:** cerrar la ola 0 con **T-12.3** (observabilidad, cierra B-11) y seguir con **T-12.4** (cuota durable, cierra B-12) → **T-12.5** (envelope de error) → **T-12.6** (Zod en escrituras).
- **Bloqueos conocidos:** `ZOHO_RECRUIT_*` no están en Vercel. Live Recruitee/Ashby solo vía UI con tokens del cliente. **T-12.10 y T-12.11 requieren decisión/etiquetado humano** — no tomarlas sin eso.
- **Riesgo con dinero en juego:** `/api/talent-assess` y `/api/talent-mapper/search` llaman a OpenAI y a fuentes externas **sin entitlement ni rate limit**, y `lib/rate-limit.ts` es un `Map` en memoria (por instancia, o sea nada en serverless). Es D-2 / B-12 y lo cierra T-12.4.
- **Repositorio canónico:** `C:\Users\hp\Projects\ResumeX` — rama observada `main`.
- **Prod:** `https://resumex.talentxrecruiting.com` (GitHub deploy post-`cb4fd5e`).
- **Wiki:** `C:\Users\hp\ObsidianVault\ResumeX\`

### Trabajo en vuelo

**Fase 12 en la rama `cursor/architecture-debt-phase-12-7496`** (no mergeada): T-12.1 (frontera por ESLint) y T-12.2 (índices `[userId, createdAt]` + parseo defensivo de `profileJson`, migración `20260806130000_userid_indexes`). Al mergear, el próximo deploy aplica esa migración.


## Protocolo para agentes

1. Leer este archivo antes de trabajar.
2. Leer `AGENTS.md` (reglas de c?digo) y `README.md` (setup y env). Para tomar una tarea concreta, [`ROADMAP.md`](./ROADMAP.md): fases desglosadas en tareas con precondiciones y definici?n de terminado. Para contexto de producto, el wiki: `ObsidianVault/ResumeX/ResumeX.md`.
3. Antes de modificar el producto, verificar si existe una decisi?n previa en **Decisiones vigentes**. Si una decisi?n estorba, discutirla ? no ignorarla en silencio.
4. Al terminar una intervenci?n:
   - actualizar **Estado actual** si cambi? el hito, estado o bloqueo;
   - registrar archivos creados o modificados;
   - a?adir una entrada al final de **Bit?cora de cambios**;
   - dejar un siguiente paso concreto y comprobable.
5. No borrar entradas hist?ricas. Si una decisi?n cambia, marcar la anterior como `SUPERADA` y enlazar la nueva.
6. Nunca escribir secretos aqu? ni en el wiki: solo nombres de variables y d?nde viven.
7. Antes de escribir c?digo Next.js, leer la gu?a pertinente en `node_modules/next/dist/docs/`. Esta versi?n tiene breaking changes respecto al conocimiento previo de cualquier modelo.

### Plantilla de entrada

```markdown
### YYYY-MM-DD HH:mm ? agente o tarea

- Objetivo:
- Estado: completado | parcial | bloqueado
- Cambios:
  - `ruta/al/archivo`: descripci?n.
- Decisiones:
- Validaciones realizadas:
- Riesgos o bloqueos:
- Siguiente paso:
```

## Decisiones vigentes

### Repositorio e identidad de producto

| ID | Decisi?n | Motivo | Estado |
|---|---|---|---|
| R-001 | `C:\Users\hp\Projects\ResumeX` es el ?nico repo can?nico. `C:\Users\hp\CS50\ResumeX` queda archivado y no debe commitearse ni pushearse. | Ambas copias apuntaban al mismo remote y hab?an divergido; la copia CS50 usaba Clerk sin base de datos y ten?a una reimplementaci?n parcial del Talent Mapper. Dos copias sobre un mismo remote garantizan p?rdida de trabajo. | Vigente |
| R-002 | Un solo repositorio, un solo deployment y una sola base de datos para los dos productos. | Separar la infraestructura hoy duplicar?a auth, pagos, dise?o y despliegue sin beneficio proporcional. | Vigente |
| R-003 | Los productos se llaman exactamente **ResumeX Career** (candidatos y b?squeda de trabajo) y **ResumeX Talent** (recruiters y equipos de contrataci?n). | Nombres fijos en UI, copy, metadata y documentaci?n. Evita que cada superficie invente su propia variante. | Vigente |
| R-004 | Talent Mapper es una **feature dentro de ResumeX Talent**, no una marca de producto. | Su nombre compite con el del producto y confunde el pitch comercial. | Vigente |

### Arquitectura compartida

| ID | Decisi?n | Motivo | Estado |
|---|---|---|---|
| R-005 | Se comparten los **verbos** (motores), no los **sustantivos** (sujetos). Career opera sobre un CV auto-reportado; Talent sobre un investigador inferido desde publicaciones. No unificar ambos en un tipo `Candidate`. | Un tipo com?n obliga a campos opcionales que s?lo aplican a la mitad de los casos y contamina las dos superficies. | Vigente |
| R-006 | Un ?nico root layout con los providers. `/career` y `/talent` son segmentos normales con su propio `layout.tsx`. No usar m?ltiples root layouts. | Los root layouts m?ltiples fuerzan recarga completa al cruzar entre productos y obligan a duplicar providers. Ver `node_modules/next/dist/docs/.../route-groups.md`. | Vigente |
| R-007 | Toda evidencia mostrada al usuario lleva procedencia: extracto real, fuente, nivel de confianza y marca expl?cita de si la infiri? la IA. Nunca una frase redactada por el modelo presentada como evidencia. | Es la diferencia entre una cita verificable y una alucinaci?n con formato de cita. El modelo de `lib/talent-mapper/` ya lo hace bien y es el est?ndar a replicar. | Vigente |
| R-008 | `AnalysisResult` se separa en dos salidas sobre el mismo motor: una de mejora (Career) y una de decisi?n (Talent). | Hoy mezcla campos de candidato (`gaps`, `suggestions`) con campos de reclutador (`recommendedNextStep`, `phoneScreenQuestions`, `clientFacingBullets`, `sendoutBlurb`). Un tipo sirviendo a dos usuarios es el problema que la separaci?n viene a resolver. | Vigente |
| R-009 | Las abstracciones compartidas se extraen al **segundo uso real**, no antes. | Dise?ar el kernel com?n con un solo consumidor es adivinar. Primero dos usos funcionando, despu?s la abstracci?n. | Vigente |

### Datos, plataforma y calidad

| ID | Decisi?n | Motivo | Estado |
|---|---|---|---|
| R-010 | Prisma es la capa de datos. `localStorage` s?lo como cach? de UI y como contrato con la extensi?n Chrome, nunca como almac?n de verdad. | Los datos del recruiter (shortlists, notas, b?squedas) deben sobrevivir al navegador y ser compartibles. | Vigente |
| R-011 | La convenci?n de Next 16 es `proxy.ts`, no `middleware.ts`. Ya migrado; no reintroducir el nombre viejo. | `middleware` est? deprecado y renombrado en esta versi?n. Codemod: `npx @next/codemod@latest middleware-to-proxy .` | Vigente |
| R-012 | Antes de modificar `scoring.ts` o `aggregate-authors.ts` debe existir cobertura de tests que fije el comportamiento actual. | Es la l?gica que define la calidad del producto y la que regresa en silencio: no rompe el build, s?lo empeora los resultados. | Vigente |
| R-013 | OpenAlex is the broad scholarly discovery source; PubMed is an optional complementary biomedical source with source-specific queries, conservative merge, and no double-counting. | Dual-source Talent Mapper requested 2026-08-05; complements OpenAlex without replacing it. SUPERSEDES the earlier “second source only after calibration” reading for PubMed specifically. | Vigente |
| R-014 | Precisi?n sobre recall en resultados de sourcing. Ante la duda, mostrar menos candidatos y declarar lo que no se sabe. | Un experto de dominio detecta un mal candidato al instante y cada falso positivo cuesta credibilidad. Los campos `unknowns` y `possibleConcerns` existen para eso. | Vigente |
| R-015 | Nunca secretos en el repo, el handoff ni el wiki: s?lo nombres de variables y su ubicaci?n. Las keys de OpenAI y OpenAlex son server-side exclusivamente. | ? | Vigente |

### Superficie y navegaci?n (Fase 1)

| ID | Decisi?n | Motivo | Estado |
|---|---|---|---|
| R-016 | **La landing `/` lidera con ResumeX Career.** Talent no compite por el hero: entra por una banda dedicada bajo la grilla de features que lleva a `/talent`, su propia landing p?blica. | Decisi?n humana del 2026-08-05. Bifurcar en dos puertas es m?s honesto pero mete un click antes de cualquier pitch, y ResumeX no tiene reconocimiento de marca que sostenga ese costo. Career adem?s concentra hoy la superficie y el funnel. Revisar si Talent empieza a traer clientes empresariales. | Vigente |
| R-017 | Las p?ginas se namespacean por producto; **las APIs siguen planas** (`/api/talent-mapper/*`, `/api/tracker`, ?). | La extensi?n Chrome ya desplegada y los emails salientes llevan URLs de API absolutas. Mover las rutas sin versionado rompe clientes que no controlamos. Se har? cuando exista versionado de API. | Vigente |
| R-018 | Toda ruta de p?gina que se mueva o renombre deja un 308 permanente en `PRODUCT_SEGMENT_REDIRECTS` (`next.config.ts`). `redirects` corre **antes** de `proxy.ts`, as? que el `callbackUrl` de login queda apuntando a la ruta nueva. | Bookmarks, URLs indexadas, builds viejos de la extensi?n y links de email siguen funcionando sin tocar al cliente. | Vigente |
| R-019 | `lib/products.ts` es la fuente ?nica de nombres, `basePath`, `home` y navegaci?n de cada producto. Ninguna superficie hardcodea `"ResumeX Talent"` ni `/talent/mapper`. | Es lo que hace cumplible R-003: si el nombre vive en un solo archivo, ninguna superficie puede inventar su variante. | Vigente |
| R-020 | ResumeX tiene **un solo tema y es claro**: canvas gris (`--canvas-top` → `--canvas-bottom`), tarjetas blancas y acento navy `brand-600` (`#1d3559`). Sin toggle y sin variante oscura. La escala `brand-*` vive en `app/globals.css`; es el acento de Career, Talent conserva esmeralda. | Paleta aprobada por el usuario sobre un mockup el 2026-08-05; SUPERA la decisión dark-only de las 16:30 del mismo día. El acento con nombre propio (`brand`, no `indigo`) evita que cada superficie elija su propio azul. | Vigente |

### Capa HTTP, límites y fronteras (auditoría 2026-08-06)

Razonamiento completo, diagnóstico D-1…D-10 con `archivo:línea`, anti-tareas y definición de terminado de cada tarea: **[`docs/ARCHITECTURE_DEBT.md`](./docs/ARCHITECTURE_DEBT.md)**. Tareas tomables: `ROADMAP.md` § Fase 12.

| ID | Decisión | Motivo | Estado |
|---|---|---|---|
| R-021 | Envelope HTTP único y **plano**: `error` es siempre `string`; `code`, `retryable`, `details` van al lado, nunca anidados dentro de `error`. La capa ATS migra **hacia** el plano, nunca al revés. | `chrome-extension/popup.js:275` hace `$("login-error").textContent = data.error ?? "Login failed."`. La extensión desplegada lee `error` como string y no se actualiza en lockstep con la web (mismo motivo que R-017). Si `error` pasa a objeto, el usuario ve `[object Object]`. ATS hoy devuelve el shape anidado (`lib/ats/http-response.ts:26`) pero sus únicos consumidores son componentes React internos, que sí podemos actualizar. | Vigente |
| R-022 | Toda ruta autenticada que llame a OpenAI o a una fuente externa pasa por `assertQuota`. La cuota es **durable** sobre `UsageEvent`, no en memoria. Pro tiene límite alto, no infinito. | `lib/rate-limit.ts:8` es un `Map` del proceso: en serverless limita por instancia, o sea nada. Hoy sólo `analyze` y `cover-letter` tienen entitlement; `talent-assess` y `talent-mapper/search` no tienen ni entitlement ni límite. `UsageEvent` ya existe e indexado por `[userId, name, createdAt]`: no hace falta Redis. | Vigente |
| R-023 | La frontera Career/Talent se enforcea con ESLint `no-restricted-imports` (`eslint.config.mjs`), no con disciplina. **No hay puente que allowlistear:** `lib/ats/**` y `lib/talent-mapper/**` son ambos Talent, así que `lib/ats/from-researcher.ts` es intra-producto. | R-005 se cumplía por vigilancia de cada agente, y la vigilancia no sobrevive a la rotación. Un archivo de config convierte la convención en error de build. Implementada en T-12.1. | Vigente |
| R-024 | Prohibidas las type assertions en el borde HTTP. Zod; o para payloads opacos grandes, esquema de envelope + cap de bytes + `schemaVersion`. | `app/api/talent-mapper/searches/route.ts:40` y `[id]/route.ts:52` aceptan JSON anidado grande vía `as TalentSearchWriteInput` y lo persisten en columnas `Json`; `app/api/profile/route.ts` igual con `as Record<string, unknown>`. Un cast no valida: le pide al compilador que deje de preguntar. Un esquema campo-por-campo de `resultJson` duplicaría `ResearcherCandidate` y se desincronizaría — de ahí envelope + cap + versión. | Vigente |
| R-025 | El destino `lib/career/` / `lib/talent/` queda **RETIRADO**. La separación de productos vive en las rutas, en los subárboles de feature (`lib/talent-mapper/`, `lib/ats/`) y en la regla de lint de R-023. | Se documentó como destino en este archivo y no se ejecutó en seis fases; `lib/` tiene 40 archivos planos en la raíz. La frontera real ya se cumple por otro medio, así que mover 40 archivos sería churn de imports con cero cambio de acoplamiento. Documentar el mecanismo real en vez de un objetivo que nadie tomó. | Vigente |

## Arquitectura de producto

Un motor, dos productos, dos usuarios distintos:

```
ResumeX Career   CV ? Job    ? ?c?mo consigo esta entrevista?
ResumeX Talent   Job ? Persona ? ?a qui?n contacto y por qu??
```

### Superficie actual (post Fase 1)

| Producto | P?ginas | APIs (siguen planas, R-017) |
|---|---|---|
| **Career** | `/career` (? home), `/career/cv`, `/career/analyzer`, `/career/cover-letter`, `/career/jobs`, `/career/jobsearcher`, `/career/tracker{,/add,/profile,/[id]}`, `/career/autoapply`, `/career/onboarding` | `analyze`, `format`, `cover-letter`, `extract-job`, `jobs`, `match-score`, `profile`, `profile/resume`, `tracker`, `tracker/[id]`, `answers`, `answers/[id]`, `autoapply/*`, `extension/*`, `cron/job-digest` |
| **Talent** | `/talent` (landing p?blica), `/talent/mapper`, `/talent/assess` | `talent-mapper/{search, extract-criteria, outreach, status}`, `talent-assess` |
| **Compartido** | `/` (landing Career, R-016), `/login`, `/register`, `/upgrade`, `/extension-auth` | `auth/*`, `stripe/*` |

Career tiene diez superficies y Talent dos. El desbalance es real y est? bien: Talent es el producto nuevo y m?s caro por usuario.

Rutas planas viejas ? 308 permanente al segmento correspondiente (R-018). `/formatter`, que ya era un alias, ahora apunta a `/career/cv` en vez de a `/`.

Protegido por `proxy.ts`: `/career`, todo `/talent/*` (landing `/talent` p?blica), `/upgrade`, `/extension-auth`. P?blico: `/`, `/talent`, `/login`, `/register`.

### Destino (el bloque `lib/` de acá quedó SUPERADO por R-025)

> **Leer antes del árbol de abajo.** La parte de `app/` describe la realidad actual y sigue vigente, salvo que el tema ya no es dark (R-020) y `app/api/career|talent` quedó diferido por R-017 (las APIs siguen planas).
>
> La parte de **`lib/`** es aspiracional y **no se cumplió**: `lib/career/` y `lib/talent/` nunca se crearon, `lib/evidence/` se canceló en T-3.2 y `lib/roles/` en T-3.3. Hoy `lib/` tiene 40 archivos planos en la raíz más `talent-mapper/` y `ats/`. **R-025 retira ese destino**: la frontera se enforcea por lint (R-023), no por carpetas. No tomar el árbol de abajo como plan de refactor.

```
app/
  layout.tsx                  ? ?nico root: providers, locale, auth (tema dark fijo)
  (marketing)/
    page.tsx                  ? landing en "/"
  career/
    layout.tsx                ? navegaci?n e identidad de ResumeX Career
    cv/  analyzer/  cover-letter/  jobs/  tracker/  autoapply/
  talent/
    layout.tsx                ? navegaci?n e identidad de ResumeX Talent
    mapper/  candidates/  shortlists/
  api/
    career/  talent/  (auth, stripe quedan en la ra?z de api/)

lib/
  evidence/     (no extraer el matcher de Talent Mapper ? T-3.2 cancelada; veredictos LLM con procedencia nacen en T-3.4 si hace falta)
  roles/        job description ? criterios           ? pendiente T-3.3
  ai/  documents/  i18n/
  career/       analyze, format-resume, job-*, autoapply
  talent/       (el actual talent-mapper)
```

Regla de frontera: si un componente lo importan los dos `layout.tsx` de producto, es compartido. Si s?lo uno, pertenece a ese producto.

## Plan de separaci?n

> Resumen de las fases. El desglose en tareas tomables ? precondiciones, pasos, definici?n de terminado, riesgos y anti-tareas ? est? en [`ROADMAP.md`](./ROADMAP.md).

**Fase 1 ? Rutas y marca. ? Completada el 2026-08-05.** Segmentos `/career` y `/talent` con `layout.tsx` propio y navegaci?n separada. Redirects permanentes desde las rutas planas. Nombres R-003 en metadata, nav y copy. `lib/` intacto salvo el `lib/products.ts` nuevo. Pendiente respecto del destino: `app/api/career|talent` (diferido por R-017) y `talent/candidates|shortlists` (llegan en la Fase 4).

**Fase 2 ? Salidas separadas.** Partir `AnalysisResult` seg?n R-008. Career recibe la salida de mejora; Talent la de decisi?n. Mismo motor debajo.

**Fase 3 ? Kernel compartido.** T-3.1 cancel? subir el matcher a `lib/evidence/` (T-3.2). **T-3.4 hecha:** Career y Talent Assess usan `CriteriaItem` con procedencia. Queda T-3.3 (`lib/roles/`) como independiente.

**Fase 4 ? Talent como herramienta de trabajo.** Persistencia Prisma de b?squedas, shortlists, notas y estados. Export e integraci?n Ashby.

**Fase 5 ? Consolidaci?n de repos.** Absorber `resumex-sourcing-copilot` una vez que exista la capa de datos. Archivar `resumex-tracker`. Definir si la extensi?n vive aqu? o en `job-applier`.

## Riesgos abiertos

| Riesgo | Detalle | Mitigaci?n |
|---|---|---|
| Copias divergentes | Dos working copies compart?an remote y se perdi? trabajo en paralelo. | R-001. Verificar `git remote -v` y la ruta antes de trabajar. |
| Desambiguaci?n de autores | OpenAlex fusiona y parte identidades, sobre todo con nombres chinos y latinos. Aparecer? en cualquier demo. | Mostrar la duda expl?citamente en vez de ocultarla. ORCID ayuda pero su cobertura es parcial. |
| Regresi?n silenciosa de scoring | Cambiar pesos o agregaci?n no rompe el build, s?lo empeora los resultados. | R-012. |
| Marca | "ResumeX" es vocabulario de candidato; un recruiter no compra una herramienta nombrada por el documento que recibe. | Aceptado por ahora. Revisar si Talent gana clientes empresariales. |
| Deuda de auth | La copia archivada usaba Clerk; el can?nico usa NextAuth. No mezclar patrones al portar ideas desde la rama archivada. | ? |

## Comparaci?n de evidencia (T-3.1)

Tres superficies, dos modelos. El roadmap contrastaba Career vs Talent Mapper; tras T-2.7 hay un tercer consumidor que hereda el modelo d?bil.

| Superficie | Tipo | Origen de la evidencia | Qu? garantiza |
|---|---|---|---|
| Career `/api/analyze` | `CriteriaItem` | LLM sobre CV + JD | Nada verificable: `evidence` es prosa del modelo |
| Talent `/api/talent-assess` | `CriteriaItem` (mismo `AnalysisBase`) | LLM sobre CV + JD | Igual: misma forma d?bil |
| Talent Mapper | `EvidenceMatch` | Matcher determinista sobre t?tulo/abstract/topics de una publicaci?n OpenAlex | Extracto con offset, `workId`/`doi`, `confidence`, `matchType` |

### Campos frente a frente

| Concepto (R-007) | `CriteriaItem` | `EvidenceMatch` | ?Com?n de verdad? |
|---|---|---|---|
| Criterio evaluado | `criterion: string` | `criterion: string` | **S?** ? ?nico campo id?ntico |
| Extracto real | `evidence: string` (prosa libre; a menudo par?frasis o `"Not found in resume."`) | `snippet: string` (recorte del corpus de la obra) | **No** ? mismo nombre conceptual, garant?as opuestas |
| Fuente identificable | ausente (el CV entero es impl?cito) | `workId`, `workTitle`, `doi?`, `openAlexUrl?`, `year?` | **No** ? espec?fico de publicaciones |
| Confianza | ausente | `confidence: direct \| strong_adjacent \| possible` | **No** |
| Tipo de match / marca de inferencia | ausente | `matchType: exact \| adjacent \| inferred` | **No** ? taxonom?a de overlap de frases en papers |
| Cumplimiento del criterio | `met: boolean` | no existe: Mapper s?lo emite matches hallados; los gaps van a `unknowns` / score | **No** ? sem?nticas distintas |
| Motor | prompt + schema JSON en `lib/analyze.ts` | `matchEvidence()` en `lib/talent-mapper/evidence.ts` (~319 l?neas) | **No** ? no se pueden reutilizar |

### Qu? s? es com?n (a nivel de producto, no de tipo)

La **exigencia** de R-007: extracto, fuente, confianza, marca de inferencia. Eso es un contrato de honestidad, no un struct compartido. Hoy lo cumple s?lo Talent Mapper.

El bug visto en el smoke de Assess (must-have "5+ years" ? `met: false` + `"Not found in resume."` cuando el CV s? declara cinco a?os) es exactamente el colapso de `met: boolean`: no distingue *no cumple* de *evidencia insuficiente / mal etiquetada*.

### Decisi?n sobre T-3.2

**Cancelar T-3.2 tal como estaba scoped.** Mover `evidence.ts` a `lib/evidence/` no le da un segundo consumidor real: Career/Assess no pueden llamar `matchEvidence(work, criteria)` sobre un CV. Extraerlo violar?a R-009 (dise?ar el kernel desde un solo uso) y la regla de frontera (si s?lo lo importa un producto, no es kernel).

Un contrato tipado delgado (`CriterionVerdict` + procedencia) puede nacer **dentro de T-3.4** al migrar `CriteriaItem`, compartido por Career y Assess (ya son dos consumidores del mismo tipo). No hace falta ?ni conviene? unificarlo con `EvidenceMatch`.

`StrongMatch.evidence: string` tiene el mismo defecto y debe migrar junto con `CriteriaItem`.

## Pr?ximas tareas recomendadas

1. **T-3.3** ? evaluar si JD?criterios justifica `lib/roles/` (Talent Mapper `criteria.ts` vs prompt de `analyze.ts`); puede cancelarse como T-3.2.
2. Commit + deploy de T-3.4 y smoke en `/talent/assess` (el caso "5+ years" deber?a poder citar el CV o marcar `insufficient` / `not_met` con quote, no "Not found").
3. Escribir tests de caracterizaci?n sobre `scoring.ts` y `aggregate-authors.ts` antes de tocarlos (R-012).
4. Centralizar el precio de Pro desde Stripe (**$5/mo** sigue hardcodeado en m?s de un lugar).
5. Fase 4 puede correr en paralelo (persistencia Prisma de Talent).

> ⚠️ **La lista de arriba quedó obsoleta** y se conserva sólo como historia (T-3.2 y T-3.3 canceladas, T-3.4 desplegada, tests de `scoring.ts`/`aggregate-authors.ts` escritos en el audit-fix, Fase 4 cerrada). **La lista viva es ésta:**

### Vigente (post-auditoría 2026-08-06)

Prioridad real, no orden de numeración. Detalle de cada tarea: [`docs/ARCHITECTURE_DEBT.md`](./docs/ARCHITECTURE_DEBT.md) y `ROADMAP.md` § Fase 12.

1. ✅ **T-12.1** — frontera Career/Talent por ESLint (R-023). Hecha en `cursor/architecture-debt-phase-12-7496`.
2. ✅ **T-12.2** — índices `[userId, createdAt]` en `Application`/`Answer` + parseo defensivo de `profileJson`. Hecha en la misma rama.
3. **T-12.4** — cuota durable sobre `UsageEvent` (R-022, cierra B-12). **La única deuda con dinero en juego.**
4. **T-12.5** — envelope de error único y plano (R-021). ⚠️ La migración va **de ATS hacia Career**, no al revés: leer R-021 antes de tocar nada.
5. **T-12.3** — observabilidad (cierra B-11). Habilita verificar en prod todo lo demás.
6. **T-12.6** — Zod en las escrituras de `talent-mapper/searches` y `profile` (R-024).
7. **T-12.7** — un solo punto de entrada de auth; borrar las tres copias de `resolveUserId`. ⚠️ `match-score` necesita verificar la extensión antes de cambiar su 200→401.
8. **T-12.9** — descomponer `TalentMapperWorkspace.tsx` (1.497 líneas, 36 `useState`). Refactor puro, E2E verde después de cada paso.
9. Pendiente de antes, sigue válido: centralizar el precio de Pro desde Stripe (**$5/mo** hardcodeado en más de un lugar); T-7.4 (bordes) y Fase 8 (a11y/i18n de Talent).
10. 🤔 **T-12.10** (calibrar precisión OpenAlex vs dual-source, resuelve la tensión R-013/R-014) y **T-12.11** (`profileJson` a columna `Json`) — requieren humano.

## Ideas rescatadas de la copia archivada

La rama `archive/cs50-clerk-2026-08-05` (en la copia CS50) conten?a un redise?o de tipos del Talent Mapper que nunca se implement?. El can?nico ya cubre lo sustancial ?`unknowns`, `possibleConcerns`, manejo de retractions con aviso previo al outreach, dedupe de works y de evidencia?. S?lo tres ideas no existen ac? y valen la pena:

| Idea | Qu? aportar?a |
|---|---|
| `suggestedScreeningQuestions` | Preguntas de screening por candidato, derivadas de sus gaps y unknowns. Convierte el brief en algo accionable en la primera llamada. |
| `criterionKind` | Tipar la categor?a del criterio (t?cnica, organismo, ?rea, geograf?a) en vez de tratarlos como strings equivalentes. Permite pesos y copy por tipo. |
| `aiInferred` / `aiSummarized` | Marcar expl?citamente qu? infiri? la IA y qu? dice el texto literal, a nivel de match y de resumen. Refuerza R-007 y es lo que hace auditable el resultado ante un experto. |

No hay c?digo que portar: eran declaraciones de tipo sin implementaci?n. Tratarlas como backlog, no como migraci?n.

## Bit?cora de cambios

### 2026-08-05 13:46 ? consolidaci?n de repos y creaci?n del handoff

- **Objetivo:** resolver la existencia de dos copias de ResumeX, fijar el nombre de los dos productos y dejar reglas de trabajo escritas.
- **Estado:** completado.
- **Cambios:**
  - `AGENT_HANDOFF.md`: creado. Estado, protocolo, decisiones R-001?R-015, arquitectura, plan de separaci?n en 5 fases, riesgos.
  - `AGENTS.md`: a?adidas reglas de trabajo para agentes bajo el bloque gestionado de Next.js.
  - `ObsidianVault/ResumeX/`: notas `ResumeX Career`, `ResumeX Talent`, `Reglas duras ResumeX`, `Gotchas ResumeX`; actualizados el hub y `_schema`.
  - `C:\Users\hp\CS50\ResumeX`: trabajo sin commitear preservado en la rama local `archive/cs50-clerk-2026-08-05`. No pusheada.
- **Decisiones:** R-001 a R-015.
- **Validaciones realizadas:** comparaci?n de ambas copias (rutas, `package.json`, `lib/talent-mapper/`, remotes, fechas de commit); confirmado que la agregaci?n por autor, el scoring y la UI del Talent Mapper existen completos s?lo en el repo can?nico; confirmada la deprecaci?n de `middleware` a favor de `proxy` en los docs de Next 16 incluidos en `node_modules`.
- **Riesgos o bloqueos:** la landing `/` requiere decisi?n humana antes de la Fase 1.
- **Siguiente paso:** commitear el trabajo en vuelo de `main`, luego ejecutar la Fase 1 del plan de separaci?n.

### 2026-08-05 14:35 ? Fase 1: separaci?n en `/career` y `/talent`

- **Objetivo:** commitear el trabajo en vuelo y ejecutar la Fase 1 del plan de separaci?n.
- **Estado:** completado.
- **Cambios:**
  - Commits previos al split: `f0b4652` Talent Mapper completo, `f017748` log de error en `/api/auth/register`, `2a26369` handoff + `AGENTS.md` + `.cursor/`.
  - `lib/products.ts`: **nuevo.** Fuente ?nica de nombres R-003, `basePath`, `home` y nav de cada producto, m?s `productForPath()` y `otherProduct()`.
  - `app/(marketing)/page.tsx`: la landing (antes `app/page.tsx`) movida al route group. Talent Mapper sale de la grilla de features de Career y entra como banda propia hacia `/talent`. Vuelve a ser honesto el "seis tools".
  - `app/career/`: `layout.tsx` con metadata propia y template de t?tulo; `page.tsx` que resuelve a `/career/tracker`; `cv`, `analyzer`, `cover-letter`, `jobs`, `jobsearcher`, `tracker/**`, `autoapply`, `onboarding` movidos con `git mv`.
  - `app/talent/`: `layout.tsx` propio, `page.tsx` con la landing p?blica de ResumeX Talent (incluye la secci?n "What this does not tell you", R-007/R-014), y `mapper/` desde `app/talent-mapper/`.
  - `app/formatter/`: eliminado. Era un alias que redirig?a a `/`; ahora es un 308 hacia `/career/cv`.
  - `next.config.ts`: `PRODUCT_SEGMENT_REDIRECTS`, diez 308 permanentes desde las rutas planas.
  - `proxy.ts`: `PROTECTED_PREFIXES` pasa de doce rutas planas a cuatro prefijos. `/talent` queda p?blico y s?lo se protege `/talent/mapper`.
  - `components/AppNav.tsx`: la nav se deriva de `productForPath(pathname)` y muestra los links del producto activo m?s un cruce al otro. El wordmark s?lo nombra un producto cuando est?s dentro de uno.
  - Links internos reescritos en 15 archivos, incluidos los que no son UI: email de bienvenida (`api/auth/register`), digest de cron, `chrome-extension/popup.js` y el script E2E.
  - `README.md`, `AGENTS.md`: documentada la superficie de dos productos y las reglas nuevas.
  - `.claude/launch.json`: config de preview para levantar el dev server.
- **Decisiones:** R-016 (landing lidera con Career ? decisi?n humana), R-017 (APIs siguen planas), R-018 (todo movimiento de ruta deja 308), R-019 (`lib/products.ts` como fuente ?nica).
- **Validaciones realizadas:** `npm run typecheck`, `npm run lint`, `npm test` (30 tests) y `next build` en verde ? el ?rbol de rutas del build coincide con el destino. Verificados por HTTP los c?digos de las 13 rutas relevantes: `/` y `/talent` 200, herramientas 307 a login con el `callbackUrl` nuevo, rutas planas 308 al segmento. Renderizado real de `/` y `/talent` revisado en el navegador. `npm run test:e2e:talent-mapper` pasa contra las rutas nuevas: login ? `/talent/mapper` ? demo ? shortlist ? CSV, sin errores de consola ni requests fallidos.
- **Riesgos o bloqueos:** ninguno. Los 308 s?lo existen en local hasta que se pushee; los clientes desplegados (extensi?n, emails viejos) dependen de que ese deploy ocurra.
- **Siguiente paso:** pushear `main` y confirmar los redirects en prod. Despu?s, Fase 2 (R-008).

### 2026-08-05 14:43 ? deploy de Fase 1 y arranque de Fase 2

- **Objetivo:** publicar la separaci?n de productos, verificar sus rutas cr?ticas en producci?n y comenzar R-008 con una red de tests antes de partir el motor.
- **Estado:** completado para T-2.1 y T-2.2.
- **Cambios:**
  - `main`: integrado el commit remoto `9cf05ea` sin perder el split; el email de bienvenida combina el dominio can?nico con `/career/tracker`, la landing alinea Pro en `$5` y el README conserva ambos productos junto al nuevo showcase.
  - `lib/__tests__/analyze.test.ts`: 16 tests de caracterizaci?n para request a OpenAI, respuesta v?lida, JSON inv?lido, campos faltantes, score fuera de rango, uso ausente y todos los caminos de `analysis-errors.ts`.
  - `lib/types.ts`: nuevos `CareerAnalysis` y `TalentAssessment`; `AnalysisResult` queda temporalmente como compuesto de ambos y marcado `@deprecated`.
  - `ROADMAP.md`: T-2.1 y T-2.2 marcadas completas.
- **Decisiones:** la frase ?uni?n de ambos? de T-2.2 no puede coexistir con su requisito de no modificar consumidores: una uni?n TypeScript s?lo expone campos comunes. El alias transitorio usa intersecci?n para representar fielmente el payload legado completo; T-2.6 lo retira.
- **Validaciones realizadas:** `npm run lint`, `npm run typecheck`, `npm test` (46 tests). Deployment de producci?n `dpl_9zy6Ymx38mKgZLgKpTiMzSPbua4D` Ready; logs de Vercel terminan en `Deployment completed`; `/` y `/talent` responden 200; `/talent-mapper` ? `/talent/mapper/` y `/tracker` ? `/career/tracker/` responden 308; render real de `/talent` revisado en navegador.
- **Riesgos o bloqueos:** `npm run build` no puede reproducirse localmente porque Vercel no descarga el valor de la variable sensible `DATABASE_URL` (queda vac?o en `.vercel/.env.production.local`). El mismo build s? termin? correctamente en Vercel con el entorno de producci?n.
- **Siguiente paso:** T-2.3, partir el motor y sus prompts manteniendo el n?cleo en `lib/analyze.ts`.

### 2026-08-05 14:48 ? T-2.3 y T-2.4: motor y summaries por audiencia

- **Objetivo:** partir `lib/analyze.ts` en salidas Career/Talent con prompts distintos, sin romper `/api/analyze`.
- **Estado:** completado.
- **Cambios:**
  - `lib/analyze.ts`: n?cleo compartido `runStructuredAnalysis`; nuevos `analyzeForCareer()` / `assessForTalent()` con prompts y schemas propios; `analyzeResume` queda como puente legacy con el prompt compuesto.
  - `lib/__tests__/analyze.test.ts`: cobertura de las dos funciones nuevas, schemas distintos, clamp/validaci?n por audiencia, y T-2.4 (prompts y summaries de mejora vs decisi?n).
  - `ROADMAP.md`: T-2.3 y T-2.4 marcadas completas.
- **Decisiones:** `/api/analyze` sigue llamando `analyzeResume` hasta T-2.5 para no cambiar el payload compuesto que a?n consumen `ResultCards` y el PDF. El n?cleo no se extrajo a `lib/evidence/` (R-009).
- **Validaciones realizadas:** `npm test` (52), `npm run typecheck`, `npm run lint`.
- **Riesgos o bloqueos:** ninguno nuevo. La calidad del modelo con prompts partidos a?n no se contrast? con fixtures reales (riesgo declarado en el roadmap).
- **Siguiente paso:** T-2.5 ? migrar consumidores; due?o del PDF: Career (el bot?n vive en el analyzer del candidato).

### 2026-08-05 14:53 ? T-2.5 y T-2.6: migrar consumidores y retirar `AnalysisResult`

- **Objetivo:** que Career deje de recibir campos de decisi?n de reclutador, y borrar el tipo compuesto.
- **Estado:** completado.
- **Cambios:**
  - `app/api/analyze/route.ts`: llama `analyzeForCareer`.
  - `lib/types.ts`: `AnalyzeResponse` usa `CareerAnalysis`; `AnalysisResult` eliminado.
  - `components/ResultCards.tsx`, `ResumeAnalyzer.tsx`, `DownloadReportButton.tsx`: tipados a Career; UI sin concern/next-step/strong-matches/phone-screen/client-bullets.
  - `lib/format-analysis.ts`: `formatCareerAnalysisSummary` + `formatTalentAssessmentSummary`.
  - `lib/generate-report-pdf.ts`: PDF de Career (mejora del candidato), sin recomendaci?n de hiring.
  - `lib/analyze.ts`: puente `analyzeResume` retirado.
- **Decisiones:** el PDF pertenece a **Career**. Talent tendr? su propio artefacto cuando exista superficie de evaluaci?n (T-2.7).
- **Validaciones realizadas:** `npm test` (50), `npm run typecheck`, `npm run lint`; `rg AnalysisResult` en `.ts/.tsx` vac?o.
- **Riesgos o bloqueos:** `assessForTalent` existe sin UI ? T-2.7 lo desbloquea o lo deja en espera.
- **Siguiente paso:** decisi?n humana en T-2.7.

### 2026-08-05 15:03 ? T-2.7 opci?n A: `/talent/assess`

- **Objetivo:** dar a Talent el segundo consumidor real de la salida de decisi?n (recomendaci?n del roadmap).
- **Estado:** completado.
- **Cambios:**
  - `app/talent/assess/page.tsx`, `components/talent/{TalentAssessor,AssessmentCards}.tsx`: superficie de evaluaci?n (CV + JD ? brief de decisi?n).
  - `app/api/talent-assess/route.ts`: API plana (R-017) sobre `assessForTalent`.
  - `lib/resolve-resume-job-input.ts`: extracci?n compartida del input CV/JD (segundo uso real con `/api/analyze`).
  - `lib/products.ts`: "Assess" en `TALENT.nav`.
  - `proxy.ts`: todo `/talent/*` protegido; `/talent` sigue p?blico.
  - Landing `/talent`: CTA secundario hacia Assess.
- **Decisiones:** T-2.7 = **A**. Fase 3 puede arrancar con dos consumidores del motor de an?lisis.
- **Validaciones realizadas:** `npm test` (50), `npm run typecheck`, `npm run lint`.
- **Riesgos o bloqueos:** ninguno.
- **Siguiente paso:** T-3.1 ? comparar modelos de evidencia.

### 2026-08-05 15:20 ? Smoke test de `/talent/assess` en prod

- **Objetivo:** verificar el flujo desplegado con el usuario demo.
- **Estado:** completado.
- **Qu? se hizo:** se cre? el usuario demo `tm_e2e_demo` en la base de prod (no exist?a; s? en la local de e2e). Login ? redirect a `/talent/assess` con `callbackUrl`, "Try demo" carga CV+JD de muestra, "Assess candidate" devuelve el brief completo: match 85, concern Medium, next step Screen, criterios con evidencia, strong matches, 5 preguntas de phone screen, bullets de cliente y sendout blurb.
- **Validaciones realizadas:** sin errores de consola propios del flujo (el ?nico 401 fue el intento de login previo a crear el usuario); `proxy.ts` protege `/talent/assess` correctamente.
- **Riesgos o bloqueos:** observaci?n de calidad ? el must-have "5+ years of professional software engineering experience" queda marcado como no cumplido con la etiqueta "Not found in resume", aunque el CV declara 5 a?os y experiencia desde 2018. La estrictez es intencional (precisi?n sobre recall), pero la etiqueta describe mal la evidencia: deber?a distinguir "no encontrado" de "encontrado pero insuficiente". Candidato a T-3.x.
- **Siguiente paso:** T-3.1 ? comparar modelos de evidencia.

### 2026-08-05 15:25 ? T-3.1: comparar modelos de evidencia

- **Objetivo:** decidir si existe forma compartida suficiente para extraer `lib/evidence/` (T-3.2).
- **Estado:** completado.
- **Hallazgo:** el ?nico campo id?ntico es `criterion: string`. Career y Talent Assess comparten `CriteriaItem` (prosa del LLM, `met: boolean`); Talent Mapper usa `EvidenceMatch` (snippet + workId/doi + confidence + matchType, matcher determinista). No hay segundo consumidor real para `matchEvidence()`.
- **Decisiones:** **T-3.2 cancelada.** T-3.4 es el trabajo de la fase (procedencia en `CriteriaItem` / `StrongMatch`, estado ternario). Un contrato tipado delgado, si nace, nace dentro de T-3.4 para Career+Assess ? no unificando con `EvidenceMatch`.
- **Cambios:** secci?n "Comparaci?n de evidencia (T-3.1)" en este handoff; ROADMAP marca T-3.1 ? y T-3.2 cancelada.
- **Validaciones realizadas:** inspecci?n de `lib/types.ts`, `lib/talent-mapper/types.ts`, `lib/talent-mapper/evidence.ts`, usos en analyze/scoring.
- **Siguiente paso:** T-3.4 ? migrar evidencia de Career/Assess a procedencia.

### 2026-08-05 15:30 ? T-3.4: procedencia en CriteriaItem

- **Objetivo:** ning?n campo de evidencia en Career/Assess es prosa libre del modelo sin fuente (R-007).
- **Estado:** completado.
- **Cambios:**
  - `lib/types.ts`: `CriterionStatus` (`met` \| `not_met` \| `insufficient`); `CriteriaItem` / `StrongMatch` con `quote` + `aiInferred` (retirado `met: boolean` y `evidence: string`).
  - `lib/criteria-evidence.ts`: normalizaci?n server-side ? cita no presente en el CV ? `insufficient` (criterios) o drop (strong matches).
  - `lib/analyze.ts`: prompts y schemas de procedencia; `normalize` tras validar.
  - UI: `ResultCards`, `AssessmentCards` ? tres iconos (?/?/?), quote entre comillas, badge "Inferred".
  - `lib/format-analysis.ts`, `lib/i18n/resumex.ts`.
  - Tests: fixtures actualizados; caracterizaci?n de citas fabricadas; `criteria-evidence.test.ts`.
- **Decisiones:** el contrato tipado vive en `lib/types.ts` + helper en `lib/criteria-evidence.ts` (dos consumidores Career/Assess). No se unifica con `EvidenceMatch`.
- **Validaciones realizadas:** `npm test` (59), `npm run typecheck`, `npm run lint`.
- **Siguiente paso:** commit/push + smoke en prod; luego T-3.3 o Fase 4.

### 2026-08-05 15:35 ? T-3.4 en prod + smoke

- **Objetivo:** desplegar procedencia y verificar el caso "5+ years" del smoke anterior.
- **Estado:** completado.
- **Cambios:** commit `ae1f837` pusheado a `main`; deploy production `dpl_4pf5ypfuLRbfJ5vJcKCHMTuiTYFn` READY.
- **Validaciones realizadas:** demo en `/talent/assess` ? match 85, concern Medium, next step Screen. Must-have "5+ years" ahora es ? con quote literal `"5 years of experience building scalable web applications."` (antes era "Not found in resume."). Tres estados visibles (?/?/?); nice-to-haves con "Not stated in resume."; strong matches con quotes entre comillas. Sin "Not found in resume." en la UI.
- **Siguiente paso:** T-3.3 o Fase 4.

### 2026-08-05 16:00 ? Cierre del roadmap (Fases 3?6)

- **Objetivo:** cerrar el roadmap en alcance agente.
- **Estado:** completado (diferidos conscientes: Ashby, Organization, precio/marca Talent, backlog B-3/B-8/B-9).
- **Decisiones:** T-3.3 cancelada; b?squedas por usuario; Ashby diferida; extensi?n en este repo; Fase 6 m?nima (T-6.1).
- **Cambios:** Prisma Talent persistence + APIs + /talent/searches + workspace sync; screeningQuestions; analytics; ARCHIVE.md sourcing-copilot; B-1/B-4/B-5.
- **Validaciones:** npm test (64), typecheck, lint.
- **Siguiente paso:** push + migrate deploy en Vercel.

### 2026-08-05 16:30 ? ResumeX queda dark-only (SUPERADA por la entrada de las 18:15)

- **Objetivo:** quitar el toggle de tema; ResumeX renderiza siempre el fondo oscuro (pedido humano).
- **Estado:** completado.
- **Cambios:**
  - `app/globals.css`: `:root` toma la paleta oscura (`#050816` / `#ffffff`) y declara `color-scheme: dark`. Se elimina el bloque `.dark` con variables; el `@custom-variant dark` sigue igual, as? que todas las utilidades `dark:` existentes contin?an aplicando.
  - `app/layout.tsx`: `dark` fijo en el `className` del `<html>` (sin flash, sin script de init). Retirados `ThemeProvider`, `ThemeSync`, `ThemeToggle` y el `themeInitScript`. La barra superior conserva s?lo `LanguageToggle`.
  - `app/global-error.tsx`: su `<html>` propio (reemplaza el root layout) tambi?n lleva `dark`.
  - Eliminados `components/ThemeToggle.tsx`, `components/ThemeSync.tsx`, `components/ThemeProvider.tsx` y `components/useClientMounted.ts` (quedaba sin consumidores).
  - `components/ThemedExternalLink.tsx`: ya no lee `useTheme()`; el tema saliente es la prop `theme` (antes `fallbackTheme`). `Footer.tsx` y `SiteLinks.tsx` pasan `theme="light"`, igual que el valor efectivo anterior para los links a TalentX.
  - `lib/theme-sync.ts`: reducido al contrato saliente (`THEME_PARAM`, `ThemeMode`, `isThemeMode`, `appendThemeToUrl`). Fuera storage key, cookie, `syncThemeToUrl`, `syncThemeToCookie`, `getThemeFromSearch` y el init script.
  - `proxy.ts`: `applyThemeLocaleCookies` ? `applyLocaleCookie`; un `?theme=` entrante se ignora en vez de escribir cookie que nadie lee.
  - `package.json`: `next-themes` desinstalado (sin importadores).
- **Decisiones:** ResumeX es dark-only. Los links salientes a TalentX siguen llevando `theme=light&lang=en` porque ese sitio tiene su propio tema; el tema de ResumeX ya no es una preferencia de usuario que propagar.
- **Validaciones realizadas:** `npm run typecheck`, `npm run lint`, `npm test` (64) y `npx next build` en verde (`npm run build` falla antes de compilar por `DATABASE_URL` vac?o en local, limitaci?n ya registrada). Smoke con Playwright sobre 15 rutas (`/`, `/talent`, `/login`, `/register`, `/upgrade`, `/career/*`, `/talent/{mapper,assess,searches}`): `body` en `rgb(5, 8, 22)` en todas, cero superficies claras de m?s de 8000 px?, sin toggle en el header, consola sin errores ni avisos de hidrataci?n. `/?theme=light` ya no fuerza claro y no deja cookie `talentx-theme`.
- **Riesgos o bloqueos:** las clases claras (`bg-white`, `text-zinc-900`) siguen en el markup bajo sus contrapartes `dark:`. Volver a un tema claro es posible, pero ya no hay superficie que lo active.
- **Siguiente paso:** commit y deploy; revisar en prod que ninguna vista con datos reales (tracker con aplicaciones, mapper con resultados) muestre una tarjeta clara.

### 2026-08-05 17:25 ? URL oficial = resumex.talentxrecruiting.com

- **Objetivo:** fijar `https://resumex.talentxrecruiting.com` como origen oficial (no el alias `*.vercel.app`).
- **Estado:** completado en c?digo + env de Vercel; falta commit/deploy para que los redirects 308 y el bake de `NEXTAUTH_URL` lleguen a prod.
- **Cambios:**
  - `lib/constants.ts`: `RESUMEX_OFFICIAL_URL` + `RESUMEX_URL` (sin trailing slash).
  - `next.config.ts`: en production, si `NEXTAUTH_URL` falta/vac?o, cae al dominio oficial (ya no a `VERCEL_URL`); 308 de los hosts alias de Vercel ? dominio oficial.
  - metadata, Stripe, emails de register/digest usan `RESUMEX_URL`.
  - Vercel: `NEXTAUTH_URL` y `NEXT_PUBLIC_RESUMEX_URL` = `https://resumex.talentxrecruiting.com` en Production y Preview.
- **Validaciones:** `npm run typecheck`, `npm run lint`.
- **Siguiente paso:** commit + deploy; confirmar que Google OAuth tiene `https://resumex.talentxrecruiting.com/api/auth/callback/google` y que `resume-x-yixz.vercel.app` responde 308.

### 2026-08-05 18:15 — ResumeX pasa a paleta clara (navy sobre canvas gris)

- **Objetivo:** adoptar la paleta de un mockup entregado por el usuario: canvas gris frío, tarjetas blancas, acento navy.
- **Estado:** desplegado en producción (`b7ffc87` → `dpl_DxsnSUvBXxaaanFx1p57Ff7b5Dp4`, READY).
- **Paleta (muestreada del mockup píxel a píxel):** canvas `#f1f3f6` → `#e2e6ec` (el mockup traía `#d7d8dd` → `#bbbec5`; se aclaró por decisión del usuario para que las tarjetas blancas resalten), tinta `#1b1d22`, acento y botón primario `#1d3559`, cuerpo `#5f6368`, tarjetas `#ffffff`.
- **Cambios:**
  - `app/globals.css`: `:root` vuelve a claro (`color-scheme: light`), tokens `--canvas-top` / `--canvas-bottom` y gradiente fijo en `body`. Nueva escala `--color-brand-50` … `--color-brand-950` en `@theme`, con `brand-600 = #1d3559`.
  - `app/layout.tsx` y `app/global-error.tsx`: fuera el `dark` fijo del `<html>`.
  - 38 archivos de `app/` y `components/`: `indigo-*` → `brand-*` (318 usos). En `components/ResultCards.tsx` la prop `accent` pasa de `"indigo"` a `"brand"`.
  - Shells de página (`app/(marketing)`, `app/talent`, `career/{cv,analyzer,autoapply,jobsearcher}`, `talent/{mapper,assess,searches}`, `components/ErrorPageLayout.tsx`): sin fondo propio, para que se vea el canvas del `body`.
  - `components/AppNav.tsx`: el badge del logo pasa de `#0d1117` + cyan a `bg-brand-600` + blanco.
  - `app/icon.svg` y `app/opengraph-image.tsx`: favicon navy con X blanca; tarjeta OG sobre el canvas claro.
  - `lib/generate-report-pdf.ts` y los emails de `register` y `job-digest`: primario indigo → `#1d3559`.
  - Limpieza del tema oscuro: retiradas 1387 utilidades `dark:` inertes en 47 archivos, los contenedores de blobs que sólo existían para el tema oscuro (7 páginas de herramientas, quedaban con `hidden` permanente) y el `@custom-variant dark` de `globals.css`. No queda ninguna clase `dark:` ni ninguna referencia a `indigo` en `app/`, `components/` ni `lib/`.
- **Decisiones:** R-020. Un solo tema y es claro. Al no existir variante `dark` ni `@custom-variant`, `prefers-color-scheme` no puede repintar la app: para volver a un tema oscuro habría que reintroducir la variante a propósito.
- **Validaciones realizadas:** `npm run typecheck`, `npm run lint`, `npm test` (64), `npx next build` y `npm run test:e2e:talent-mapper` en verde, antes y después de la limpieza. Playwright sobre `/`, `/login`, `/register`, `/career/tracker`, `/career/analyzer`, `/talent`, `/talent/mapper` y `/opengraph-image`: `body` en `rgb(226, 230, 236)` con gradiente y consola sin errores. Comparación píxel a píxel antes/después de la limpieza: `/talent` idéntica (0 px), y las diferencias del resto se localizan en el badge del logo (cambio intencional) y en el indicador de dev de Next.
- **Riesgos o bloqueos:** la UI de la extensión Chrome (`chrome-extension/popup.html`) y la pantalla puente `app/extension-auth/page.tsx` siguen oscuras con cyan `#22d3ee`; son otra superficie y alinearlas exige publicar una versión de la extensión. Nota operativa: tras editar `globals.css`, Turbopack siguió sirviendo el CSS viejo hasta borrar `.next`.
- **Siguiente paso:** verificado en el dominio oficial: `body` en `rgb(226, 230, 236)` con el gradiente, acento en `rgb(29, 53, 89)`, sin clases `dark:` en el HTML servido, el alias `resume-x-yixz.vercel.app` resuelve al dominio oficial y cero errores de runtime en la última hora. Queda comprobar con datos reales `/career/tracker` con aplicaciones y `/talent/mapper` con resultados, más el preview de la tarjeta OG en LinkedIn.

### 2026-08-05 19:10 — Roadmap nuevo post-cierre de fases

- **Objetivo:** el roadmap de Fases 1–6 quedó completo y desplegado (`add4208`, Cursor); escribir el roadmap siguiente para que otro agente sepa qué tomar sin releer toda la bitácora.
- **Estado:** completado.
- **Cambios:**
  - `ROADMAP.md`: reescrito. Sección "El terreno, hoy" auditada contra el código real (no contra lo que decía el roadmap anterior): 11 archivos de test, todos de Talent Mapper/Assess — `format-resume.ts`, `merge-profile.ts`, `parse-profile.ts` sin cobertura; sin CI (no existe `.github/workflows/`); `grep -rn "aria-" app/talent` da cero resultados; `lib/i18n/resumex.ts` no cubre `/talent/*`; `chrome-extension/popup.html` y `app/extension-auth/page.tsx` siguen en dark navy/cyan pese a R-020; sin modelo `Organization` en `prisma/schema.prisma`.
  - Fases nuevas: **Fase 7** (red de seguridad — T-7.1 tests Career, T-7.2 E2E Career, T-7.3 CI, T-7.4 bordes), **Fase 8** (a11y + i18n de Talent — T-8.1 auditoría, T-8.2 fix, T-8.3 i18n), **Fase 9** (paridad visual extensión — T-9.1 `/extension-auth`, T-9.2 popup), **Fase 10** 🤔 (equipos/`Organization`, condicionada a demanda real), **Fase 11** ⏸️ (precio Talent, Ashby, marca — diferida, ya lo estaba).
  - Backlog transversal: B-2/B-3/B-8/B-9 absorbidos por tareas nuevas; **B-7 cerrado** (`aiInferred` ya está en `lib/types.ts:35,42`, no hacía falta trabajo nuevo); B-11 (observabilidad de errores en prod) y B-12 (límite de costo/uso de OpenAI) nuevos, ninguno bloqueante hoy.
  - `AGENT_HANDOFF.md`: Estado actual y este registro.
- **Decisiones:** el detalle tarea-por-tarea de las Fases 1–6 no se copió de nuevo a `ROADMAP.md` — vive completo en este archivo (arriba) y en el historial de git de `ROADMAP.md`. Repetirlo ahí habría diluido las fases nuevas, que son el trabajo real pendiente.
- **Validaciones realizadas:** lectura directa del código (no memoria del roadmap anterior) para cada afirmación del "terreno, hoy": conteo de archivos de test, `grep` de `aria-`, `$5`/`PLANS`, `criterionKind`/`aiInferred`, inspección de `prisma/schema.prisma`, `chrome-extension/popup.html`, `app/extension-auth/page.tsx`, `package.json` (scripts, sin workflow de CI referenciado).
- **Riesgos o bloqueos:** ninguno nuevo. Fase 10 y 11 quedan explícitamente sin tomar hasta que exista un trigger humano — no son trabajo listo para empezar.
- **Siguiente paso:** tomar T-7.1 o T-7.2 (sin precondiciones, ver `ROADMAP.md`). Si se prefiere cerrar deuda visible al usuario primero, T-9.1 (`/extension-auth`) es la de menor esfuerzo de toda la lista.

### 2026-08-05 19:35 — Audit-fix sprint (Claude audit recovery)

- **Objetivo:** aplicar los hallazgos verificados del audit multi-dimensión de Claude (5/7 dimensiones completadas) antes de que se agotara el presupuesto de tokens.
- **Estado:** parcial — bugs de producto/seguridad de mayor ROI cerrados; quedan data-platform, consistency-debt, email unique formal, y piezas grandes (retirar jobsearcher, persistir Assess, shortlist status).
- **Cambios clave:**
  - `lib/talent-mapper/evidence.ts`: eliminada la rama always-true `adjacentTerms.includes(adj)` que hacía match de todos los criterios desde un solo término adyacente. Test de regresión en `evidence.test.ts`.
  - `aggregate-authors.ts`: `authorshipCredit` pondera first/last y excluye middle profundos en papers >8 autores. Test de consortium.
  - `scoring.test.ts`: pines exactos de pesos (strong_adjacent=28, possible=14, recency=15) — R-012 real.
  - CSV export lee `candidate.recruiterNotes`; `persistSnapshot` acepta `uiStep` explícito; localStorage ya no guarda candidatos/notas; sign-out limpia keys Talent.
  - Seguridad: cron falla cerrado sin `CRON_SECRET`; analytics con zod + allowlist; rate-limit en `/api/extension/token`; Google sign-in no adopta cuentas credentials no verificadas (anti pre-registration takeover).
  - `isPro` ahora se lee: modelo `UsageEvent` + entitlements en analyzer (1/semana free) y cover-letter (1/día free). Migración `20260806010000_usage_events`.
  - Register honra `callbackUrl`; tracker muestra error real; upgrade muestra errores de checkout; `/api/stripe/health`; OpenAlex deadline 55s + stop en rate-limit con parciales; max 12 queries; CI `.github/workflows/ci.yml`; `robots.ts`/`sitemap.ts`; TrackedLink en CTA Talent del home.
- **Validaciones:** `npm test` 73 passed; `npm run lint` clean. `prisma generate` puede fallar localmente si el DLL está locked por un proceso; la migración corre en el próximo `npm run build` / deploy.
- **Siguiente paso:** desplegar (aplica UsageEvent), verificar Stripe env vars en Vercel, luego T-7.1 o retirar `/career/jobsearcher`.

### 2026-08-05 19:50 — Audit-fix shipped to production

- **Objetivo:** commit + deploy del audit-fix; recuperar migración UsageEvent fallida.
- **Estado:** completado en prod. Deploy `dpl_7NUCcA2dvYX23KvVASvAzdT5pfBM` (`065e2e1`) READY.
- **Commits:** `8a694a9` (audit fixes), `b8a481c`/`994735d`/`065e2e1` (migración BOM + recovery P3009).
- **Ops:** `CRON_SECRET` añadido en Vercel Production. **Stripe sigue sin vars** (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID` ausentes en `vercel env ls`) — checkout Pro no puede funcionar hasta configurarlas.
- **Siguiente paso:** pegar las tres keys de Stripe en Vercel Production y verificar `GET /api/stripe/health` en true; smoke humano del analyzer free-tier 402.

### 2026-08-05 19:55 — T-7.1 characterization tests

- **Objetivo:** cerrar T-7.1 (red de seguridad Career) sin tocar producto.
- **Estado:** completado. 21 tests nuevos; suite total 94 passed.
- **Cambios clave:** `lib/__tests__/format-resume.test.ts`, `merge-profile.test.ts`, `parse-profile.test.ts`; `eslint.config.mjs` ignora `scripts/**/*.cjs` (require necesario en migrate recovery).
- **Validaciones:** `npm test` 94 passed; `npm run lint` clean.
- **Siguiente paso:** humano pega Stripe keys en Vercel y verifica `/api/stripe/health`; o tomar T-7.2 (E2E Career) / T-7.4 (bordes).

### 2026-08-05 20:15 — T-7.2 Career E2E + demo fallbacks

- **Objetivo:** cerrar T-7.2 (E2E Career) con camino demo fiable bajo free-tier.
- **Estado:** completado. `npm run test:e2e:career` ok contra `localhost:3000`.
- **Cambios clave:**
  - `scripts/e2e-career.mjs` + `npm run test:e2e:career`: login → analyzer Try demo → tracker add → cover letter Try demo.
  - `lib/demo-career.ts`: análisis y cover letter determinísticos cuando el payload es exactamente `DEMO_RESUME`/`DEMO_JOB_DESCRIPTION` (sin OpenAI ni burn de entitlements).
  - Try demo en `/career/cover-letter`; docs en `README.md` / `AGENTS.md` / `ROADMAP.md` (B-3 cerrado).
- **Validaciones:** `npm test`; `npm run lint`; `npm run test:e2e:career` → `ok: true`.
- **Siguiente paso:** humano Stripe keys; o T-7.4 (bordes) / T-9.1 (`/extension-auth`) / retirar `jobsearcher`.

### 2026-08-05 22:10 — PubMed as second Talent Mapper source

- **Objetivo:** añadir PubMed junto a OpenAlex en Talent Mapper sin reemplazar OpenAlex ni reconstruir el producto.
- **Estado:** completado localmente (sin commit/push/deploy).
- **Cambios:**
  - Provider PubMed (ESearch → RRF PMID merge → EFetch XML → normalize) en `lib/talent-mapper/providers/pubmed/`.
  - Merge canónico + reconciliación de autores conservadora; evidence/scoring conscientes de MeSH, publication type y retractados.
  - Orquestación dual-source en `search-orchestrator.ts` + route `/api/talent-mapper/search` backward-compatible.
  - UI: selector de fuentes, queries OpenAlex/PubMed separadas, diagnósticos, badges, disclaimers NCBI.
  - Demo PubMed simulado (`data/talent-mapper-pubmed-demo.json`) + docs `docs/PUBMED_INTEGRATION.md`.
  - Env: `NCBI_EMAIL`, `NCBI_API_KEY`, `NCBI_TOOL`, `PUBMED_*` en `.env.local.example`.
  - Dependencia: `fast-xml-parser`.
  - R-013 actualizada: PubMed es fuente biomédica complementaria permitida.
- **Validaciones:** `npm test` (116 passed, 1 skipped live), `npm run typecheck`, `npm run lint`, `npm run build` OK.
- **Siguiente paso:** QA manual del demo en `/talent/mapper`; añadir `NCBI_EMAIL` para live; commit cuando el humano lo pida.

### 2026-08-05 23:10 — ATS integrations layer (Recruitee / Zoho / Ashby)

- **Objetivo:** capa ATS provider-neutral para ResumeX Talent con adapters Recruitee, Zoho Recruit (OAuth) y Ashby (Demo + live).
- **Estado:** SUPERADA por entradas 2026-08-06 (commit `cb4fd5e`, deploy READY, QA Demo OK).
- **Cambios:**
  - `lib/ats/**`: types, capabilities, encryption (AES-256-GCM), HTTP allowlist, errors, evidence builder, duplicates, idempotency, transfer saga, registry, webhooks.
  - Providers: `recruitee`, `zoho` (OAuth + multi-DC + refresh), `ashby` (+ `DemoAshbyAdapter`).
  - Prisma: `AtsConnection`, `AtsExternalMapping`, `AtsTransfer`, `AtsWebhookEvent`, `AtsOauthState` + migration `20260806020000_ats_integrations`.
  - API: `/api/talent/integrations/ats/**` (connect, test, jobs, search, preview, transfers, webhooks).
  - UI: `/talent/integrations`, `SendToAtsModal` desde Talent Mapper candidate detail; nav link en `lib/products.ts`.
  - Docs: `docs/ATS_INTEGRATIONS.md`, `docs/integrations/{RECRUITEE,ZOHO_RECRUIT,ASHBY}.md`, `docs/ATS_MANUAL_QA.md`; README + `.env.local.example`.
  - Tests: `lib/ats/__tests__/*` (37); full suite 152; `vitest.config.mts`.
- **Decisiones:** ownership por `User` (sin Organization); APIs nuevas bajo `/api/talent/integrations/ats` (no rompe extensión); Zoho webhooks no reclamados.
- **Validaciones:** lint (0 errors), typecheck, `npm test` 152, `npm run build` OK con rutas ATS en el tree.
- **Siguiente paso:** SUPERADA — ver 2026-08-06.

### 2026-08-06 03:15 — ATS commit + prod deploy vía GitHub

- **Objetivo:** alinear Git con el deploy ATS.
- **Estado:** completado.
- **Cambios:** commit `cb4fd5e` en `main`; deploy Vercel `dpl_8wBvuVtn3ZDBF6SNNaHqWxRgTgit` READY; `ATS_CREDENTIAL_ENCRYPTION_KEY` en Vercel.
- **Validaciones:** prod sirve `/talent/integrations`.
- **Siguiente paso:** QA Demo Mode; arreglar CI (`npm ci` fallaba).

### 2026-08-06 10:00 — QA Demo Ashby + fix CI lockfile

- **Objetivo:** cerrar smoke Demo Mode en prod y desbloquear T-7.3 (CI).
- **Estado:** completado.
- **Cambios:**
  - Prod QA (`tm_e2e_demo`): Demo Mode → Mapper demo → Jordan Exemplar → Send to ATS → preview → transfer **success**; Transfer history `Jordan Exemplar` / `success`.
  - CI: pin `@emnapi` 1.11.3; push `9301330`; Actions run `31108825300` **success** (npm ci, prisma generate, typecheck, lint, tests).
  - UX: autocomplete hardening en formularios Recruitee/Ashby.
- **Validaciones:** Demo E2E prod; CI verde.
- **Siguiente paso:** Zoho env opcional; T-7.4 o Fase 8.

### 2026-08-06 17:30 — Auditoría de arquitectura + Fase 12 (T-12.1, T-12.2)

- **Objetivo:** auditar la arquitectura contra el código real (no contra la documentación), dejar un plan tomable, y arrancar por las tareas de mayor valor por unidad de esfuerzo.
- **Estado:** parcial. Auditoría completa; ola 0 de la Fase 12 con dos de tres tareas cerradas. **Rama `cursor/architecture-debt-phase-12-7496`, sin mergear.**
- **Método de la auditoría:** lectura directa de `prisma/schema.prisma` completo, los 50 `route.ts` bajo `app/api/**`, `lib/{analyze,criteria-evidence,types,products,entitlements,require-auth,rate-limit}.ts`, `lib/talent-mapper/scoring.ts`, `lib/ats/http-response.ts`, y grep de imports en `chrome-extension/`. Cada hallazgo tiene `archivo:línea` reproducible.
- **Cambios:**
  - `docs/ARCHITECTURE_DEBT.md`: **nuevo.** El plan largo — qué no tocar, la restricción del contrato de la extensión, diagnóstico D-1…D-10, Fase 12 en cuatro olas (T-12.1…T-12.11) con pasos y definición de terminado, anti-tareas y orden sugerido.
  - `eslint.config.mjs`: T-12.1. Dos zonas (Career / Talent) restringidas en ambas direcciones con `no-restricted-imports`; el mensaje cita R-005/R-023 y apunta a R-009.
  - `prisma/schema.prisma` + `prisma/migrations/20260806130000_userid_indexes/`: T-12.2. `@@index([userId, createdAt])` en `Application` y `Answer`.
  - `app/api/profile/route.ts`: T-12.2. `parseProfileJson` devuelve `null` ante JSON corrupto en vez de tirar 500.
  - `ROADMAP.md`: Fase 12 completa como tareas tomables; B-11 absorbido por T-12.3, B-12 por T-12.4, B-10 pasa de ⏸️ a ⛔ bloqueada por T-12.10.
  - `AGENT_HANDOFF.md`: Estado (v1.7), decisiones R-021…R-025, § Destino marcado superado en su bloque `lib/`, lista viva de próximas tareas, y este registro.
- **Decisiones:** R-021 (envelope plano, `error` string), R-022 (cuota durable sobre `UsageEvent`), R-023 (frontera por lint), R-024 (sin casts en el borde HTTP), R-025 (retirado el destino `lib/career`/`lib/talent`).
- **Hallazgo que cambia el orden de trabajo:** la extensión desplegada hace `data.error ?? "Login failed."` sobre `textContent` (`chrome-extension/popup.js:275`), así que **la capa ATS tiene la forma de error equivocada para este sistema** pese a ser la más nueva. La unificación de T-12.5 va de ATS hacia Career. Un refactor que asuma lo contrario rompe el login de la extensión en producción.
- **Corrección sobre el diseño inicial de R-023:** la primera versión hablaba de allowlistear `lib/ats/from-researcher.ts` como "único puente". Es innecesario: `lib/ats` y `lib/talent-mapper` son **ambos** Talent, así que ese import es intra-producto y legal por construcción. La regla final no tiene excepciones.
- **Lo que está bien y no hay que tocar** (anotado en `docs/ARCHITECTURE_DEBT.md` para que un refactor futuro no lo "mejore"): el split de prompts de `lib/analyze.ts` (R-005 bien ejecutado), la verificación server-side de citas en `lib/criteria-evidence.ts:64-71` (R-007 no depende del modelo), el scoring determinista con el LLM afuera, y la capa ATS como adapter+registry+capabilities.
- **Validaciones realizadas:** `npm run typecheck` limpio; `npm run lint` 0 errores (queda 1 warning preexistente, `toOpenAlexAuthorUrl` sin usar en `aggregate-authors.ts:532`); `npm test` **152 passed / 22 files**; `prisma validate` OK; `prisma generate` OK; migración sin BOM (verificado con `od`, arranca en `2d 2d 20`). T-12.1 verificada en ambas direcciones: lint limpio sin tocar imports existentes, y una violación deliberada Career→Talent y Talent→Career falla con el mensaje de R-005.
- **Riesgos o bloqueos:** D-2 (gasto sin techo) sigue vivo en producción hasta T-12.4. La rama corrige el 500 de `profileJson` pero **no** se pudo probar contra Postgres real en este entorno (sin base de datos): la ruta de valor corrupto queda como comprobación de deploy. `npm run build` completo no se pudo correr localmente por `DATABASE_URL` (limitación ya registrada); se validó con `prisma validate`/`generate` + typecheck. El wiki de Obsidian **no** está accesible desde el entorno del agente, así que la copia canónica del plan es `docs/ARCHITECTURE_DEBT.md` y el wiki queda pendiente de re-ingest.
- **Hallazgo aparte — CI no verifica PRs.** El "CI verde" registrado el 2026-08-06 (`31108825300`) es un run de **push a `main`**, no de `pull_request`. El repo tiene **cero runs con `event=pull_request` en toda su historia**, y el PR #2 de esta fase tampoco disparó el workflow (sus únicos checks son los de Vercel, que no corre typecheck ni lint ni tests). El `on:` del workflow está correcto y el workflow está `active`; la causa más probable es que la rama y el PR los creó un token de GitHub App, y GitHub no dispara workflows con eventos de esa credencial. **T-7.3 sigue sin cumplir su definición de terminado** y quedó anotado en `ROADMAP.md` con la precondición nueva. Mientras siga así, la verificación de cada rama depende de correr los comandos a mano.
- **Siguiente paso:** **T-12.4** (cuota durable sobre `UsageEvent`, cierra B-12). Verificable: agotar la cuota de `talent-assess` devuelve 429/402 con `code`, y el segundo intento en la misma ventana no llega a OpenAI. ⚠️ Requiere fijar los límites por plan — son números de producto, no técnicos: proponer valores y confirmarlos antes de desplegar.

