# Directrices de calidad — JobTrack

Este documento es el contrato entre **Develop** (que lo cumple) y **Testing** (que lo aplica).
Cada directriz tiene un ID, una norma y una forma de verificarla. Testing cita el ID en cada fallo.

Una entrega se **aprueba** solo si cumple todas las directrices que le aplican y todos los
comandos de la sección QA terminan sin errores.

> Las comprobaciones `grep` asumen que el código vive en `src/`, los tests e2e en `e2e/` y las
> migraciones en `supabase/migrations/`. Dentro de las tablas, `\|` es solo el escape de Markdown:
> al ejecutar el comando se escribe `|`.
>
> Todas las comprobaciones automáticas (los `grep` de este documento y el script de DB-02) están
> reunidas en `scripts/check-guidelines.sh`, que se ejecuta con `npm run check:guidelines` y
> termina con código distinto de 0 si alguna falla. Testing lo ejecuta en cada revisión; la
> revisión manual cubre el resto.

---

## QA — Comandos que deben pasar

| ID | Norma | Verificación |
| --- | --- | --- |
| QA-01 | Lint sin errores **ni warnings**. | `npm run lint` (configurado con `--max-warnings=0`) termina con código 0. |
| QA-02 | Typecheck sin errores. | `npm run typecheck` (`tsc --noEmit`) termina con código 0. |
| QA-03 | Código formateado con Prettier. | `npm run format:check` termina con código 0. |
| QA-04 | Todos los tests pasan y no hay tests desactivados. | `npm run test:coverage` termina con código 0. `grep -rnE '\.(skip\|only)\(\|\bxit\(\|\bxdescribe\(' src e2e` no devuelve nada. |
| QA-05 | El proyecto compila para producción. | `npm run build` termina con código 0. |
| QA-06 | No se desactivan reglas para esquivar errores. | `grep -rnE 'eslint-disable\|@ts-ignore\|@ts-nocheck' src e2e` no devuelve nada. `@ts-expect-error` solo en tests y con comentario que explique el motivo. |

## TS — TypeScript

| ID | Norma | Verificación |
| --- | --- | --- |
| TS-01 | `tsconfig.json` con `strict: true`, `noUncheckedIndexedAccess: true` y `noImplicitOverride: true`. | Leer `tsconfig.json`. |
| TS-02 | Prohibido `any`, explícito o implícito. Para datos desconocidos se usa `unknown` y se estrecha. | Regla ESLint `@typescript-eslint/no-explicit-any: "error"`. `grep -rnE ':\s*any\b\|<any>\|\bas any\b\|any\[\]' src e2e` no devuelve nada. |
| TS-03 | Sin aserciones para silenciar al compilador: no `as unknown as X`, no `!` de non-null salvo en tests. | `grep -rnE 'as unknown as' src` no devuelve nada; regla `@typescript-eslint/no-non-null-assertion: "error"` fuera de tests. |
| TS-04 | Los tipos de la base de datos salen de un único fichero `src/lib/database.types.ts` (generado con `supabase gen types` o mantenido a mano igual que la migración). Los tipos de formulario se derivan de Zod con `z.infer`. | Revisión: no hay interfaces duplicadas a mano para la misma entidad. |
| TS-05 | Funciones exportadas con tipo de retorno explícito en `src/lib/`. | Regla `@typescript-eslint/explicit-module-boundary-types` en `src/lib/**`. |

## VAL — Validación con Zod

| ID | Norma | Verificación |
| --- | --- | --- |
| VAL-01 | Cada formulario tiene un esquema Zod en `src/lib/validation/`. El mismo esquema se usa en cliente y en servidor. | Revisión: cada `<form>` de `src/` tiene su esquema importado. |
| VAL-02 | Toda Server Action y Route Handler valida su entrada con `safeParse` **antes** de tocar la base de datos, y devuelve errores por campo si falla. | Revisión de cada fichero con `"use server"` y de cada `route.ts`. |
| VAL-03 | Los valores de `estado` y `portal` son `z.enum` definidos una sola vez y coinciden con los enums de la migración SQL. | Comparar `src/lib/validation/*` con `supabase/migrations/*.sql`. |
| VAL-04 | Cada esquema tiene tests con entradas válidas e inválidas (al menos: campo obligatorio vacío, formato incorrecto, valor fuera del enum, límites de longitud/rango). | Existe `*.test.ts` junto a cada esquema y cubre esos casos. |
| VAL-05 | Los errores de validación se muestran junto al campo, en español, y no se pierde lo que el usuario escribió. | Test de componente que envía datos inválidos y comprueba el mensaje y el valor. |

