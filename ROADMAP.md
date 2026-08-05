# Roadmap — ResumeX

> **Qué es este archivo.** El plan de trabajo a mediano plazo, desglosado en tareas que otro agente puede tomar sin contexto previo de la conversación que las originó.
>
> **Qué NO es.** No es el estado del proyecto: eso vive en [`AGENT_HANDOFF.md`](./AGENT_HANDOFF.md). No es el reglamento de código: eso vive en [`AGENTS.md`](./AGENTS.md). Si este archivo contradice al handoff, **manda el handoff** — el roadmap describe intención, el handoff describe realidad.

---

## Cómo usar este roadmap

1. **Leé primero `AGENT_HANDOFF.md`.** Estado actual, decisiones vigentes R-001…R-019 y bitácora. Una tarea de acá puede haber quedado obsoleta por una decisión de allá.
2. **Tomá una tarea completa, no media.** Cada tarea tiene ID (`T-2.3`), precondiciones, pasos y una **definición de terminado** verificable. Si no podés cumplir la definición de terminado, la tarea no está lista para cerrarse: dejá lo hecho, anotá en la bitácora qué falta y por qué.
3. **Respetá el orden de fase.** Las fases están ordenadas por dependencia real, no por preferencia. La Fase 3 asume que la Fase 2 dejó dos consumidores funcionando; sin eso, extraer el kernel es adivinar (R-009).
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

### Reglas transversales

Aplican a **toda** tarea de este roadmap. No se repiten en cada una.

