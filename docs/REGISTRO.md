# Registro de ciclos Develop → Testing

Cada tarea del plan queda anotada aquí con sus rondas de revisión y el commit resultante.

## Decisiones

- 2026-11-25 — Tasa de respuesta: cuenta como respondida toda candidatura cuyo estado no es "enviada" (incluye "descartada").
- 2026-11-25 — Salario: dos campos numéricos opcionales, mínimo y máximo (bruto anual, €), con mínimo ≤ máximo.
- 2026-11-25 — Repositorio de GitHub: pendiente de confirmar en el hito 9.

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
