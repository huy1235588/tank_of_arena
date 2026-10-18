# Tanks of Arena

A 2D top-down tactical tank arena game (BangBang-like) built with **TypeScript + Vite + PixiJS + Vitest** using an AI-First, pure deterministic simulation architecture.

## Quick Start

```bash
npm install
npm run dev        # Start Vite dev server at http://localhost:5173
npm test           # Run headless unit & sim-purity tests (Vitest)
npm run typecheck  # Strict TypeScript check (tsc --noEmit)
npm run build      # Typecheck + production bundle
```

## Controls

| Input | Action |
| :--- | :--- |
| `W` `A` `S` `D` / Arrow Keys | Move tank (`Hull` steers toward movement vector) |
| Mouse Cursor | Aim (`Turret` rotates independently in world space) |
| Left Mouse Button | Fire primary weapon |
| `Q`, `E`, `Space` | Activate Tank Skills (Slots 1, 2, 3) |
| `F3` | Toggle Debug Overlay (hitboxes, orange `Hull` vector, green `Turret` vector, telemetry) |

## Technical Documentation (AI-First)

- **[`AGENTS.md`](./AGENTS.md):** Iron rules, verification commands, and context pointers for AI Agents.
- **[`GLOSSARY.md`](./GLOSSARY.md):** Ubiquitous domain language and canonical TypeScript type definitions.
- **[`docs/00-overview/architecture.md`](./docs/00-overview/architecture.md):** Unidirectional data flow, directory structure, fixed 60Hz tick pipeline, and core performance optimizations.
- **[`docs/01-adr/`](./docs/01-adr/):** Architecture Decision Records (`001` through `007`).
- **[`docs/02-specs/`](./docs/02-specs/):** Detailed subsystem specifications (ECS & Physics, Data-Driven Effects, Rendering & VFX, AI Bot Brain, Match Lifecycle & Network).
- **[`docs/03-tickets/00-index.md`](./docs/03-tickets/00-index.md):** Milestone M1–M7 roadmap broken down into 30 Tracer-Bullet Tickets (`T01`–`T30`) with dependency graph and acceptance criteria.
