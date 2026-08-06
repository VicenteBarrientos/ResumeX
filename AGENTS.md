<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ResumeX — reglas de trabajo

**Antes de tocar nada, leer [`AGENT_HANDOFF.md`](./AGENT_HANDOFF.md).** Contiene el estado actual, las decisiones vigentes (R-001…) y el plan de separación. Para elegir en qué trabajar, [`ROADMAP.md`](./ROADMAP.md): las fases desglosadas en tareas con definición de terminado, más las **anti-tareas** (cosas que parecen mejoras y no lo son). Este archivo sólo resume lo que aplica al escribir código.

## Repositorio

Este es el **único repo canónico**: `C:\Users\hp\Projects\ResumeX`.

Existe una copia archivada en `C:\Users\hp\CS50\ResumeX` que comparte remote y está obsoleta. No trabajar ahí, no commitear, no pushear. Si dudas de dónde estás, `git remote -v` no basta — verifica la ruta.

## Dos productos, una base de código

| Producto | Usuario | Pregunta que resuelve |
|---|---|---|
| **ResumeX Career** | Candidatos | ¿Cómo consigo esta entrevista? |
| **ResumeX Talent** | Recruiters y equipos de contratación | ¿A quién contacto y por qué? |

Los nombres son exactos y van así en UI, copy, metadata y comentarios. Talent Mapper es una **feature dentro de ResumeX Talent**, no una marca.

## Al escribir código

- **Comparte verbos, no sustantivos.** Los motores se comparten; los tipos de sujeto no. Career opera sobre un CV auto-reportado, Talent sobre un investigador inferido desde publicaciones. No unificarlos en un `Candidate`.
- **Extrae al segundo uso.** Nada sube a un módulo compartido hasta que haya dos consumidores reales funcionando.
- **La evidencia lleva procedencia.** Extracto real, fuente, confianza y marca de si la infirió la IA. Nunca una frase del modelo presentada como cita. `lib/talent-mapper/evidence.ts` es el estándar.
- **Precisión sobre recall** en sourcing. Ante la duda, menos candidatos y declarar lo que no se sabe.
- **Prisma es la capa de datos.** `localStorage` sólo como caché de UI y contrato con la extensión.
- **`proxy.ts`, nunca `middleware.ts`** — deprecado en Next 16.
- **Un solo root layout.** `/career` y `/talent` son segmentos con su propio `layout.tsx`. No múltiples root layouts.
- **`lib/products.ts` es la fuente única de los nombres, rutas y navegación de cada producto.** No hardcodear `"ResumeX Career"` ni `/talent/mapper` en una superficie nueva: importarlo de ahí.
- **Ruta nueva = ruta dentro de un producto.** Toda página de herramienta cuelga de `/career/*` o `/talent/*`. Si mueves o renombras una, agregar el 308 en `PRODUCT_SEGMENT_REDIRECTS` (`next.config.ts`): la extensión Chrome y los emails salientes llevan URLs viejas.
- **Las APIs siguen planas** (`/api/talent-mapper/*`, `/api/tracker`, …). Namespacearlas rompe el contrato de la extensión desplegada; se hará cuando haya versionado.
- **Sin secretos** en el repo ni en el wiki. Keys de OpenAI y OpenAlex son server-side.

## Antes de tocar scoring

`lib/talent-mapper/scoring.ts` y `aggregate-authors.ts` definen la calidad del producto y regresan en silencio: no rompen el build, sólo empeoran los resultados. Escribir tests de caracterización antes de modificarlos.

## Comandos

```bash
npm run dev
npm run build          # prisma generate && prisma migrate deploy && next build
npm test               # vitest run
npm run typecheck
npm run lint
npm run test:e2e:talent-mapper   # requiere npm run dev en otra terminal
npm run test:e2e:career          # requiere npm run dev en otra terminal
```

## Al terminar

Actualizar `AGENT_HANDOFF.md`: estado si cambió, archivos tocados, entrada de bitácora y siguiente paso comprobable. No borrar historia; una decisión superada se marca `SUPERADA`.

## Cursor Cloud specific instructions

Runtime already provisioned by the startup update script: Node deps (`npm install`) and the Prisma client (`prisma generate`). Standard commands live in the `## Comandos` section above and in `package.json`; this section only covers the non-obvious cloud caveats.

- **Postgres is required and is NOT auto-started by the update script.** The dev DB is a local PostgreSQL 16 cluster. At session start, ensure it is running and migrations are applied:
  - `sudo pg_ctlcluster 16 main start` (idempotent; ignore "already running").
  - `node scripts/prisma-migrate-deploy.cjs` (wraps `prisma migrate deploy` with recovery for the known BOM migration `20260806010000_usage_events`).
  - Local dev role/db: user `resumex`, password `resumex`, database `resumex`. Recreate with `sudo -u postgres psql` if missing.
- **Env files are git-ignored and must exist locally.** Both `.env` (read by Prisma CLI) and `.env.local` (read by Next.js) are needed, with the same `DATABASE_URL`. Local uses `postgresql://resumex:resumex@localhost:5432/resumex?sslmode=disable` (no SSL locally — do not use `sslmode=require`). `NEXTAUTH_SECRET` must be set; `OPENAI_API_KEY` can stay empty (see next point).
- **No external API keys are needed to run or test.** Demo paths are deterministic and skip OpenAI/OpenAlex/PubMed: Career analyzer/cover-letter via "Try demo", and Talent Mapper via "Run demo snapshot". Real (non-demo) AI routes return an error without `OPENAI_API_KEY`; that is expected, not a broken environment.
- **Auth uses `username` (not email) as the login field.** Register via `POST /api/auth/register` with `{"username","password"}` (email optional). Every tool route and AI API requires a signed-in session.
- **`npm run build` requires a reachable database** (it runs `prisma migrate deploy` before `next build`). With the local Postgres up it works; if you only need to validate the compile, `npx next build` plus `prisma validate` is the historical fallback used when no DB was available.
- **E2E scripts (`npm run test:e2e:career`, `npm run test:e2e:talent-mapper`) need the dev server running** and a one-time `npx playwright install --with-deps chromium`.
- **After editing `app/globals.css`, Turbopack may keep serving stale CSS** — delete `.next` and restart `npm run dev` (noted in `AGENT_HANDOFF.md`).
- **After `npm run build`, restart `npm run dev`** (and delete `.next` if Turbopack looks stale). The production build overwrites `.next` and the previous Turbopack dev session will no longer serve correctly.
