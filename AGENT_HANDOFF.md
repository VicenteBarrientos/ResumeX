# Agent Handoff — ResumeX

> Bitácora compartida para que cualquier agente pueda conocer el estado del trabajo, las decisiones vigentes, la arquitectura de los dos productos y el siguiente paso recomendado.
>
> Este archivo es la **fuente de verdad del día a día**. El wiki de Obsidian (`ObsidianVault/ResumeX/`) guarda el conocimiento estable; si los dos difieren, manda este archivo.

## Estado actual

- **Última actualización:** 2026-08-05 14:48 -04:00 — America/Santiago
- **Versión del handoff:** 1.1
- **Estado:** **Fase 2 en curso.** T-2.1…T-2.4 completas. El motor ya expone `analyzeForCareer()` y `assessForTalent()` con prompts por audiencia; `analyzeResume` queda como puente legacy para `/api/analyze` hasta T-2.5.
- **Próximo hito:** T-2.5 — migrar consumidores de `AnalysisResult` y decidir el dueño del PDF (Career vs Talent).
- **Bloqueos conocidos:** T-2.7 (¿superficie `/talent/assess`?) sigue pendiente de decisión humana.
- **Repositorio canónico:** `C:\Users\hp\Projects\ResumeX` — rama observada `main`, remote `github.com/VicenteBarrientos/ResumeX.git`.
- **Copia archivada:** `C:\Users\hp\CS50\ResumeX` — **no usar**. Ver R-001 y la bitácora del 2026-08-05.
- **Prod:** https://resume-x-yixz.vercel.app · https://resumex.talentxrecruiting.com
- **Wiki:** `C:\Users\hp\ObsidianVault\ResumeX\`

### Trabajo en vuelo

Ninguno. T-2.3 y T-2.4 verificadas. El siguiente trabajo tomable es T-2.5.

## Protocolo para agentes

1. Leer este archivo antes de trabajar.
2. Leer `AGENTS.md` (reglas de código) y `README.md` (setup y env). Para tomar una tarea concreta, [`ROADMAP.md`](./ROADMAP.md): fases desglosadas en tareas con precondiciones y definición de terminado. Para contexto de producto, el wiki: `ObsidianVault/ResumeX/ResumeX.md`.
3. Antes de modificar el producto, verificar si existe una decisión previa en **Decisiones vigentes**. Si una decisión estorba, discutirla — no ignorarla en silencio.
4. Al terminar una intervención:
   - actualizar **Estado actual** si cambió el hito, estado o bloqueo;
   - registrar archivos creados o modificados;
   - añadir una entrada al final de **Bitácora de cambios**;
   - dejar un siguiente paso concreto y comprobable.
5. No borrar entradas históricas. Si una decisión cambia, marcar la anterior como `SUPERADA` y enlazar la nueva.
6. Nunca escribir secretos aquí ni en el wiki: solo nombres de variables y dónde viven.
7. Antes de escribir código Next.js, leer la guía pertinente en `node_modules/next/dist/docs/`. Esta versión tiene breaking changes respecto al conocimiento previo de cualquier modelo.

### Plantilla de entrada

```markdown
### YYYY-MM-DD HH:mm — agente o tarea

- Objetivo:
- Estado: completado | parcial | bloqueado
- Cambios:
  - `ruta/al/archivo`: descripción.
