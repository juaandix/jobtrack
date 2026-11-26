# Registro de ciclos Develop → Testing

Cada tarea del plan queda anotada aquí con sus rondas de revisión y el commit resultante.

## Decisiones

- 2026-11-25 — Tasa de respuesta: cuenta como respondida toda candidatura cuyo estado no es "enviada" (incluye "descartada").
- 2026-11-25 — Salario: dos campos numéricos opcionales, mínimo y máximo (bruto anual, €), con mínimo ≤ máximo.
- 2026-11-25 — Repositorio de GitHub: pendiente de confirmar en el hito 9.
- 2026-11-25 — SEC-01: el grep excluye las líneas `"integrity"` de `package-lock.json` (falso positivo con `eyJ` dentro de hashes sha512). Directriz actualizada.
- 2026-11-25 — SEC-01: el comando usa `ls-files -z | xargs -0 grep -H` (rutas con espacios y prefijo de fichero siempre presente), igual que el script.
- 2026-11-25 — Supabase en local (CLI + Docker) durante los hitos 2–8; el proyecto en la nube se crea en el hito 9. Se añade la tarea 2.0 al plan. Decisión del usuario.
- 2026-11-25 — Estados (orden del kanban): enviada, en_proceso, entrevista, oferta, descartada, rechazada_por_mi. Para la tasa de respuesta cuenta como respondida toda candidatura cuyo estado no es "enviada". Decisión del usuario.
- 2026-11-25 — Portales: linkedin, infojobs, tecnoempleo, indeed, web_empresa, referido, otro. Decisión del usuario.
- 2026-11-25 — El repo se mueve de ~/Desktop/jobtrack a ~/dev/jobtrack (iCloud duplicaba ficheros en .next/). Decisión del usuario.
- 2026-11-25 — Ritmo: ciclos agrupados (ver PLAN), sin pausa de OK entre hitos, e2e solo en tareas de UI/auth y al cerrar hito, registro dentro del commit de la tarea. Decisión del usuario.

## Hito 1 — Setup

### 1.1 — Scaffold Next.js (App Router, TS, Tailwind, ESLint, src/)
- Ronda 1: APROBADO
- Commit: 664566b chore: scaffold Next.js app with strict TypeScript and Tailwind
- Notas: `typecheck` = `next typegen && tsc --noEmit` (necesario para `LayoutProps`). Pendientes detectados: `!.env.example` en `.gitignore` (1.6); falso positivo de SEC-01 en `package-lock.json` (1.5); `globals.css` pisa Geist con Arial (UI).

### 1.2 — ESLint estricto + Prettier
- Ronda 1: APROBADO
- Commit: 81e0a01 chore: enforce strict ESLint rules and add Prettier with Tailwind plugin
- Notas: `no-console` permite `warn`/`error` (ARQ-04 solo prohíbe `console.log`). Prettier excluye `docs/`, `CLAUDE.md`, `AGENTS.md` y `.claude/`.

### 1.3 — Vitest + Testing Library + jsdom con umbrales de cobertura
- Ronda 1: APROBADO
- Commit: 07e7c09 test: set up Vitest with Testing Library and coverage thresholds
- Notas: `@types/node` ^22 (lo exige vitest 5) y `"type": "module"` en `package.json`. Pendiente para la 1.6: fijar Node ≥22.12 en `engines`/`.nvmrc`.

### 1.4 — Playwright configurado con test de humo de la home
- Ronda 1: APROBADO
- Commit: 56fd833 test: configure Playwright with home smoke test
- Notas: proyectos `chromium` y `mobile-chromium` (375 px). Carga opcional de `.env.local` con `process.loadEnvFile`.

### 1.5 — scripts/check-guidelines.sh
- Ronda 1: APROBADO (check:guidelines falla solo por SEC-02, esperado hasta la 1.6)
- Commit: 0e85c61 chore: add automated guidelines check script
- Notas: DB-05 y UI-01 son informativas; TEST-04 falla solo sin comentario justificativo. SEC-02 exige `.env.example` sin valores.

### 1.6 — .gitignore, .env.example, engines y scripts
- Ronda 1: APROBADO (los 8 comandos en verde; check:guidelines 16 OK / 0 FAIL)
- Commit: d86ef5b chore: add .env.example, pin Node version and finish project scripts

**Hito 1 cerrado** — 6 tareas, todas aprobadas en la primera ronda.

## Hito 2 — Auth

### 2.0 — Supabase local con CLI + Docker
- Ronda 1: APROBADO
- Commit: f764a38 chore: set up local Supabase with CLI and Docker
- Notas: la CLI 3.4.0 usa `supabase/config.jsonc` (no TOML); aceptado. Confirmación de email desactivada; realtime/storage/edge/analytics desactivados. Pendiente menor: `seed.sql` referenciado pero inexistente (crear en hito 3 o vaciar `sql_paths`).

