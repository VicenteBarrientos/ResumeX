# Agent Handoff ? ResumeX

> Bit?cora compartida para que cualquier agente pueda conocer el estado del trabajo, las decisiones vigentes, la arquitectura de los dos productos y el siguiente paso recomendado.
>
> Este archivo es la **fuente de verdad del d?a a d?a**. El wiki de Obsidian (`ObsidianVault/ResumeX/`) guarda el conocimiento estable; si los dos difieren, manda este archivo.

## Estado actual

- **?ltima actualizaci?n:** 2026-08-05 16:30 -04:00 ? America/Santiago
- **Versi?n del handoff:** 1.2
- **Estado:** **Roadmap de fases cerrado en alcance agente.** Fases 1?5 hechas; Fase 6 m?nima (analytics). Persistencia Talent en Prisma; `/talent/searches`; screeningQuestions; Ashby/equipos/marca diferidos con decisi?n escrita.
- **Pr?ximo hito:** backlog restante (B-3 E2E Career, B-8 i18n Talent, B-9 a11y) o demanda real (Ashby, equipos, precio Talent).
- **Bloqueos conocidos:** ninguno cr?tico. Diferidos conscientes: T-4.7 Ashby, T-6.2/T-6.3, Organization.
- **Repositorio can?nico:** `C:\Users\hp\Projects\ResumeX` ? rama observada `main`, remote `github.com/VicenteBarrientos/ResumeX.git`.
- **Copia archivada:** `C:\Users\hp\CS50\ResumeX` ? **no usar**. Ver R-001 y la bit?cora del 2026-08-05.
- **Prod:** oficial `https://resumex.talentxrecruiting.com` (alias `resume-x-yixz.vercel.app` ? 308). Deploy `dpl_8FqD9yX7dkSLje3cRe3s68iEAy8B` (`d5f6727`) READY.
- **Wiki:** `C:\Users\hp\ObsidianVault\ResumeX\`

### Trabajo en vuelo

C?digo listo (dark-only + URL oficial) sin commit/deploy. Tras deploy: verificar 308 desde `resume-x-yixz.vercel.app` y login OAuth en el dominio oficial.

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
| R-013 | OpenAlex es la fuente primaria. Una segunda fuente s?lo despu?s de calibrar precisi?n contra roles reales. | Seis integraciones superficiales valen menos que una fuente bien calibrada. Prioridad si se agrega una segunda: NIH RePORTER (financiamiento activo) o Europe PMC. | Vigente |
| R-014 | Precisi?n sobre recall en resultados de sourcing. Ante la duda, mostrar menos candidatos y declarar lo que no se sabe. | Un experto de dominio detecta un mal candidato al instante y cada falso positivo cuesta credibilidad. Los campos `unknowns` y `possibleConcerns` existen para eso. | Vigente |
| R-015 | Nunca secretos en el repo, el handoff ni el wiki: s?lo nombres de variables y su ubicaci?n. Las keys de OpenAI y OpenAlex son server-side exclusivamente. | ? | Vigente |

### Superficie y navegaci?n (Fase 1)

| ID | Decisi?n | Motivo | Estado |
|---|---|---|---|
| R-016 | **La landing `/` lidera con ResumeX Career.** Talent no compite por el hero: entra por una banda dedicada bajo la grilla de features que lleva a `/talent`, su propia landing p?blica. | Decisi?n humana del 2026-08-05. Bifurcar en dos puertas es m?s honesto pero mete un click antes de cualquier pitch, y ResumeX no tiene reconocimiento de marca que sostenga ese costo. Career adem?s concentra hoy la superficie y el funnel. Revisar si Talent empieza a traer clientes empresariales. | Vigente |
| R-017 | Las p?ginas se namespacean por producto; **las APIs siguen planas** (`/api/talent-mapper/*`, `/api/tracker`, ?). | La extensi?n Chrome ya desplegada y los emails salientes llevan URLs de API absolutas. Mover las rutas sin versionado rompe clientes que no controlamos. Se har? cuando exista versionado de API. | Vigente |
| R-018 | Toda ruta de p?gina que se mueva o renombre deja un 308 permanente en `PRODUCT_SEGMENT_REDIRECTS` (`next.config.ts`). `redirects` corre **antes** de `proxy.ts`, as? que el `callbackUrl` de login queda apuntando a la ruta nueva. | Bookmarks, URLs indexadas, builds viejos de la extensi?n y links de email siguen funcionando sin tocar al cliente. | Vigente |
| R-019 | `lib/products.ts` es la fuente ?nica de nombres, `basePath`, `home` y navegaci?n de cada producto. Ninguna superficie hardcodea `"ResumeX Talent"` ni `/talent/mapper`. | Es lo que hace cumplible R-003: si el nombre vive en un solo archivo, ninguna superficie puede inventar su variante. | Vigente |

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

### Destino

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

### 2026-08-05 16:30 ? ResumeX queda dark-only

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
