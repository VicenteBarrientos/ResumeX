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

**Objetivo.** Extraer `lib/evidence/` y `lib/roles/` con los dos consumidores ya funcionando, y migrar la evidencia de Career al modelo con procedencia de R-007.

**Por qué después de la 2.** R-009: se extrae al segundo uso real. Antes de la Fase 2, `lib/talent-mapper/evidence.ts` tiene un solo consumidor. Diseñar el kernel ahí es diseñar para un caso y descubrir en el segundo que la abstracción no servía.

**Precondiciones.** Fase 2 ✅, incluida T-2.7 opción A (o aceptación explícita de arrancar con un consumidor y medio).

### ⬜ T-3.1 — Comparar los dos modelos de evidencia

Antes de extraer, escribir en el handoff qué tienen en común de verdad.

- **Talent** (`lib/talent-mapper/types.ts`): `EvidenceMatch { criterion, matchType: exact|adjacent|inferred, workTitle, year, snippet, doi, openAlexUrl, confidence: direct|strong_adjacent|possible, workId }`.
- **Career** (`lib/types.ts:14`): `CriteriaItem { criterion, met: boolean, evidence: string }`.

La diferencia no es de forma, es de honestidad: Talent apunta al documento fuente y declara su confianza; Career devuelve un string que el modelo redactó. Un `met: boolean` tampoco distingue "lo cumple" de "no encontré evidencia".

**Terminado cuando:** hay una tabla en el handoff con qué campos son genuinamente comunes y cuáles son específicos del sujeto. Si la respuesta honesta es "casi nada es común", eso también es un resultado válido y cancela T-3.2.

### ⬜ T-3.2 — Extraer `lib/evidence/`

Sólo si T-3.1 lo justifica.

- Tipos comunes: criterio, match, nivel de confianza, procedencia.
- La procedencia es obligatoria: extracto real, fuente identificable, confianza, y marca de si lo infirió la IA (R-007).
- `lib/talent-mapper/evidence.ts` (319 líneas) pasa a consumir el kernel sin cambiar comportamiento. **Sus tests existentes deben pasar sin modificarse** — si hay que tocarlos, cambiaste comportamiento.

### ⬜ T-3.3 — Extraer `lib/roles/`

Job description → criterios. Hoy vive en `lib/talent-mapper/criteria.ts` y en el prompt de `lib/analyze.ts`, duplicado conceptualmente.

### ⬜ T-3.4 — Migrar la evidencia de Career a procedencia

La tarea que le da sentido a la fase. `CriteriaItem.evidence: string` pasa a llevar el extracto literal del CV, con offset o cita verificable, y una marca de si la IA lo infirió.

- `met: boolean` pasa a un enum de tres estados: cumple / no cumple / **sin evidencia suficiente**.
- La UI tiene que mostrar el tercer estado como tercer estado, no colapsarlo en "no cumple". Un candidato merece saber que su CV no dice algo, que es distinto de que no lo tenga.

**Terminado cuando:** ningún campo de evidencia mostrado al usuario en Career es texto libre del modelo sin fuente.

### Riesgos de la Fase 3

| Riesgo | Mitigación |
|---|---|
| Extraer una abstracción que no existe | T-3.1 puede cancelar T-3.2. Está permitido |
| Romper scoring de Talent al mover evidencia | R-012 + los 30 tests existentes deben pasar sin editarse |
| El kernel se convierte en un cajón | Regla de frontera del handoff: si sólo lo importa un producto, no es kernel |

---

# Fase 4 — Talent como herramienta de trabajo

**Objetivo.** Que un reclutador pueda cerrar el navegador y no perder nada.

**Por qué importa.** Hoy todo Talent vive en `localStorage` bajo `resumex-talent-mapper-v1`: búsqueda, criterios, resultados, shortlist y notas. Eso viola R-010 y hace imposible lo que un equipo necesita — compartir una shortlist, retomar una búsqueda desde otra máquina, ver qué hizo un colega. Es la fase que convierte un demo en una herramienta.