- **Antes de escribir Next.js**, leer la guía pertinente en `node_modules/next/dist/docs/`. Esta versión tiene breaking changes respecto al conocimiento previo de cualquier modelo.
- **Antes de tocar `lib/talent-mapper/scoring.ts` o `aggregate-authors.ts`**, tests de caracterización que fijen el comportamiento actual (R-012). Estos archivos regresan en silencio: no rompen el build, sólo empeoran los resultados.
- **Toda ruta de página que se mueva deja un 308** en `PRODUCT_SEGMENT_REDIRECTS` (`next.config.ts`, R-018).
- **Nombres y rutas de producto salen de `lib/products.ts`** (R-019). Nada de `"ResumeX Talent"` hardcodeado.
- **Las APIs siguen planas** hasta que exista versionado (R-017).
- **Verificación mínima antes de commitear:** `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. Si la tarea toca Talent Mapper, además `npm run test:e2e:talent-mapper` con el dev server arriba.
- **Sin secretos** en el repo, el handoff ni el wiki (R-015).

---

## El terreno, hoy

Números reales al cierre de la Fase 1, para que nadie tenga que redescubrirlos:

| Dimensión | Estado |
|---|---|
| Rutas de página | 10 en `/career/*`, 2 en `/talent/*`, 5 compartidas, 10 redirects 308 desde rutas planas |
| Rutas de API | 28, todas planas bajo `/api/*` (R-017) |
| Tests | 30 en 7 archivos, **todos de Talent Mapper**. `vitest.config.mts` sólo incluye `lib/**` |
| Cobertura de Career | **Cero tests.** `lib/analyze.ts` (208 líneas), `format-resume.ts`, `merge-profile.ts`, `parse-profile.ts` sin red |
| E2E | Uno: `scripts/e2e-talent-mapper.mjs`, cubre el camino demo completo. Career no tiene E2E |
| Modelos Prisma | `User`, `Application`, `Profile`, `Answer`. **Ninguno de Talent** |
| Estado de Talent | Todo en `localStorage`, key `resumex-talent-mapper-v1` |
| Tipo compartido problemático | `AnalysisResult` (`lib/types.ts:25`), 15 campos sirviendo a dos usuarios distintos |
| Evidencia de Career | `CriteriaItem { criterion, met, evidence: string }` — un string suelto, sin procedencia. Viola el estándar de R-007 |
| Evidencia de Talent | `EvidenceMatch` con `workTitle`, `snippet`, `doi`, `confidence`, `matchType`, `workId`. Es el estándar |

Ese contraste entre las dos últimas filas es, en una línea, el trabajo que queda.

---

# Fase 2 — Salidas separadas

**Objetivo.** Partir `AnalysisResult` en dos salidas sobre el mismo motor (R-008): una **de mejora** para Career, una **de decisión** para Talent.

**Por qué ahora.** Es la deuda que la separación de rutas hizo visible pero no resolvió. Hoy un candidato que usa `/career/analyzer` recibe en el payload `recommendedNextStep: "Reject"` y `sendoutBlurb` — campos escritos para que un reclutador decida sobre él. No se muestran en la UI, pero viajan por la red y están en el tipo. Un tipo sirviendo a dos usuarios es exactamente el problema que la separación viene a resolver.

**Precondiciones.** Fase 1 ✅.

### Reparto de campos

Punto de partida, no dogma. Si al implementar aparece un campo mal ubicado, discutilo en la bitácora antes de moverlo.

| Campo actual | Va a | Razón |
|---|---|---|
| `matchScore` | ambos | El número es el mismo; cambia el marco que lo rodea |
| `summary` | ambos | Redacción distinta por audiencia (ver T-2.4) |
| `mustHaveCriteria`, `niceToHaveCriteria` | ambos | El candidato ve qué le falta; el reclutador ve qué cumple |
| `strengths`, `gaps` | **Career** | Vocabulario de mejora personal |
| `matchedKeywords`, `missingKeywords` | **Career** | Sirve para reescribir el CV |
| `suggestions` | **Career** | Literalmente "qué hacer para mejorar" |
| `concernLevel` | **Talent** | Un candidato no necesita saber que su nivel de preocupación es "High" |
| `recommendedNextStep` | **Talent** | `Reject` \| `Screen` \| `Interview` \| `Strongly recommend` — es una decisión sobre una persona |
| `strongMatches` | **Talent** | Formato de defensa ante un cliente |
| `phoneScreenQuestions` | **Talent** | Preguntas para evaluar, no para prepararse |
| `clientFacingBullets`, `sendoutBlurb` | **Talent** | Artefactos de agencia |

### ✅ T-2.1 — Tests de caracterización de `lib/analyze.ts`

**Sin esto no empieza la fase.** `lib/analyze.ts` (208 líneas) no tiene un solo test y es el motor que la Fase 2 va a partir en dos.

- Crear `lib/__tests__/analyze.test.ts`.
- Mockear la llamada a OpenAI: la unidad bajo test es el armado del prompt, el parseo de la respuesta y el manejo de error, **no** el modelo.
- Fijar: forma del objeto devuelto ante una respuesta bien formada; comportamiento ante JSON inválido; comportamiento ante campos faltantes; qué pasa con `matchScore` fuera de rango.
- Revisar `lib/analysis-errors.ts` y cubrir sus caminos.

**Terminado cuando:** los tests pasan, y si comentás una rama del parseo en `analyze.ts` al menos un test falla. Un test que pasa con el código roto no es un test.

### ✅ T-2.2 — Declarar los dos tipos de salida

- En `lib/types.ts`, definir `CareerAnalysis` y `TalentAssessment` con el reparto de arriba.
- Mantener `AnalysisResult` como `@deprecated`, definido como la unión de ambos, para que nada rompa mientras dura la migración.
- No borrar `AnalysisResult` en esta tarea. Se borra en T-2.6, cuando no queden consumidores.

**Terminado cuando:** `npm run typecheck` pasa sin cambiar ningún consumidor.

### ✅ T-2.3 — Partir el motor

- `lib/analyze.ts` expone hoy una función que devuelve `AnalysisResult`. Partirla en `analyzeForCareer()` y `assessForTalent()` sobre un núcleo compartido de extracción.
- El núcleo compartido **se queda en `lib/analyze.ts` por ahora**. No lo subas a `lib/evidence/`: eso es Fase 3 y necesita dos consumidores funcionando (R-009).
- El prompt probablemente deba partirse también. Un prompt que pide quince campos para dos audiencias produce texto de compromiso para ambas.

**Depende de:** T-2.1, T-2.2.
**Terminado cuando:** los tests de T-2.1 pasan contra las dos funciones nuevas, y `/api/analyze` sigue devolviendo lo mismo que antes para Career.

### ✅ T-2.4 — Reescribir el `summary` por audiencia

El mismo hecho — "tiene 3 de 5 must-haves" — se le dice distinto a quien puede mejorar y a quien tiene que decidir. Career: qué le falta y qué hacer. Talent: qué riesgo asume al avanzar y qué preguntar para reducirlo.

**Depende de:** T-2.3.
**Terminado cuando:** los dos summaries se leen distinto sobre el mismo input, y hay un test que lo fija.

### ✅ T-2.5 — Migrar los consumidores

Seis archivos importan `AnalysisResult` hoy:

| Archivo | Pasa a usar |
|---|---|
| `lib/analyze.ts` | ambos |
| `lib/format-analysis.ts` | `CareerAnalysis` (revisar si tiene ramas de reclutador muertas) |
| `lib/generate-report-pdf.ts` | decidir: ¿el PDF es del candidato o del reclutador? Hoy es ambiguo |
| `components/ResumeAnalyzer.tsx` | `CareerAnalysis` |
| `components/ResultCards.tsx` (469 líneas) | probable split en dos componentes |
| `components/DownloadReportButton.tsx` | sigue a `generate-report-pdf.ts` |

`ResultCards.tsx` es el archivo caro: 469 líneas renderizando campos de las dos audiencias. Revisar si conviene partirlo en `career/AnalysisCards.tsx` y `talent/AssessmentCards.tsx` con primitivas compartidas, o si alcanza con condicionar por tipo.

**Depende de:** T-2.3.
**Terminado cuando:** ningún archivo fuera de `lib/types.ts` importa `AnalysisResult`.

### ✅ T-2.6 — Retirar `AnalysisResult`

Borrar el tipo deprecado y su unión.

**Depende de:** T-2.5.
**Terminado cuando:** `grep -rn "AnalysisResult" --include="*.ts" --include="*.tsx" .` no devuelve nada fuera de `AGENT_HANDOFF.md` y este archivo.

### ✅ T-2.7 — Decidir si Talent expone una superficie de evaluación

Los campos `TalentAssessment` existen pero **ningún consumidor de Talent los usa todavía**: `/talent/mapper` es sourcing, no evaluación. Hay dos caminos:

- **A.** Construir `/talent/assess` — pegar un CV y una JD, obtener la salida de decisión. Da el segundo consumidor real que la Fase 3 necesita.
- **B.** Dejar `TalentAssessment` declarado sin superficie hasta la Fase 4, y aceptar que la Fase 3 arranque con un consumidor y medio.

**Decisión (2026-08-05):** **A**. Implementado: `/talent/assess` + `/api/talent-assess`.

### Riesgos de la Fase 2

| Riesgo | Mitigación |
|---|---|
| Partir el prompt degrada la calidad de una de las dos salidas sin que nadie lo note | Guardar 5 pares (CV, JD) reales como fixtures y comparar salidas antes/después a ojo, no sólo por tipo |
| `generate-report-pdf.ts` termina sirviendo a dos audiencias otra vez | Decidir su dueño **antes** de tocarlo, no durante |
| La migración se queda a medio camino y conviven los tres tipos | T-2.6 es parte de la fase, no un "después" |

---

# Fase 3 — Kernel compartido

**Objetivo.** Migrar la evidencia de Career/Assess al modelo con procedencia de R-007 (T-3.4). Extraer `lib/roles/` si sigue justificado (T-3.3). **No** subir el matcher de Talent Mapper a `lib/evidence/` (T-3.2 cancelada por T-3.1).

**Por qué después de la 2.** R-009: se extrae al segundo uso real. Antes de la Fase 2, `lib/talent-mapper/evidence.ts` tiene un solo consumidor. Diseñar el kernel ahí es diseñar para un caso y descubrir en el segundo que la abstracción no servía.

**Precondiciones.** Fase 2 ✅, incluida T-2.7 opción A (o aceptación explícita de arrancar con un consumidor y medio).

### ✅ T-3.1 — Comparar los dos modelos de evidencia

Antes de extraer, escribir en el handoff qué tienen en común de verdad.

- **Talent Mapper** (`lib/talent-mapper/types.ts`): `EvidenceMatch { criterion, matchType: exact|adjacent|inferred, workTitle, year, snippet, doi, openAlexUrl, confidence: direct|strong_adjacent|possible, workId }`.
- **Career / Talent Assess** (`lib/types.ts:14`): `CriteriaItem { criterion, met: boolean, evidence: string }` — mismo tipo en `AnalysisBase`.

La diferencia no es de forma, es de honestidad: Talent Mapper apunta al documento fuente y declara su confianza; Career/Assess devuelven un string que el modelo redactó. Un `met: boolean` tampoco distingue "lo cumple" de "no encontré evidencia".

**Resultado (2026-08-05):** tabla completa en `AGENT_HANDOFF.md` § "Comparación de evidencia (T-3.1)". Único campo idéntico: `criterion`. **Casi nada es común a nivel de tipo** → T-3.2 cancelada.

**Terminado cuando:** hay una tabla en el handoff con qué campos son genuinamente comunes y cuáles son específicos del sujeto. Si la respuesta honesta es "casi nada es común", eso también es un resultado válido y cancela T-3.2. ✅

### ❌ T-3.2 — Extraer `lib/evidence/` — CANCELADA

Cancelada por T-3.1. `matchEvidence()` no tiene segundo consumidor: Career/Assess no operan sobre `ScholarlyWork`. Subir el matcher a `lib/evidence/` violaría R-009 y la regla de frontera.

Un contrato tipado delgado para veredictos LLM (`CriteriaItem` con procedencia) puede aparecer dentro de **T-3.4**, compartido por Career y Assess. No se unifica con `EvidenceMatch`.

~~Sólo si T-3.1 lo justifica.~~

~~- Tipos comunes: criterio, match, nivel de confianza, procedencia.~~
~~- La procedencia es obligatoria: extracto real, fuente identificable, confianza, y marca de si lo infirió la IA (R-007).~~
~~- `lib/talent-mapper/evidence.ts` (319 líneas) pasa a consumir el kernel sin cambiar comportamiento. **Sus tests existentes deben pasar sin modificarse** — si hay que tocarlos, cambiaste comportamiento.~~

### ❌ T-3.3 — Extraer `lib/roles/` — CANCELADA

**Resultado (2026-08-05):** cancelada. Talent Mapper produce `SourcingCriteria` para OpenAlex; Career/Assess producen `CriteriaItem[]` dentro de un compare CV+JD. Misma lógica R-009 que T-3.2.

### ✅ T-3.4 — Migrar la evidencia de Career a procedencia

Hecho en prod. `CriteriaItem`/`StrongMatch` con `status`, `quote`, `aiInferred` + normalización server-side.

---

# Fase 4 — Talent como herramienta de trabajo

**Estado (2026-08-05):** ✅ T-4.1…T-4.6 hechas. T-4.7 Ashby **diferida**.

### ✅ T-4.1 — Modelar la persistencia
Modelos `TalentSearch`, `ShortlistEntry`, `CandidateNote`. `resultJson` entero. Búsquedas **por usuario** (sin Organization).

### ✅ T-4.2 — APIs de persistencia
`/api/talent-mapper/searches` CRUD + shortlist + notes. Auth + filtro `userId`.

### ✅ T-4.3 — Migrar el workspace a servidor
Prisma como verdad; localStorage caché; import explícito del draft del navegador.

### ✅ T-4.4 — Pantalla de búsquedas guardadas
`/talent/searches` + nav.

### ✅ T-4.5 — Notas por candidato
`CandidateNote` con debounce. Pipeline statuses **no** (sin demanda real).

### ✅ T-4.6 — `screeningQuestions`
Generadas desde técnicas no matcheadas, unknowns y concerns.

### ❌ T-4.7 — Ashby — DIFERIDA
Especulativa hasta cliente concreto.

---

# Fase 5 — Consolidación de repos

### ✅ T-5.1 — Inventariar sourcing-copilot
Serper/LinkedIn ≠ OpenAlex. Ver `resumex-sourcing-copilot/ARCHIVE.md`.

### ✅ T-5.2 — Absorber
Nada absorbido ahora.

### ✅ T-5.3 — Archivar resumex-tracker
No local; tracker canónico = Career `/career/tracker`.

### ✅ T-5.4 — Extensión Chrome
**Permanece en este repo.**

---

# Fase 6 — Comercialización y medición

### ✅ T-6.1 — Analítica mínima
`/api/analytics` + `TrackedLink` en CTAs de `/talent`.

### ⏸️ T-6.2 — Precio de Talent — DIFERIDA
Pro Career $5/mo via `formatProPriceLabel`. Talent sin plan propio aún.

### ⏸️ T-6.3 — Marca — DIFERIDA
Revisar si Talent gana clientes enterprise.

---

# Backlog transversal

| ID | Estado |
|---|---|
| ✅ B-1 | Precio desde `PLANS` / `formatProPriceLabel` |
| 🟨 B-2 | `analyze.ts` cubierto; format/merge/parse pendientes |
| ⬜ B-3 | E2E Career pendiente |
| ✅ B-4 | vitest incluye app/ y components/ |
| ✅ B-5 | Alias MatchConfidence/MatchType retirados |
| ⏸️ B-6 | criterionKind diferida |
| 🟨 B-7 | aiInferred en CriteriaItem; matchType inferred en Mapper |
| ⬜ B-8 | i18n Talent pendiente |
| ⬜ B-9 | a11y /talent pendiente |
| ⏸️ B-10 | Segunda fuente condicionada a calibración |

---

# Decisiones humanas — resueltas (2026-08-05)

| # | Resultado |
|---|---|
| 1 Assess | A |
| 2 Ownership | Usuario |
| 3 Ashby | Diferida |
| 4 Extensión | Este repo |
| 5 Fase 6 | Mínima (T-6.1) |

---

## Bitácora de este archivo

- **2026-08-05** — Roadmap cerrado en alcance agente: Fases 3–6 + backlog viable.
- **2026-08-05** — T-3.4 procedencia; T-3.1/T-3.2; Fase 2 completa.
