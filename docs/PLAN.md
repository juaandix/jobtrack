# Plan de hitos — JobTrack

Cada hito se divide en tareas; cada tarea pasa el ciclo Develop → Testing hasta `APROBADO` y
acaba en un commit. Al cerrar un hito, el orquestador espera el OK del usuario.
⏸ = parada manual del usuario.

Testing ejecuta **siempre** lint, typecheck, format:check, test:coverage, build y
check:guidelines (a partir del hito 1). En cada hito se indica solo lo **específico** que revisa.

---

## Hito 1 — Setup

**Develop**
- 1.1 `create-next-app` (App Router, TS, Tailwind, ESLint, `src/`), `lang="es"`. TS-01 en `tsconfig`.
- 1.2 ESLint estricto (`no-explicit-any`, `jsx-a11y`, `--max-warnings=0`) + Prettier (+ plugin de Tailwind).
- 1.3 Vitest + Testing Library + jsdom con umbrales de cobertura (TEST-01); un test de humo.
- 1.4 Playwright configurado (`e2e/`, arranca `next dev`); test de humo de la home.
- 1.5 `scripts/check-guidelines.sh` con todas las comprobaciones automáticas de DIRECTRICES.
- 1.6 `.gitignore` (`.env*.local`, `coverage`, `playwright-report`…), `.env.example`, scripts de `package.json`.

**Testing comprueba**: que existen y funcionan todos los scripts; flags de TS-01; que un `any`
de prueba hace fallar el lint (lo comprueba leyendo la config, sin tocar código); umbrales
en `vitest.config.ts`; que el script de directrices detecta los patrones; SEC-02.

**Orquestador**: `git init`, rama `main`, primer commit.

## Hito 2 — Auth

Supabase **local** (CLI + Docker) durante los hitos 2–8; el proyecto en la nube se crea en el hito 9.

**Develop**
- 2.0 Supabase local: CLI como devDependency, `supabase init`, scripts `db:start`/`db:stop`/`db:reset`, `.env.local` con la URL y la anon key locales, email sin confirmación en `supabase/config.toml`.
- 2.1 Clientes `@supabase/ssr` (servidor/navegador) en `src/lib/supabase/` y middleware/proxy que refresca sesión y protege rutas privadas.
- 2.2 Esquemas Zod de login/registro + tests.
- 2.3 Páginas `/login` y `/registro` con Server Actions, errores accesibles; botón de cerrar sesión; layout privado con `<nav>`.

**Testing comprueba**: VAL-01/02/04/05, A11Y-01/03, SEC-01/03/04 (sin sesión, `/dashboard`
redirige a `/login`), que no se usa la service role, tests de los formularios con `userEvent`.

## Hito 3 — Modelo de datos

**Develop**
- 3.1 Migración `applications`: `id`, `user_id default auth.uid()`, `company`, `position`, `offer_url`, `portal` (enum), `applied_at`, `salary` (rango opcional min/max o texto acotado), `status` (enum), `notes`, `created_at`, `updated_at` + trigger; índices por `user_id`, `status`.
- 3.2 RLS + 4 políticas `auth.uid() = user_id`.
- 3.3 `database.types.ts` y esquema Zod de candidatura (crear/editar) alineado con los enums + tests.

La migración se aplica en local con `npm run db:reset` (en la nube, en el hito 9).

**Testing comprueba**: DB-01…05 (script RLS), VAL-03 (enums Zod = enums SQL), VAL-04,
TS-04. Revisión manual de que un usuario no puede leer ni escribir filas de otro según las políticas.

## Hito 4 — CRUD

**Develop**
- 4.1 Capa de datos en `src/lib/applications/` (listar, obtener, crear, actualizar, borrar) con resultados tipados.
- 4.2 Lista de candidaturas (tarjetas en móvil, tabla en escritorio) con estados vacío/carga/error.
- 4.3 Formulario crear/editar (mismo componente) con Server Actions validadas.
- 4.4 Borrado con confirmación accesible.
- 4.5 Test e2e: login → crear candidatura → aparece en la lista.

⏸ Crear el usuario de prueba y poner `E2E_USER_EMAIL`/`E2E_USER_PASSWORD` en `.env.local`.

**Testing comprueba**: VAL-02 en todas las acciones, DB-05 (el cliente no envía `user_id`),
A11Y-01/02/03, ARQ-06, TEST-03, TEST-06 (ejecuta `npm run e2e`).

## Hito 5 — Filtros y búsqueda

**Develop**
- 5.1 Función pura de filtrado (estado, portal, texto en empresa, sin distinguir mayúsculas ni tildes) + tests.
- 5.2 Barra de filtros con estado en la URL (`searchParams`), compartible y con botón de limpiar.

**Testing comprueba**: TEST-02 (casos límite: sin resultados, combinaciones, tildes),
A11Y-01, que los filtros sobreviven a recargar la página, ARQ-03.

## Hito 6 — Kanban

**Develop**
- 6.1 Función pura de agrupación por estado (orden de columnas fijo) + tests.
- 6.2 Tablero con `@dnd-kit` (soporta teclado), scroll horizontal en móvil, contador por columna.
- 6.3 Selector de estado en cada tarjeta como alternativa al arrastre; Server Action `updateStatus` con actualización optimista y reversión si falla.

**Testing comprueba**: A11Y-04 (test que cambia el estado con el selector), A11Y-07 (estado
con texto, no solo color), VAL-02 en `updateStatus`, reversión ante error, UI-02.

## Hito 7 — Métricas

**Develop**
- 7.1 Funciones puras: candidaturas por semana ISO (lunes a domingo), tasa de respuesta, distribución de estados por portal + tests.
- 7.2 Panel con tarjetas de KPI y gráficos (Recharts) con alternativa textual.

**Testing comprueba**: TEST-02 (sin datos → 0 % y no `NaN`; semanas sin candidaturas aparecen
a 0; cambio de año), A11Y-08, ARQ-03, cobertura de `src/lib/metrics`.

## Hito 8 — Pulido

**Develop**
- 8.1 Revisión responsive a 375 px, estados vacíos con llamada a la acción, `loading.tsx`/`error.tsx`, `not-found`.
- 8.2 Capturas Playwright a 375 px y 1280 px de las vistas principales.
- 8.3 README en español: qué es, equipo de agentes con diagrama Mermaid, arranque local, despliegue en Vercel, huecos para URL de producción y usuario de prueba.

**Testing comprueba**: UI-01…04, A11Y-05/06, ARQ-04/05, que el README cumple todos los
puntos pedidos y que los pasos de arranque local funcionan tal cual están escritos.

## Hito 9 — Despliegue

⏸ Crear el proyecto de Supabase en la nube (inicio de sesión del usuario), aplicar las migraciones
(`supabase db push`) y configurar email y URLs de redirección.

⏸ Subir el repo a GitHub (lo puedo hacer yo con `gh` si me lo autorizas), importar en
Vercel, configurar las variables de entorno y las URLs de redirección de Supabase Auth.

**Develop**
- 9.1 Ajustes finales que pida el despliegue (si los hay) y README con la URL de producción y el usuario de prueba.

**Testing comprueba**: build de producción, SEC-01 sobre todo el historial
(`git log -p | grep` de patrones de claves), smoke e2e contra la URL de producción
(login + crear candidatura).
