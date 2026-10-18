# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root.
- **`docs/01-adr/`**: read ADRs (`001`–`007`) that touch the area you're about to work in.
- **`docs/02-specs/`**: read the subsystem specification relevant to your task.

If any optional files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates or updates them lazily when terms or decisions actually get resolved.

## File structure

Single-context repo:

```text
/
├── AGENTS.md
├── GLOSSARY.md
├── docs/
│   ├── 00-overview/
│   │   └── architecture.md
│   ├── 01-adr/
│   │   ├── 001-deterministic-sim.md
│   │   └── ...
│   ├── 02-specs/
│   ├── 03-tickets/
│   └── agents/
└── src/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `GLOSSARY.md`. Don't drift to synonyms the glossary explicitly avoids (`_Avoid_`).

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR in `docs/01-adr/`, surface it explicitly rather than silently overriding:

> _Contradicts ADR-003 (Zero-GC Memory Model), but worth reopening because…_
