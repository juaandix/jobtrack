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
