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
- **Verificación mínima antes de commitear:** `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. Si la tarea toca Talent Mapper, además `npm run test:e2e:talent-mapper` con el dev server arriba.
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

### ⬜ T-7.2 — E2E de Career (cierra B-3)

- Nuevo `scripts/e2e-career.mjs`, mismo patrón que `e2e-talent-mapper.mjs` (Playwright, usuario demo, dev server en otra terminal).
- Camino mínimo: login → `/career/analyzer` (CV + JD demo → resultado con criterios y quotes) → `/career/tracker` (crear aplicación → verla en la lista) → `/career/cover-letter` (generar una carta).
- Agregar el script a `package.json` (`test:e2e:career`) y a la lista de verificación de `AGENTS.md`/reglas transversales de este archivo cuando la tarea toque esas superficies.

**Terminado cuando:** el script corre limpio contra el dev server local, sin errores de consola ni requests fallidos, y queda documentado en `README.md` igual que el de Talent Mapper.

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

# Backlog transversal

Heredado del cierre de roadmap anterior más lo que surgió de esta auditoría. No tiene fase asignada porque cada ítem es independiente y de tamaño pequeño — tomar cualquiera sin esperar el orden de fases.

| ID | Estado | Descripción |
|---|---|---|
| ⬜ B-2 | `format-resume`/`merge-profile`/`parse-profile` sin tests | Absorbido por **T-7.1** |
| ⬜ B-3 | E2E Career pendiente | Absorbido por **T-7.2** |
| ⏸️ B-6 | `criterionKind` (tipar categoría del criterio: técnica/organismo/área/geografía) | Diferida — sin segundo consumidor que lo necesite hoy; revivir si Talent Mapper o Assess necesitan pesos por tipo de criterio |
| ✅ B-7 | `aiInferred` en `CriteriaItem`/`StrongMatch` | Confirmado presente en `lib/types.ts:35,42` — cerrar como hecho |
| ⬜ B-8 | i18n Talent pendiente | Absorbido por **T-8.3** |
| ⬜ B-9 | a11y `/talent` pendiente | Absorbido por **T-8.1**/**T-8.2** |
| ⏸️ B-10 | Segunda fuente de evidencia (NIH RePORTER o Europe PMC) | Condicionada a calibrar precisión de OpenAlex contra roles reales primero (R-013) — no agregar fuentes sin medir la que ya existe |
| ⬜ B-11 | Observabilidad de errores en producción | Nuevo. No hay Sentry ni equivalente; los únicos logs son los de Vercel. Antes de escalar tráfico, evaluar agregar tracking de errores runtime (server actions, API routes) — no bloqueante hoy, pero barato de resolver temprano |
| ⬜ B-12 | Límite de costo/uso de OpenAI | Nuevo. `analyze.ts`/`assessForTalent`/Talent Mapper llaman a OpenAI sin rate limit ni budget cap por usuario. Un usuario (o un bot) puede generar cientos de análisis sin fricción. Evaluar límite simple (por usuario/día) antes de que sea necesario por un incidente en vez de por prevención |

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
- **2026-08-05** — Nuevo roadmap post-cierre: Fases 1–6 confirmadas completas en producción (`add4208`). Auditoría de terreno (tests, CI, i18n, a11y, tema de extensión, modelos Prisma) y apertura de Fases 7–11: red de seguridad (tests + E2E Career + CI), accesibilidad/i18n de Talent, paridad visual de la extensión, equipos (🤔 condicionada) y comercialización (⏸️ diferida). Backlog transversal actualizado: B-2/B-3/B-8/B-9 absorbidos por tareas nuevas, B-7 cerrado como ya hecho, B-11/B-12 nuevos (observabilidad, límite de costo OpenAI). El detalle tarea-por-tarea de las Fases 1–6 se conserva íntegro en `AGENT_HANDOFF.md` § Bitácora de cambios y en el historial de git de este archivo; no se repite acá para no diluir las fases nuevas.
