# Issue tracker: Local Markdown

Issues, tracer-bullet tickets, and specs for this repo live as local markdown files in `docs/03-tickets/` (roadmap milestones `M1`–`M7`, tickets `T01`–`T30`) and `.scratch/<feature-slug>/` for ad-hoc feature work.

## Conventions

- Milestone roadmap tickets live in `docs/03-tickets/` (`00-index.md` + `m1..m7-*.md`).
- Ad-hoc feature work uses one directory per feature: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md` (or `docs/02-specs/*.md` for core subsystems)
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`, never a single combined tickets file
- Triage state is recorded as a `Status:` line near the top of each issue/ticket (`completed`, `ready-for-agent`, `blocked`, or see `triage-labels.md` for canonical triage role strings)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/issues/` (creating the directory if needed) or update the corresponding milestone file under `docs/03-tickets/`.

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path (`docs/03-tickets/*.md` or `.scratch/<feature-slug>/issues/<NN>-<slug>.md`).

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md` (the Notes / Decisions-so-far / Fog body).
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved` (or `completed`).
- **Frontier**: scan `docs/03-tickets/` or `.scratch/<effort>/issues/` for tickets that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.