### 2.1 — Clientes @supabase/ssr y proxy de sesión
- Ronda 1: APROBADO
- Commit: c54451c feat(auth): add Supabase SSR clients and session proxy protecting private routes
- Notas: `getClaims()` en el proxy; `safeNextPath` anti open redirect. Mejora menor pendiente: copiar cabeceras anti-caché también a la respuesta de redirección (se incluye en la 2.3).

### 2.2 — Esquemas Zod de login y registro
- Ronda 1: APROBADO
- Commit: da7ffb5 feat(auth): add Zod login and signup schemas with Spanish messages
- Notas: zod 4.6.7. `fieldErrors(error, fields)` recibe la lista de campos para evitar `as`. Límite de 72 en caracteres (bcrypt cuenta bytes; posible mejora futura).

### 2.3 — Páginas /login y /registro, cerrar sesión y layout privado
- Ronda 1: APROBADO
- Commit: 257633d feat(auth): add login, signup and logout with accessible forms and private dashboard layout
- Notas: estado de formulario con `notice` (registro con confirmación de email). Layout y página se renderizan en paralelo: en el hito 4 las páginas que lean datos deben apoyarse en RLS o comprobar sesión. Menores pendientes: `logAuthError` podría registrar solo name/message; `FormMessages` sin variante dark. Entorno: el repo en el Escritorio (iCloud) genera duplicados "* 2.ts" en `.next/`.

**Hito 2 cerrado** — 4 tareas (2.0–2.3), todas aprobadas en la primera ronda.

## Hito 3 — Modelo de datos

### 3.1 — Migración de la tabla applications
- Ronda 1: APROBADO (check:guidelines falla solo por DB-02, esperado hasta la 3.2)
- Commit: ccb8cd2 feat(db): add applications table with status and portal enums, constraints and indexes
- Notas: índices `(user_id, status)` y `(user_id, applied_at desc)`; sin índice suelto en `user_id` (cubierto por prefijo). Para la 3.3: `offer_url` exige `http(s)://` en minúsculas y `company`/`position` deben llegar recortados (trim) desde Zod.

### 3.2 — RLS y 4 políticas en applications
- Ronda 1: APROBADO (Testing verificó con mutaciones: select `using (true)` → 3 FAIL; RLS desactivado → 10 FAIL; ambos exit 1)
- Commit: feat(db): enable RLS on applications with per-user policies and RLS test script
- Notas: `revoke all` a anon; `db:test:rls` (15 PASS, sin service role, solo URLs locales). Pendientes de defensa en profundidad: revocar `truncate, references, trigger` a `authenticated` (no explotable vía PostgREST); en el script, distinguir "0 filas" de "permiso denegado" en la comprobación anon; ejecutar `db:test:rls` en CI.

### 3.3 — database.types.ts y esquema Zod de candidatura
- Ronda 1: APROBADO (e2e 8 passed; db:test:rls 15 PASS; database.types.ts sin cambios al regenerar)
- Commit: feat(validation): add application create/update Zod schemas aligned with SQL enums and constraints
- Notas: `src/lib/validation/application.ts`; enums desde `Constants.public.Enums` + test que parsea las migraciones; campos en snake_case asignables a `TablesInsert/Update`; `applied_at` obligatorio en Zod; `portal`/`status` sin default en Zod (aplica el SQL); claves prohibidas se descartan (strip). Para el hito 4: traducir el error del CHECK `applications_salary_order` en ediciones parciales de salario; etiquetas en español de estados/portales. Pendiente: revisar `src/lib/validation/auth.ts` (`abort: true`/`.pipe()` pueden impedir el refine de contraseñas con email vacío).

**Hito 3 cerrado** — 3 tareas (3.1–3.3), todas aprobadas en la primera ronda.

## Hito 4 — CRUD

### 4.1 — Capa de datos de candidaturas
- Ronda 1: APROBADO
- Commit: feat(applications): add typed server data layer for applications CRUD
- Notas: `src/lib/applications/{errors,repository}.ts`; resultado `{ ok, data } | { ok, error }`; sin comprobación de sesión (RLS → 42501 → unauthorized; las Server Actions sí deben comprobarla); update/delete con `.select().maybeSingle()` → 0 filas = not_found. Mejoras sugeridas: afinar grep TS-02 (falsos positivos con "any" en comentarios); paquete `server-only`.

### 4.2–4.5 — Lista, formulario crear/editar, borrado y e2e
- Ronda 1: APROBADO (e2e 12 passed en chromium + mobile-chromium; db:test:rls 15 PASS)
- Commit: feat(applications): add list, create/edit form, accessible delete and CRUD e2e
- Notas: rutas `/dashboard`, `/dashboard/candidaturas/nueva`, `/dashboard/candidaturas/[id]/editar`; Server Actions en `src/lib/applications/actions.ts` (sesión → safeParse → repository; id de update ligado con `.bind`); borrado con `<dialog>` nativo; "hoy" en `Europe/Madrid`. Cambio de plan: el e2e registra su propio usuario (o usa `E2E_USER_*`); la parada del usuario de prueba pasa al hito 9. Pendientes para el hito 8: anunciar "Candidatura borrada" en `aria-live` y fijar el foco tras borrar; pasar el esquema de update al formulario de edición (VAL-01 literal); mover helpers de formulario comunes a `src/components/forms`/`src/lib/forms`; variante oscura de `FormMessages`; paquete `server-only`.