**Precondiciones.** Ninguna estricta. **Puede correr en paralelo con la Fase 2** — toca archivos distintos. Si hay un solo agente, la 2 primero: la deuda de tipos crece con cada superficie nueva.

### ⬜ T-4.1 — Modelar la persistencia

Modelos nuevos en `prisma/schema.prisma`. Punto de partida:

```
TalentSearch      id, userId, roleTitle, jobDescription, criteriaJson,
                  queriesJson, mode, resultJson, worksReviewed, createdAt, updatedAt
ShortlistEntry    id, searchId, authorId, addedAt          @@unique([searchId, authorId])
CandidateNote     id, searchId, authorId, body, updatedAt
```

Decisiones a tomar y **escribir** en el handoff:

- ¿`resultJson` se guarda entero o se normaliza en tablas? Entero es más simple y el resultado es un snapshot inmutable de una búsqueda — pero impide consultar "en qué búsquedas apareció este autor". Recomendación: entero ahora, normalizar cuando exista una pantalla que lo necesite (R-009 aplica también a datos).
- ¿Las búsquedas son del usuario o del equipo? Hoy no hay concepto de equipo. Si Talent apunta a equipos de contratación, `Organization` llega tarde y duele. **Requiere decisión humana.**

### ⬜ T-4.2 — APIs de persistencia

`/api/talent-mapper/searches` (GET lista, POST crear), `/searches/[id]` (GET, PATCH, DELETE), `/searches/[id]/shortlist`, `/searches/[id]/notes`.

Siguen planas bajo `/api/talent-mapper/` (R-017). Todas autenticadas y **filtradas por `userId`** — una búsqueda de sourcing tiene nombres de personas reales; una fuga de autorización acá es una fuga de datos personales.

### ⬜ T-4.3 — Migrar el workspace a servidor

`components/talent-mapper/TalentMapperWorkspace.tsx` guarda diez campos en `localStorage`. Pasan a Prisma. `localStorage` queda como caché de UI para no perder trabajo en vuelo si falla la red, nunca como almacén de verdad (R-010).

Incluir **migración del estado existente**: si hay un `resumex-talent-mapper-v1` en el navegador al cargar, ofrecer importarlo como búsqueda guardada. Alguien puede tener una shortlist real ahí.

### ⬜ T-4.4 — Pantalla de búsquedas guardadas

`/talent/searches`. Lista con rol, fecha, modo (live/demo), cantidad de candidatos y shortlisted. Agregar la entrada a `TALENT.nav` en `lib/products.ts`.

### ⬜ T-4.5 — Notas y estados por candidato

Hoy `notes` es un `Record<string, string>` en memoria. Pasa a `CandidateNote`. Evaluar estados (`contactado`, `respondió`, `descartado`) — pero sólo si hay un usuario real pidiéndolo. Un pipeline que nadie usa es peso muerto.

### ⬜ T-4.6 — `screeningQuestions`

`ResearcherCandidate.screeningQuestions?: string[]` ya está **declarado en el tipo pero nunca poblado** (`lib/talent-mapper/types.ts`). Es una de las tres ideas rescatadas de la copia archivada. Generarlas desde los `gaps` y `unknowns` del candidato convierte el brief en algo accionable en la primera llamada.

### ⬜ T-4.7 🤔 — Export e integración Ashby

`ASHBY_API_KEY` ya está declarada en `.env.local.example` pero no se usa. Antes de implementar: ¿hay un cliente con Ashby esperando esto, o es una integración especulativa? Seis integraciones superficiales valen menos que una fuente bien calibrada (espíritu de R-013).

**Requiere decisión humana.**

### Riesgos de la Fase 4

| Riesgo | Mitigación |
|---|---|
| Perder shortlists existentes al migrar | T-4.3 incluye importación explícita, no silenciosa |
| Fuga de datos personales entre usuarios | Toda query filtra por `userId`. Escribir un test que lo verifique, no confiar en la revisión |
| Modelar equipos tarde | La pregunta de T-4.1 se responde **antes** de la primera migración, no después |

