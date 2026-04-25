# `main/nfpDb.ts`

> Deep dive — Group B / B1. Parent: [DEE-13](../../../). Template per [DEE-11](../../../).

## Purpose

`main/nfpDb.ts` defines `NfpCache`, the **in-memory key-value store of computed No-Fit Polygons** used by the placement engine in `main/background.js`. Because NFP computation is the dominant cost in nesting (Minkowski sum / native addon), caching pair NFPs across genetic-algorithm generations is what makes the GA viable. The class is small (68 lines) and intentionally so — it is a `Record<string, Nfp | Nfp[]>` with defensive cloning on read and write.

It is the only `.ts` file in B1 (the rest of B1 is plain `.js`). It compiles to `build/nfpDb.js`, which `main/background.js` imports as `NfpCache`.

## Public surface

```ts
type Nfp = Point[] & { children?: Point[][] };

export interface NfpDoc {
  A: string;
  B: string;
  Arotation: number | string;
  Brotation: number | string;
  Aflipped?: boolean;
  Bflipped?: boolean;
  nfp: Nfp | Nfp[];
}

export class NfpCache {
  has(obj: NfpDoc): boolean;
  find(obj: NfpDoc, inner?: boolean): Nfp | Nfp[] | null;
  insert(obj: NfpDoc, inner?: boolean): void;
  getCache(): Record<string, Nfp | Nfp[]>;
  getStats(): number;          // entry count
}
```

`Nfp` is a polygon (array of `Point`) with an optional `children` array carrying inner-NFP polygons (used for hole fitting). The whole structure is value-cloned on `find` and `insert` to avoid aliasing.

## IPC / global side-effects

None directly. The cache is instantiated in `main/background.js#window.onload` as `window.db = new NfpCache()` and persists for the lifetime of the hidden background renderer process.

## Dependencies

**In**: only `main/background.js` (via the compiled `../build/nfpDb.js`).

**Out**: `Point` from `./util/point.js` (compiled `main/util/point.ts`).

## Invariants & gotchas

- **Key derivation is intentionally narrow** (`makeKey`):

  ```
  ${A}-${B}-${parseInt(Arotation)}-${parseInt(Brotation)}-${Aflipped?1:0}-${Bflipped?1:0}
  ```

  - `A` / `B` are caller-supplied strings — `background.js` passes `Asource` / `Bsource` (the part-source index). Two parts with the same `source` collide intentionally; that's the cache hit you want.
  - `parseInt(rotation)` truncates fractional degrees. NFPs computed for `30°` and `30.5°` would collide. `background.js` only ever uses integer multiples of `360 / config.rotations`, so this is currently safe.
  - `Aflipped` / `Bflipped` are part of the schema but `background.js` does not currently set them — they default to `false` and the corresponding bit in the key is always `0`. Re-introducing flipping requires no schema change here, but you must populate the field before lookup.

- **Defensive cloning** — every `find` returns a deep copy (new `Point` objects, new `children` arrays); every `insert` stores a deep copy. This matters because the NFP gets translated/rotated downstream during placement; without the clone the cached entry would drift.

- **No eviction.** `Record<string, …>` grows monotonically until the hidden renderer is destroyed (which happens on `background-stop` in `main.js#createBackgroundWindows` reset path). Memory is roughly `O(parts² × rotations²)` per process. Fine for typical desktop workloads (hundreds of parts, 4 rotations); not safe for adversarial input.

- **No persistence.** Restarting the app or the background renderer re-runs every NFP. There is no on-disk cache despite the `Db` suffix in the filename.

- **`inner` flag**: `find/insert` accept `inner?: boolean` which, when truthy, treats the value as `Nfp[]` and clones each element. The caller needs to know which mode applies — pass the same flag at insert and find time.

- **`makeKey` ignores `inner`**: the second arg `_inner` is unused (note the underscore prefix). Inner and outer NFPs for the same part pair would key the same. In practice `background.js` keeps them in separate logical paths and this hasn't bitten yet, but if you start mixing them through one cache instance you'll need to extend the key.

- **TypeScript `Nfp = Point[] & { children?… }` is an intersection** — `Point[]` carries extra properties via array-prototype augmentation. This lines up with the rest of the codebase, where polygon arrays carry `id`, `source`, `bounds`, etc., as ad-hoc properties.

## Known TODOs

- `_inner` parameter on `makeKey` is unused — either remove or wire it into the key (would invalidate any future on-disk cache).
- No eviction policy. Add an LRU layer (e.g. via `lru-cache`) only when a real workload pushes the heap.
- No persistence — could land on-disk caching keyed by SVG content hash.

## Extension points

- **Per-pair statistics** — `getStats()` returns count today. Extending to `{ count, hitRate, byteSize }` is a contained change.
- **Eviction** — wrap `db` with an LRU map; `find/insert/has` already encapsulate access.
- **Typed key** — replace the string key with an interned object once flipping is re-introduced.

## Test coverage

- Indirectly via the Playwright nesting run: the cache is consulted on every `background-start` and a non-trivial nesting will exercise both `insert` and `find`.
- No unit tests. Easy candidate — `NfpCache` has no DOM or Electron dependencies and would be the cleanest first step toward a Node-side test harness for the engine.