**Hito 4 cerrado** — 2 ciclos (4.1 · 4.2–4.5), ambos aprobados en la primera ronda.

## Hito 5 — Filtros y búsqueda

### 5.1–5.2 — Función pura de filtrado y barra de filtros con estado en la URL
- Ronda 1: APROBADO (e2e 16 passed; db:test:rls 15 PASS)
- Commit: feat(filters): filter applications by status, portal and accent-insensitive company search via URL
- Notas: `src/lib/applications/filter.ts` (NFD + quitar marcas, `includes` sin regex); parámetros `status`, `portal`, `q` (repetido → primero); barra `<form method="get">` que funciona sin JS y con JS hace `router.push` a URL limpia; etiquetas "Filtrar por estado/portal" para no chocar con el formulario de edición (Next 16 deja montada la página anterior). Pendientes para el hito 8: e2e con `javaScriptEnabled: false`; el segundo test de `e2e/filters.spec.ts` no borra la candidatura que crea; centralizar clases de botón/enlace repetidas.

**Hito 5 cerrado** — 1 ciclo, aprobado en la primera ronda.

## Hito 6 — Kanban

### 6.1 + 6.3 (lógica) — Agrupación por estado y updateStatus
- Ronda 1: APROBADO
- Commit: feat(kanban): add status grouping, optimistic status change helpers and updateStatus action
- Notas: `src/lib/applications/kanban.ts` (`groupByStatus`, `planStatusChange`, `apply/revert/settleStatusChange`, estado optimista sobre lista plana); `updateStatusAction(id, status)` en `actions.ts` (revalida `/dashboard`). Para el ciclo 6.2: revalidar también la ruta del tablero si no es `/dashboard`; opcional quitar el `Map` de `groupByStatus` (rama `?? []` inalcanzable) y añadir test con argumentos no string.

### 6.2 + selector — Tablero kanban con @dnd-kit y selector en cada tarjeta
- Ronda 1: RECHAZADO — título del test de `deleteApplicationAction` (`src/lib/applications/actions.test.ts:277`) dice "revalida la lista y el tablero" pero solo revalida la lista; cambio no pedido → devolver el título original ("borra la candidatura y revalida la lista").
- Ronda 2: APROBADO (e2e 18 passed; db:test:rls 15 PASS)
- Commit: feat(kanban): add kanban board with dnd-kit drag and drop and per-card status selector
- Notas: ruta `/dashboard/tablero` (decisión del orquestador; nav Lista/Tablero); `@dnd-kit/core@6.3.1`; arrastre solo desde el asa; teclado salta de columna en columna. Criterios: todos CUMPLEN (8 comandos OK, e2e 18 passed, db:test:rls 15 PASS). Testing comprobó con un e2e propio (no versionado) que create/update/delete no dejan el tablero con datos obsoletos.
- Pendientes para el hito 8: ancho del tablero en escritorio; migrar specs antiguos a `e2e/support/applications.ts`; ids fijos duplicados en formularios nueva/editar con cacheComponents (`id="application-status"`); quitar `?? []` de `groupByStatus`.

**Hito 6 cerrado** — 2 ciclos (6.1+6.3 · 6.2), el segundo aprobado en la ronda 2.

## Hito 7 — Métricas

### 7.1 + 7.2 — Funciones puras de métricas y panel con KPI y gráficos
- Ronda 1: RECHAZADO — contraste en modo oscuro de los gráficos < 3:1 (barra semanal #1d4ed8 2.97:1, "enviada" #52525b 2.57:1 sobre #09090b).
- Ronda 2: APROBADO (paleta única ≥ 3.85:1 en ambos fondos, comprobada en test; e2e 20 passed; db:test:rls 15 PASS)
- Commit: feat(metrics): add metrics page with ISO-week, response-rate and portal-by-status charts and accessible tables
- Notas: `src/lib/metrics/` (semana ISO verificada por Testing contra Python en 1990–2050); respondida = estado ≠ "enviada"; "Procesos activos" = en_proceso + entrevista; serie de las últimas 12 semanas (Europe/Madrid); gráficos `aria-hidden` con tablas visibles como alternativa; `recharts@3.11.1`. Corrección del orquestador: el ejemplo del brief "2027-01-01 en semana 1" era erróneo (es 2026-W53). Posible test intermitente en `test:coverage` (1 fallo en 1 ejecución, no reproducido). Pendientes para el hito 8: tooltip blanco en modo oscuro; vista móvil de la tabla portal × estado; mover `EmptyApplications`/`PRIMARY_LINK_CLASS` a un módulo compartido.

**Hito 7 cerrado** — 1 ciclo, aprobado en la ronda 2.