---

# Fase 5 — Consolidación de repos

**Objetivo.** Un solo lugar donde vive el código de ResumeX.

**Precondiciones.** Fase 4 ✅ — absorber `resumex-sourcing-copilot` sin capa de datos es mover el problema de lugar.

### ⬜ T-5.1 — Inventariar `resumex-sourcing-copilot`

Antes de absorber, el mismo ejercicio que resolvió R-001: qué tiene que acá no exista, qué está obsoleto, qué es duplicado peor. Escribir el resultado en el handoff. Puede que la conclusión sea "archivar sin absorber nada".

### ⬜ T-5.2 — Absorber lo que sobreviva a T-5.1

### ⬜ T-5.3 — Archivar `resumex-tracker`

Con nota en su README apuntando acá, para que nadie lo retome por error.

### ⬜ T-5.4 🤔 — Definir dónde vive la extensión Chrome

Hoy `chrome-extension/` está en este repo pero existe `job-applier`. La extensión tiene contrato con `/api/extension/*` y con `localStorage`; separarla obliga a versionar ese contrato. **Requiere decisión humana.**

---

# Fase 6 🤔 — Comercialización y medición

> **Propuesta, no aprobada.** No está en el plan original del handoff. No empezar sin decisión humana.

La Fase 1 dejó `/talent` como landing pública sin forma de saber si funciona. R-016 se decidió por criterio, y quedó escrito que se revisa con datos.

- **T-6.1** — Analítica mínima en la banda de `/` hacia `/talent` y en el CTA de `/talent`. Sin esto, R-016 no se puede revisar nunca.
- **T-6.2** — Precio de Talent. El plan Pro actual ($5 o $15 — ver backlog B-1) está construido para candidatos: "Unlimited Cover Letters", "AutoApply Chrome Extension". Un reclutador no compra eso.
- **T-6.3** — Marca. El riesgo está declarado en el handoff: "ResumeX" es vocabulario de candidato; un reclutador no compra una herramienta nombrada por el documento que recibe. Revisar sólo si Talent gana clientes empresariales.

---

# Backlog transversal

No pertenece a ninguna fase. Tomable en cualquier momento por un agente con tiempo suelto.

| ID | Tarea | Por qué |
|---|---|---|
| ⬜ B-1 | **Precio de Pro inconsistente.** La landing dice `$15/mo`, `CAREER.nav` dice `$5/mo`. Definir la fuente de verdad desde Stripe e importarla en un solo lugar | Visible al usuario, y es un error de confianza en una página de pagos |
| ⬜ B-2 | **Tests para `lib/` de Career.** `analyze.ts`, `format-resume.ts`, `merge-profile.ts`, `parse-profile.ts` no tienen ninguno | Talent tiene 30 tests y Career cero. El desbalance no refleja importancia, refleja orden de construcción |
| ⬜ B-3 | **E2E de Career.** Existe `scripts/e2e-talent-mapper.mjs` como modelo | El camino registro → onboarding → CV → analyzer → tracker no se prueba nunca de punta a punta |
| ⬜ B-4 | **Ampliar el `include` de `vitest.config.mts`.** Hoy sólo `lib/**`: nada en `app/` ni `components/` es testeable aunque se escriba el test | Es una limitación silenciosa de configuración |
| ⬜ B-5 | **Retirar los alias deprecados** `MatchConfidence` y `MatchType` en `lib/talent-mapper/types.ts` | Ya están marcados `@deprecated`; dos nombres para un tipo invitan a divergir |
| ⬜ B-6 | **`criterionKind`.** Tipar la categoría del criterio (técnica, organismo, área, geografía) en vez de tratarlos como strings equivalentes | Segunda idea rescatada de la copia archivada. Permite pesos y copy por tipo |
| ⬜ B-7 | **`aiInferred` / `aiSummarized` explícitos** a nivel de match y de resumen | Tercera idea rescatada. Refuerza R-007 y es lo que hace auditable el resultado ante un experto de dominio |
| ⬜ B-8 | **i18n de las superficies nuevas.** `lib/i18n/resumex.ts` tiene EN y ES, pero `/talent`, `/talent/mapper` y la banda de `/` están sólo en inglés | El producto declara ser bilingüe y a medias no lo es |
| ⬜ B-9 | **Accesibilidad de `/talent`.** Contraste de la paleta emerald en dark mode, foco visible, jerarquía de headings | La landing nueva no pasó por revisión de a11y |
| ⬜ B-10 | **Segunda fuente de datos** para Talent, sólo después de calibrar precisión contra roles reales (R-013). Prioridad: NIH RePORTER o Europe PMC | Está condicionada a calibración, no a ganas |