- Decisiones:
- Validaciones realizadas:
- Riesgos o bloqueos:
- Siguiente paso:
```

## Decisiones vigentes

### Repositorio e identidad de producto

| ID | Decisión | Motivo | Estado |
|---|---|---|---|
| R-001 | `C:\Users\hp\Projects\ResumeX` es el único repo canónico. `C:\Users\hp\CS50\ResumeX` queda archivado y no debe commitearse ni pushearse. | Ambas copias apuntaban al mismo remote y habían divergido; la copia CS50 usaba Clerk sin base de datos y tenía una reimplementación parcial del Talent Mapper. Dos copias sobre un mismo remote garantizan pérdida de trabajo. | Vigente |
| R-002 | Un solo repositorio, un solo deployment y una sola base de datos para los dos productos. | Separar la infraestructura hoy duplicaría auth, pagos, diseño y despliegue sin beneficio proporcional. | Vigente |
| R-003 | Los productos se llaman exactamente **ResumeX Career** (candidatos y búsqueda de trabajo) y **ResumeX Talent** (recruiters y equipos de contratación). | Nombres fijos en UI, copy, metadata y documentación. Evita que cada superficie invente su propia variante. | Vigente |
| R-004 | Talent Mapper es una **feature dentro de ResumeX Talent**, no una marca de producto. | Su nombre compite con el del producto y confunde el pitch comercial. | Vigente |

### Arquitectura compartida

| ID | Decisión | Motivo | Estado |
|---|---|---|---|
| R-005 | Se comparten los **verbos** (motores), no los **sustantivos** (sujetos). Career opera sobre un CV auto-reportado; Talent sobre un investigador inferido desde publicaciones. No unificar ambos en un tipo `Candidate`. | Un tipo común obliga a campos opcionales que sólo aplican a la mitad de los casos y contamina las dos superficies. | Vigente |
| R-006 | Un único root layout con los providers. `/career` y `/talent` son segmentos normales con su propio `layout.tsx`. No usar múltiples root layouts. | Los root layouts múltiples fuerzan recarga completa al cruzar entre productos y obligan a duplicar providers. Ver `node_modules/next/dist/docs/.../route-groups.md`. | Vigente |
| R-007 | Toda evidencia mostrada al usuario lleva procedencia: extracto real, fuente, nivel de confianza y marca explícita de si la infirió la IA. Nunca una frase redactada por el modelo presentada como evidencia. | Es la diferencia entre una cita verificable y una alucinación con formato de cita. El modelo de `lib/talent-mapper/` ya lo hace bien y es el estándar a replicar. | Vigente |
| R-008 | `AnalysisResult` se separa en dos salidas sobre el mismo motor: una de mejora (Career) y una de decisión (Talent). | Hoy mezcla campos de candidato (`gaps`, `suggestions`) con campos de reclutador (`recommendedNextStep`, `phoneScreenQuestions`, `clientFacingBullets`, `sendoutBlurb`). Un tipo sirviendo a dos usuarios es el problema que la separación viene a resolver. | Vigente |
| R-009 | Las abstracciones compartidas se extraen al **segundo uso real**, no antes. | Diseñar el kernel común con un solo consumidor es adivinar. Primero dos usos funcionando, después la abstracción. | Vigente |

### Datos, plataforma y calidad

| ID | Decisión | Motivo | Estado |
|---|---|---|---|
| R-010 | Prisma es la capa de datos. `localStorage` sólo como caché de UI y como contrato con la extensión Chrome, nunca como almacén de verdad. | Los datos del recruiter (shortlists, notas, búsquedas) deben sobrevivir al navegador y ser compartibles. | Vigente |
| R-011 | La convención de Next 16 es `proxy.ts`, no `middleware.ts`. Ya migrado; no reintroducir el nombre viejo. | `middleware` está deprecado y renombrado en esta versión. Codemod: `npx @next/codemod@latest middleware-to-proxy .` | Vigente |
| R-012 | Antes de modificar `scoring.ts` o `aggregate-authors.ts` debe existir cobertura de tests que fije el comportamiento actual. | Es la lógica que define la calidad del producto y la que regresa en silencio: no rompe el build, sólo empeora los resultados. | Vigente |
| R-013 | OpenAlex es la fuente primaria. Una segunda fuente sólo después de calibrar precisión contra roles reales. | Seis integraciones superficiales valen menos que una fuente bien calibrada. Prioridad si se agrega una segunda: NIH RePORTER (financiamiento activo) o Europe PMC. | Vigente |
| R-014 | Precisión sobre recall en resultados de sourcing. Ante la duda, mostrar menos candidatos y declarar lo que no se sabe. | Un experto de dominio detecta un mal candidato al instante y cada falso positivo cuesta credibilidad. Los campos `unknowns` y `possibleConcerns` existen para eso. | Vigente |
| R-015 | Nunca secretos en el repo, el handoff ni el wiki: sólo nombres de variables y su ubicación. Las keys de OpenAI y OpenAlex son server-side exclusivamente. | — | Vigente |

### Superficie y navegación (Fase 1)

| ID | Decisión | Motivo | Estado |
|---|---|---|---|
| R-016 | **La landing `/` lidera con ResumeX Career.** Talent no compite por el hero: entra por una banda dedicada bajo la grilla de features que lleva a `/talent`, su propia landing pública. | Decisión humana del 2026-08-05. Bifurcar en dos puertas es más honesto pero mete un click antes de cualquier pitch, y ResumeX no tiene reconocimiento de marca que sostenga ese costo. Career además concentra hoy la superficie y el funnel. Revisar si Talent empieza a traer clientes empresariales. | Vigente |
| R-017 | Las páginas se namespacean por producto; **las APIs siguen planas** (`/api/talent-mapper/*`, `/api/tracker`, …). | La extensión Chrome ya desplegada y los emails salientes llevan URLs de API absolutas. Mover las rutas sin versionado rompe clientes que no controlamos. Se hará cuando exista versionado de API. | Vigente |
| R-018 | Toda ruta de página que se mueva o renombre deja un 308 permanente en `PRODUCT_SEGMENT_REDIRECTS` (`next.config.ts`). `redirects` corre **antes** de `proxy.ts`, así que el `callbackUrl` de login queda apuntando a la ruta nueva. | Bookmarks, URLs indexadas, builds viejos de la extensión y links de email siguen funcionando sin tocar al cliente. | Vigente |
| R-019 | `lib/products.ts` es la fuente única de nombres, `basePath`, `home` y navegación de cada producto. Ninguna superficie hardcodea `"ResumeX Talent"` ni `/talent/mapper`. | Es lo que hace cumplible R-003: si el nombre vive en un solo archivo, ninguna superficie puede inventar su variante. | Vigente |

## Arquitectura de producto

Un motor, dos productos, dos usuarios distintos:

```
ResumeX Career   CV → Job    → ¿cómo consigo esta entrevista?
ResumeX Talent   Job → Persona → ¿a quién contacto y por qué?
```

### Superficie actual (post Fase 1)

| Producto | Páginas | APIs (siguen planas, R-017) |
|---|---|---|
| **Career** | `/career` (→ home), `/career/cv`, `/career/analyzer`, `/career/cover-letter`, `/career/jobs`, `/career/jobsearcher`, `/career/tracker{,/add,/profile,/[id]}`, `/career/autoapply`, `/career/onboarding` | `analyze`, `format`, `cover-letter`, `extract-job`, `jobs`, `match-score`, `profile`, `profile/resume`, `tracker`, `tracker/[id]`, `answers`, `answers/[id]`, `autoapply/*`, `extension/*`, `cron/job-digest` |
| **Talent** | `/talent` (landing pública), `/talent/mapper` | `talent-mapper/{search, extract-criteria, outreach, status}` |
| **Compartido** | `/` (landing Career, R-016), `/login`, `/register`, `/upgrade`, `/extension-auth` | `auth/*`, `stripe/*` |

Career tiene diez superficies y Talent dos. El desbalance es real y está bien: Talent es el producto nuevo y más caro por usuario.

Rutas planas viejas → 308 permanente al segmento correspondiente (R-018). `/formatter`, que ya era un alias, ahora apunta a `/career/cv` en vez de a `/`.

Protegido por `proxy.ts`: `/career`, `/talent/mapper`, `/upgrade`, `/extension-auth`. Público: `/`, `/talent`, `/login`, `/register`.

### Destino

```
app/
  layout.tsx                  ← único root: providers, theme, locale, auth
  (marketing)/
    page.tsx                  ← landing en "/"
  career/
    layout.tsx                ← navegación e identidad de ResumeX Career
    cv/  analyzer/  cover-letter/  jobs/  tracker/  autoapply/
  talent/
    layout.tsx                ← navegación e identidad de ResumeX Talent
    mapper/  candidates/  shortlists/
  api/
    career/  talent/  (auth, stripe quedan en la raíz de api/)

lib/
  evidence/     criterio, match, confianza, scoring   ← kernel (extraer en Fase 3)
  roles/        job description → criterios           ← kernel (extraer en Fase 3)
  ai/  documents/  i18n/
  career/       analyze, format-resume, job-*, autoapply
  talent/       (el actual talent-mapper)
```

Regla de frontera: si un componente lo importan los dos `layout.tsx` de producto, es compartido. Si sólo uno, pertenece a ese producto.

## Plan de separación

> Resumen de las fases. El desglose en tareas tomables — precondiciones, pasos, definición de terminado, riesgos y anti-tareas — está en [`ROADMAP.md`](./ROADMAP.md).

**Fase 1 — Rutas y marca. ✅ Completada el 2026-08-05.** Segmentos `/career` y `/talent` con `layout.tsx` propio y navegación separada. Redirects permanentes desde las rutas planas. Nombres R-003 en metadata, nav y copy. `lib/` intacto salvo el `lib/products.ts` nuevo. Pendiente respecto del destino: `app/api/career|talent` (diferido por R-017) y `talent/candidates|shortlists` (llegan en la Fase 4).

**Fase 2 — Salidas separadas.** Partir `AnalysisResult` según R-008. Career recibe la salida de mejora; Talent la de decisión. Mismo motor debajo.

**Fase 3 — Kernel compartido.** Recién aquí subir `lib/evidence/` y `lib/roles/`, con los dos consumidores ya funcionando (R-009). Migrar la evidencia de Career al modelo con procedencia de R-007.

**Fase 4 — Talent como herramienta de trabajo.** Persistencia Prisma de búsquedas, shortlists, notas y estados. Export e integración Ashby.

**Fase 5 — Consolidación de repos.** Absorber `resumex-sourcing-copilot` una vez que exista la capa de datos. Archivar `resumex-tracker`. Definir si la extensión vive aquí o en `job-applier`.

## Riesgos abiertos

| Riesgo | Detalle | Mitigación |
|---|---|---|
| Copias divergentes | Dos working copies compartían remote y se perdió trabajo en paralelo. | R-001. Verificar `git remote -v` y la ruta antes de trabajar. |
| Desambiguación de autores | OpenAlex fusiona y parte identidades, sobre todo con nombres chinos y latinos. Aparecerá en cualquier demo. | Mostrar la duda explícitamente en vez de ocultarla. ORCID ayuda pero su cobertura es parcial. |
| Regresión silenciosa de scoring | Cambiar pesos o agregación no rompe el build, sólo empeora los resultados. | R-012. |
| Marca | "ResumeX" es vocabulario de candidato; un recruiter no compra una herramienta nombrada por el documento que recibe. | Aceptado por ahora. Revisar si Talent gana clientes empresariales. |
| Deuda de auth | La copia archivada usaba Clerk; el canónico usa NextAuth. No mezclar patrones al portar ideas desde la rama archivada. | — |

## Próximas tareas recomendadas

1. T-2.5: migrar consumidores fuera de `AnalysisResult` y decidir el dueño del PDF (recomendación: Career — el botón vive en el analyzer del candidato).
2. T-2.6: retirar el tipo deprecado cuando no queden consumidores.
3. T-2.7 🤔: decidir si Talent gana `/talent/assess` (recomendación del roadmap: A).
4. Escribir tests de caracterización sobre `scoring.ts` y `aggregate-authors.ts` antes de tocarlos (R-012).
5. Centralizar el precio de Pro desde Stripe. La inconsistencia visible quedó alineada temporalmente en **$5/mo**, pero sigue hardcodeado en más de un lugar.
6. Medir conversión de la banda de `/` hacia `/talent` (R-016 se revisa con datos).

## Ideas rescatadas de la copia archivada

La rama `archive/cs50-clerk-2026-08-05` (en la copia CS50) contenía un rediseño de tipos del Talent Mapper que nunca se implementó. El canónico ya cubre lo sustancial —`unknowns`, `possibleConcerns`, manejo de retractions con aviso previo al outreach, dedupe de works y de evidencia—. Sólo tres ideas no existen acá y valen la pena:

| Idea | Qué aportaría |
|---|---|
| `suggestedScreeningQuestions` | Preguntas de screening por candidato, derivadas de sus gaps y unknowns. Convierte el brief en algo accionable en la primera llamada. |
| `criterionKind` | Tipar la categoría del criterio (técnica, organismo, área, geografía) en vez de tratarlos como strings equivalentes. Permite pesos y copy por tipo. |
| `aiInferred` / `aiSummarized` | Marcar explícitamente qué infirió la IA y qué dice el texto literal, a nivel de match y de resumen. Refuerza R-007 y es lo que hace auditable el resultado ante un experto. |

No hay código que portar: eran declaraciones de tipo sin implementación. Tratarlas como backlog, no como migración.

## Bitácora de cambios

### 2026-08-05 13:46 — consolidación de repos y creación del handoff

- **Objetivo:** resolver la existencia de dos copias de ResumeX, fijar el nombre de los dos productos y dejar reglas de trabajo escritas.
- **Estado:** completado.
- **Cambios:**
  - `AGENT_HANDOFF.md`: creado. Estado, protocolo, decisiones R-001…R-015, arquitectura, plan de separación en 5 fases, riesgos.
  - `AGENTS.md`: añadidas reglas de trabajo para agentes bajo el bloque gestionado de Next.js.
  - `ObsidianVault/ResumeX/`: notas `ResumeX Career`, `ResumeX Talent`, `Reglas duras ResumeX`, `Gotchas ResumeX`; actualizados el hub y `_schema`.
  - `C:\Users\hp\CS50\ResumeX`: trabajo sin commitear preservado en la rama local `archive/cs50-clerk-2026-08-05`. No pusheada.
- **Decisiones:** R-001 a R-015.
- **Validaciones realizadas:** comparación de ambas copias (rutas, `package.json`, `lib/talent-mapper/`, remotes, fechas de commit); confirmado que la agregación por autor, el scoring y la UI del Talent Mapper existen completos sólo en el repo canónico; confirmada la deprecación de `middleware` a favor de `proxy` en los docs de Next 16 incluidos en `node_modules`.
- **Riesgos o bloqueos:** la landing `/` requiere decisión humana antes de la Fase 1.
- **Siguiente paso:** commitear el trabajo en vuelo de `main`, luego ejecutar la Fase 1 del plan de separación.

### 2026-08-05 14:35 — Fase 1: separación en `/career` y `/talent`

- **Objetivo:** commitear el trabajo en vuelo y ejecutar la Fase 1 del plan de separación.
- **Estado:** completado.
- **Cambios:**
  - Commits previos al split: `f0b4652` Talent Mapper completo, `f017748` log de error en `/api/auth/register`, `2a26369` handoff + `AGENTS.md` + `.cursor/`.
  - `lib/products.ts`: **nuevo.** Fuente única de nombres R-003, `basePath`, `home` y nav de cada producto, más `productForPath()` y `otherProduct()`.
  - `app/(marketing)/page.tsx`: la landing (antes `app/page.tsx`) movida al route group. Talent Mapper sale de la grilla de features de Career y entra como banda propia hacia `/talent`. Vuelve a ser honesto el "seis tools".
  - `app/career/`: `layout.tsx` con metadata propia y template de título; `page.tsx` que resuelve a `/career/tracker`; `cv`, `analyzer`, `cover-letter`, `jobs`, `jobsearcher`, `tracker/**`, `autoapply`, `onboarding` movidos con `git mv`.
  - `app/talent/`: `layout.tsx` propio, `page.tsx` con la landing pública de ResumeX Talent (incluye la sección "What this does not tell you", R-007/R-014), y `mapper/` desde `app/talent-mapper/`.
  - `app/formatter/`: eliminado. Era un alias que redirigía a `/`; ahora es un 308 hacia `/career/cv`.
  - `next.config.ts`: `PRODUCT_SEGMENT_REDIRECTS`, diez 308 permanentes desde las rutas planas.
  - `proxy.ts`: `PROTECTED_PREFIXES` pasa de doce rutas planas a cuatro prefijos. `/talent` queda público y sólo se protege `/talent/mapper`.
  - `components/AppNav.tsx`: la nav se deriva de `productForPath(pathname)` y muestra los links del producto activo más un cruce al otro. El wordmark sólo nombra un producto cuando estás dentro de uno.
  - Links internos reescritos en 15 archivos, incluidos los que no son UI: email de bienvenida (`api/auth/register`), digest de cron, `chrome-extension/popup.js` y el script E2E.
  - `README.md`, `AGENTS.md`: documentada la superficie de dos productos y las reglas nuevas.
  - `.claude/launch.json`: config de preview para levantar el dev server.
- **Decisiones:** R-016 (landing lidera con Career — decisión humana), R-017 (APIs siguen planas), R-018 (todo movimiento de ruta deja 308), R-019 (`lib/products.ts` como fuente única).
- **Validaciones realizadas:** `npm run typecheck`, `npm run lint`, `npm test` (30 tests) y `next build` en verde — el árbol de rutas del build coincide con el destino. Verificados por HTTP los códigos de las 13 rutas relevantes: `/` y `/talent` 200, herramientas 307 a login con el `callbackUrl` nuevo, rutas planas 308 al segmento. Renderizado real de `/` y `/talent` revisado en el navegador. `npm run test:e2e:talent-mapper` pasa contra las rutas nuevas: login → `/talent/mapper` → demo → shortlist → CSV, sin errores de consola ni requests fallidos.
- **Riesgos o bloqueos:** ninguno. Los 308 sólo existen en local hasta que se pushee; los clientes desplegados (extensión, emails viejos) dependen de que ese deploy ocurra.
- **Siguiente paso:** pushear `main` y confirmar los redirects en prod. Después, Fase 2 (R-008).

### 2026-08-05 14:43 — deploy de Fase 1 y arranque de Fase 2

- **Objetivo:** publicar la separación de productos, verificar sus rutas críticas en producción y comenzar R-008 con una red de tests antes de partir el motor.
- **Estado:** completado para T-2.1 y T-2.2.
- **Cambios:**
  - `main`: integrado el commit remoto `9cf05ea` sin perder el split; el email de bienvenida combina el dominio canónico con `/career/tracker`, la landing alinea Pro en `$5` y el README conserva ambos productos junto al nuevo showcase.
  - `lib/__tests__/analyze.test.ts`: 16 tests de caracterización para request a OpenAI, respuesta válida, JSON inválido, campos faltantes, score fuera de rango, uso ausente y todos los caminos de `analysis-errors.ts`.
  - `lib/types.ts`: nuevos `CareerAnalysis` y `TalentAssessment`; `AnalysisResult` queda temporalmente como compuesto de ambos y marcado `@deprecated`.
  - `ROADMAP.md`: T-2.1 y T-2.2 marcadas completas.
- **Decisiones:** la frase “unión de ambos” de T-2.2 no puede coexistir con su requisito de no modificar consumidores: una unión TypeScript sólo expone campos comunes. El alias transitorio usa intersección para representar fielmente el payload legado completo; T-2.6 lo retira.
- **Validaciones realizadas:** `npm run lint`, `npm run typecheck`, `npm test` (46 tests). Deployment de producción `dpl_9zy6Ymx38mKgZLgKpTiMzSPbua4D` Ready; logs de Vercel terminan en `Deployment completed`; `/` y `/talent` responden 200; `/talent-mapper` → `/talent/mapper/` y `/tracker` → `/career/tracker/` responden 308; render real de `/talent` revisado en navegador.
- **Riesgos o bloqueos:** `npm run build` no puede reproducirse localmente porque Vercel no descarga el valor de la variable sensible `DATABASE_URL` (queda vacío en `.vercel/.env.production.local`). El mismo build sí terminó correctamente en Vercel con el entorno de producción.
- **Siguiente paso:** T-2.3, partir el motor y sus prompts manteniendo el núcleo en `lib/analyze.ts`.

### 2026-08-05 14:48 — T-2.3 y T-2.4: motor y summaries por audiencia

- **Objetivo:** partir `lib/analyze.ts` en salidas Career/Talent con prompts distintos, sin romper `/api/analyze`.
- **Estado:** completado.
- **Cambios:**
  - `lib/analyze.ts`: núcleo compartido `runStructuredAnalysis`; nuevos `analyzeForCareer()` / `assessForTalent()` con prompts y schemas propios; `analyzeResume` queda como puente legacy con el prompt compuesto.
  - `lib/__tests__/analyze.test.ts`: cobertura de las dos funciones nuevas, schemas distintos, clamp/validación por audiencia, y T-2.4 (prompts y summaries de mejora vs decisión).
  - `ROADMAP.md`: T-2.3 y T-2.4 marcadas completas.
- **Decisiones:** `/api/analyze` sigue llamando `analyzeResume` hasta T-2.5 para no cambiar el payload compuesto que aún consumen `ResultCards` y el PDF. El núcleo no se extrajo a `lib/evidence/` (R-009).
- **Validaciones realizadas:** `npm test` (52), `npm run typecheck`, `npm run lint`.
- **Riesgos o bloqueos:** ninguno nuevo. La calidad del modelo con prompts partidos aún no se contrastó con fixtures reales (riesgo declarado en el roadmap).
- **Siguiente paso:** T-2.5 — migrar consumidores; dueño del PDF: Career (el botón vive en el analyzer del candidato).
