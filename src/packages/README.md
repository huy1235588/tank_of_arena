# Deep Module Packages (`src/packages/`)

Every package under `src/packages/<name>/` is a **deep module** enforced by `dependency-cruiser` (`npm run lint:boundaries`). Import a package **only through its entry points (its root files)**, never reaching into its subfolders.

```text
src/packages/
  <name>/
    index.ts        ← public entry point (importable from outside)
    client.ts       ← additional entry point (prefer small entry points over a giant barrel)
    lib/            ← private implementation (hidden from outside, free to import each other)
    tests/          ← private co-located tests & fixtures
```

## Avoid Barrel Files

Expose several small, focused root entry points (`index.ts`, `client.ts`, `server.ts`) instead of re-exporting an entire subfolder tree through one giant barrel `index.ts`.

## Four Enforced Rules (`npm run lint:boundaries`)

1. **`entrypoint-boundary-from-app`:** Application code outside `src/packages/` may import only a package's root entry points (`src/packages/<name>/*.ts`), never any file inside its subfolders (`lib/`, `tests/`, etc.).
2. **`entrypoint-boundary-across-packages`:** Files inside a package may import each other freely, but may reach _other_ packages only through their root entry points.
3. **`tests-through-entrypoints`:** Files under `src/packages/<name>/tests/` must exercise packages strictly through their root entry points (plus their own `tests/` fixtures), never importing `lib/` internals directly.
4. **`no-circular`:** Dependency cycles are forbidden across the codebase.