## A11Y — Accesibilidad

| ID | Norma | Verificación |
| --- | --- | --- |
| A11Y-01 | Cada campo de formulario tiene un `<label>` asociado (`htmlFor`/`id` o envolvente). No se usa `placeholder` como única etiqueta. | `eslint-plugin-jsx-a11y` (config `recommended`) activo; tests localizan los campos con `getByLabelText`. |
| A11Y-02 | Todo elemento interactivo es un `<button>`, `<a>` o control nativo, o tiene `role` + soporte de teclado. Los botones de solo icono tienen `aria-label`. | `jsx-a11y`; revisión de `onClick` en `div`/`span`: `grep -rn '<div[^>]*onClick' src` no devuelve nada. |
| A11Y-03 | Los errores de formulario se enlazan con `aria-describedby` y el campo lleva `aria-invalid`. Los mensajes globales (éxito/error) usan `role="alert"` o `aria-live`. | Test de componente que comprueba los atributos. |
| A11Y-04 | El cambio de estado en el kanban es posible **sin arrastrar** (selector o teclado). | Test de componente que cambia el estado con el selector. |
| A11Y-05 | Foco visible en todos los controles (no `outline-none` sin `focus-visible:` equivalente). | `grep -rn 'outline-none' src` y comprobar que cada aparición va con `focus-visible:ring` o similar. |
| A11Y-06 | Estructura semántica: un `<h1>` por página, `<main>`, `<nav>`, `lang="es"` en `<html>`. | Revisión de `layout.tsx` y páginas. |
| A11Y-07 | Contraste de texto ≥ 4.5:1 (texto normal). No se transmite información solo con color (los estados llevan texto). | Revisión de la paleta de Tailwind usada. |
| A11Y-08 | Los gráficos de métricas tienen alternativa textual (resumen o tabla accesible). | Revisión del componente de métricas. |

## DB — Base de datos y seguridad de datos

| ID | Norma | Verificación |
| --- | --- | --- |
| DB-01 | Todo cambio de esquema es una migración nueva en `supabase/migrations/YYYYMMDDHHMMSS_nombre.sql`. Las migraciones ya commiteadas no se modifican. | `git diff --name-status HEAD -- supabase/migrations` solo muestra ficheros `A` (añadidos), nunca `M`. |
| DB-02 | **RLS activado en todas las tablas** del esquema `public`. | Script de abajo no imprime nada. |
| DB-03 | Cada tabla con datos de usuario tiene `user_id uuid not null references auth.users(id) on delete cascade` y políticas para `select`, `insert`, `update` y `delete` restringidas a `auth.uid() = user_id` (con `with check` en `insert` y `update`). | Revisión de la migración: 4 políticas por tabla. |
| DB-04 | Restricciones en la base de datos, no solo en la app: enums para estado y portal, `not null` en campos obligatorios, `check` en salario ≥ 0 y longitudes máximas. | Revisión de la migración. |
| DB-05 | El cliente nunca envía `user_id`: lo pone la base de datos (`default auth.uid()`) o el servidor desde la sesión. | `grep -rn 'user_id' src` solo aparece en tipos y lecturas, no en datos de formularios. |

Script de verificación de DB-02:

```bash
for t in $(grep -hoiE 'create table (if not exists )?(public\.)?[a-z_]+' supabase/migrations/*.sql \
           | awk '{print $NF}' | sed 's/^public\.//'); do
  grep -qiE "alter table (public\.)?$t enable row level security" supabase/migrations/*.sql \
    || echo "SIN RLS: $t"
done
```

## SEC — Secretos y seguridad

