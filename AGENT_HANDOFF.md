# Agent Handoff — ResumeX

> Bitácora compartida para que cualquier agente pueda conocer el estado del trabajo, las decisiones vigentes, la arquitectura de los dos productos y el siguiente paso recomendado.
>
> Este archivo es la **fuente de verdad del día a día**. El wiki de Obsidian (`ObsidianVault/ResumeX/`) guarda el conocimiento estable; si los dos difieren, manda este archivo.

## Estado actual

- **Última actualización:** 2026-08-05 13:46:51 -04:00 — America/Santiago
- **Versión del handoff:** 1.0
- **Estado:** ResumeX opera como un solo producto con 7 tools. Seis son de candidato (CV Formatter, Analyzer, Cover Letter, Job Search, Tracker, AutoApply) y una es de reclutador (Talent Mapper, completo: OpenAlex live + demo snapshot, agregación por autor, scoring 0–100 explicable, evidencia por paper, outreach, CSV, tests Vitest). Se decide separarlo en dos productos con marca propia sobre una misma base de código: **ResumeX Career** y **ResumeX Talent**. La separación aún **no está implementada** — las rutas siguen planas.
- **Próximo hito:** ejecutar la Fase 1 del plan de separación (segmentos `/career` y `/talent` con layout y navegación propios, redirects desde las rutas planas). No tocar el kernel compartido todavía.
- **Bloqueos conocidos:** ninguno técnico. Pendiente de decisión humana: si la landing `/` bifurca explícitamente entre los dos productos o lidera con uno.
- **Repositorio canónico:** `C:\Users\hp\Projects\ResumeX` — rama observada `main`, remote `github.com/VicenteBarrientos/ResumeX.git`.
- **Copia archivada:** `C:\Users\hp\CS50\ResumeX` — **no usar**. Ver R-001 y la bitácora del 2026-08-05.
- **Prod:** https://resume-x-yixz.vercel.app
- **Wiki:** `C:\Users\hp\ObsidianVault\ResumeX\`

### Trabajo en vuelo (sin commitear en `main`)

`\.env.local.example`, `README.md`, `app/api/auth/register/route.ts`, `app/page.tsx`, `components/AppNav.tsx`, `package.json`, `package-lock.json`, `proxy.ts`, `tsconfig.json`, y `.cursor/` sin trackear. Revisar y commitear antes de empezar la separación, para que el diff del split quede limpio.

## Protocolo para agentes

1. Leer este archivo antes de trabajar.
2. Leer `AGENTS.md` (reglas de código) y `README.md` (setup y env). Para contexto de producto, el wiki: `ObsidianVault/ResumeX/ResumeX.md`.
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

## Arquitectura de producto

Un motor, dos productos, dos usuarios distintos:

```
ResumeX Career   CV → Job    → ¿cómo consigo esta entrevista?
ResumeX Talent   Job → Persona → ¿a quién contacto y por qué?
```

### Superficie actual (rutas planas, pre-separación)

| Producto | Páginas | APIs |
|---|---|---|
| **Career** | `/cv`, `/formatter`, `/analyzer`, `/cover-letter`, `/jobs`, `/jobsearcher`, `/tracker`, `/autoapply`, `/onboarding` | `analyze`, `format`, `cover-letter`, `extract-job`, `jobs`, `match-score`, `profile`, `profile/resume`, `tracker`, `tracker/[id]`, `answers`, `answers/[id]`, `autoapply/*`, `extension/*`, `cron/job-digest` |
| **Talent** | `/talent-mapper` | `talent-mapper/{search, extract-criteria, outreach, status}` |
| **Compartido** | `/`, `/login`, `/register`, `/upgrade`, `/extension-auth` | `auth/*`, `stripe/*` |

Career tiene nueve superficies y Talent una. El desbalance es real y está bien: Talent es el producto nuevo y más caro por usuario.

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

**Fase 1 — Rutas y marca.** Segmentos `/career` y `/talent` con `layout.tsx` propio y navegación separada. Redirects permanentes desde las rutas planas. Nombres R-003 en metadata, nav y copy. Sin tocar `lib/`. Es la fase que hace visible la decisión.

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

1. Revisar y commitear el trabajo en vuelo de `main` para que el diff de la Fase 1 quede limpio.
2. Ejecutar Fase 1 completa, incluidos los redirects desde rutas planas.
3. Definir con decisión humana el comportamiento de la landing `/`.
4. Escribir tests de caracterización sobre `scoring.ts` y `aggregate-authors.ts` antes de tocarlos (R-012).
5. Correr el smoke E2E (`npm run test:e2e:talent-mapper`) tras la Fase 1 para confirmar que el cambio de rutas no rompió el flujo de demo.

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