---

# Anti-tareas

Cosas que parecen mejoras y no lo son. Si vas a hacer una de estas, discutila primero en el handoff.

| No hacer | Por qué |
|---|---|
| Unificar `ResearcherCandidate` y el candidato de Career en un tipo `Candidate` | R-005. Career opera sobre un CV auto-reportado; Talent sobre un investigador inferido desde publicaciones. Un tipo común obliga a campos opcionales que aplican a la mitad de los casos |
| Mover las APIs a `/api/career/*` y `/api/talent/*` | R-017. La extensión desplegada y los emails salientes llevan URLs absolutas |
| Crear un root layout por producto | R-006. Fuerza recarga completa al cruzar y duplica providers |
| Subir algo a `lib/evidence/` antes de la Fase 3 | R-009. Un consumidor no justifica una abstracción |
| Renombrar `middleware.ts` | R-011. Está deprecado en Next 16; la convención es `proxy.ts` |
| Ajustar pesos de scoring "a ojo" para que un candidato conocido suba | R-012 + R-014. Sin tests de caracterización es una regresión silenciosa |
| Agregar fuentes de datos para "mejorar recall" | R-014. Precisión sobre recall. Cada falso positivo cuesta credibilidad ante un experto |
| Presentar una frase redactada por el modelo como evidencia | R-007. Es la diferencia entre una cita verificable y una alucinación con formato de cita |

---

# Decisiones humanas pendientes

Resumen de todo lo marcado 🤔, para que quien pueda decidir lo vea junto:

| # | Decisión | Bloquea |
|---|---|---|
| 1 | ~~¿Talent tiene superficie de evaluación (`/talent/assess`) o `TalentAssessment` espera?~~ **Resuelto: A (2026-08-05)** | — |
| 2 | ¿Las búsquedas de Talent son del usuario o de un equipo? | T-4.1 → la primera migración de Prisma |
| 3 | ¿Ashby es real o especulativo? | T-4.7 |
| 4 | ¿Dónde vive la extensión Chrome? | T-5.4 |
| 5 | ¿Se abre la Fase 6? | T-6.1…T-6.3 |

---

## Bitácora de este archivo

- **2026-08-05** — T-2.7 opción A: `/talent/assess` + `/api/talent-assess`. Fase 2 cerrada.
- **2026-08-05** — T-2.5 y T-2.6: consumidores migrados a CareerAnalysis; PDF es de Career; AnalysisResult retirado del código.
- **2026-08-05** — T-2.3 y T-2.4: `analyzeForCareer` / `assessForTalent` con prompts y schemas por audiencia; `analyzeResume` queda como puente legacy; tests fijan summaries de mejora vs decisión.
- **2026-08-05** — T-2.1 y T-2.2 completadas: 16 tests nuevos fijan el request, parseo, validación, clamp de score y normalización de errores; `CareerAnalysis` y `TalentAssessment` quedaron declarados con un `AnalysisResult` compuesto y deprecado para mantener compatibles los consumidores hasta T-2.5.
- **2026-08-05** — Creado tras cerrar la Fase 1. Fases 2–5 heredadas del plan de `AGENT_HANDOFF.md` y desglosadas en tareas; Fase 6 y backlog transversal son nuevos. Los números de la sección "El terreno, hoy" salen de inspección directa del repo en esa fecha, no de estimación.