| ID | Norma | Verificación |
| --- | --- | --- |
| SEC-01 | Ninguna clave, token o contraseña en ficheros versionados. | `git ls-files -z -co --exclude-standard \| xargs -0 grep -HnE 'eyJ[A-Za-z0-9_-]{20,}\|sb_secret_\|sb_publishable_[A-Za-z0-9]\|service_role\|SUPABASE_SERVICE_ROLE' 2>/dev/null \| grep -v '^docs/' \| grep -vE '^package-lock\.json:[0-9]+:\s*"integrity": "sha'` no devuelve nada. (Se excluyen solo las líneas `integrity` del lockfile: son hashes sha512 que pueden contener `eyJ` por azar.) |
| SEC-02 | `.env.local` y `.env*.local` están en `.gitignore`; `.env.example` existe, contiene todos los nombres de variables usados y ningún valor real. | `git check-ignore .env.local` lo devuelve. Cada `process.env.X` de `src/` aparece en `.env.example`. |
| SEC-03 | Solo se usan la URL y la clave pública de Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). La service role key no se usa en la app. | `grep -rn 'SERVICE_ROLE' src` no devuelve nada. |
| SEC-04 | Las rutas privadas están protegidas en el servidor (middleware/proxy + comprobación de sesión en la página o acción), no solo ocultando enlaces. | Test o revisión: sin sesión, `/dashboard` redirige a `/login`. |
| SEC-05 | Credenciales del usuario de prueba e2e solo por variables de entorno (`E2E_USER_EMAIL`, `E2E_USER_PASSWORD` en local; `E2E_PROD_USER_EMAIL`, `E2E_PROD_USER_PASSWORD` para el smoke de producción). | `grep -rn '@' e2e` no muestra emails literales con contraseña. |

## TEST — Tests

| ID | Norma | Verificación |
| --- | --- | --- |
| TEST-01 | Cobertura mínima en `src/lib/**` (excluyendo `src/lib/supabase/**` y `*.types.ts`): **80 % líneas, 80 % funciones, 80 % ramas**. Los umbrales están en `vitest.config.ts` y hacen fallar el comando si no se alcanzan. | `npm run test:coverage`; leer `coverage.thresholds` en `vitest.config.ts`. |
| TEST-02 | Toda función nueva de `src/lib/` tiene tests, incluidos casos límite (listas vacías, fechas en el límite de semana, divisiones por cero en tasas…). | Existe `*.test.ts` para cada módulo. |
| TEST-03 | Los componentes interactivos (formularios, filtros, kanban, selector de estado) tienen tests con Testing Library que prueban comportamiento con `userEvent`, no solo que se renderizan. | Revisión de `*.test.tsx`. |
| TEST-04 | Los tests consultan por rol o etiqueta (`getByRole`, `getByLabelText`). `getByTestId` solo si no hay alternativa, justificado en comentario. | `grep -rn 'getByTestId' src` y revisar cada caso. |
| TEST-05 | Los tests unitarios no llaman a Supabase real: se mockea el cliente o se testea la lógica pura. | Revisión. |
| TEST-06 | Existe un test e2e con Playwright del flujo: login → crear candidatura → verla en la lista. | `e2e/*.spec.ts`; `npm run e2e` pasa con `.env.local` configurado. |

## ARQ — Arquitectura y estilo

| ID | Norma | Verificación |
| --- | --- | --- |
| ARQ-01 | Estructura: `src/app` (rutas), `src/components` (UI), `src/lib` (lógica pura, validación, acceso a datos), `supabase/migrations`, `e2e`. | Revisión del árbol. |
| ARQ-02 | Server Components por defecto. `"use client"` solo en componentes con estado, eventos o APIs del navegador. | `grep -rln '"use client"' src` y revisar que cada uno lo necesita. |
| ARQ-03 | La lógica de negocio (métricas, agrupación kanban, filtros) son funciones puras en `src/lib/`, no dentro de componentes. | Revisión. |
| ARQ-04 | Sin `console.log` en el código de la app. | `grep -rn 'console\.log' src` no devuelve nada. |
| ARQ-05 | Sin código muerto ni comentado, sin ficheros fuera del alcance de la tarea. | Revisión del diff. |
| ARQ-06 | Estados de carga, vacío y error contemplados en cada vista que lee datos. | Revisión; `loading.tsx`/`error.tsx` o equivalentes. |

## UI — Diseño

| ID | Norma | Verificación |
| --- | --- | --- |
| UI-01 | Estilos solo con Tailwind (sin CSS suelto salvo `globals.css`, sin estilos inline salvo valores dinámicos). | `grep -rn 'style={{' src` y revisar. |
| UI-02 | Mobile-first y usable a 375 px de ancho sin scroll horizontal de página (el kanban puede hacer scroll horizontal dentro de su contenedor). | Revisión de clases responsive; en pulido, captura con Playwright a 375 px. |
| UI-03 | Textos de la interfaz en español; identificadores del código en inglés. | Revisión. |
| UI-04 | Objetivos táctiles de al menos 44×44 px en móvil para botones principales. | Revisión de clases (`min-h-11`, `p-3`…). |
