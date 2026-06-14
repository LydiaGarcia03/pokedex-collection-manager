# CLAUDE.md — Pokédex Collection Manager (Static)

## What This Project Is

Static version of the Pokédex Collection Manager, deployable on GitHub Pages with no backend.
Functionally identical to the `pokedex` (Spring Boot) project but runs entirely in the browser.

**GitHub Pages URL:** `https://LydiaGarcia03.github.io/pokedex-collection-manager-static/`
**Source repository:** `https://github.com/LydiaGarcia03/pokedex-collection-manager-static`

---

## How This Differs From the `pokedex` Project

| Feature | `pokedex` (Spring Boot) | `pokedex-static` (this) |
|---------|-------------------------|--------------------------|
| Backend | Java / Spring Boot | None |
| Data source | REST API → pokedex.json | `public/data/pokemon-compiled.json` |
| Search/filter | Server-side | Client-side (same logic) |
| Pokemon images | CDN (runtime) | Local files in `public/images/pokemon/` |
| TCG card images | CDN via backend proxy | Local files in `public/images/tcg/` |
| Game icons | CDN (runtime) | Local files in `public/images/games/` |
| TCG metadata | TCGdex API (runtime, via backend) | `public/data/tcg-cards.json` (pre-fetched) |
| Deployment | `./gradlew bootRun` | GitHub Pages (static HTML/JS/CSS) |

---

## Project Setup (First Time)

Run these steps in order. Each step depends on the previous one.

### Step 1 — Install dependencies
```powershell
npm install
```

### Step 2 — Compile Pokémon data
Reads source JSON files from the sibling `../pokedex/src/main/resources/data/` directory
and produces `public/data/pokemon-compiled.json`.

```powershell
npm run compile-data
```

**Requires:** The `pokedex` project must exist at `../pokedex/` with its data files generated.
If `pokemon-extras.json` or `learnsets.json` are missing, run `generate-pokedata.mjs` there first.

### Step 3 — Collect TCG card metadata
Calls TCGdex API (~900 requests, ~5 minutes) and produces:
- `public/data/tcg-cards.json` — card catalog with local image URLs (committed to repo)
- `public/data/tcg-download-manifest.json` — source URLs for downloading (NOT committed)

```powershell
npm run collect-tcg
```

### Step 4 — Download all images
Downloads ~1100 Pokémon sprites + ~18300 TCG card images (~400MB total).
Idempotent — skips files already downloaded.

```powershell
npm run download-images
```

Estimated time: ~20 minutes.

### Step 5 — Commit images and data
```powershell
git add public/data/pokemon-compiled.json
git add public/data/tcg-cards.json
git add public/data/type-chart.json
git add public/images/
git commit -m "Add compiled data and local images"
git push
```

GitHub Actions will build and deploy automatically on push to `main`.

---

## Development

```powershell
npm run dev
```

Runs at `http://localhost:5175`. No backend needed.

**Note:** During `npm run dev`, `BASE_URL` is `/` so data is fetched from `/data/pokemon-compiled.json`.
In production, `BASE_URL` is `/pokedex-collection-manager-static/`.

---

## Critical Rules

1. **Never change `POKEDEX_COLLECTION_V2` format** — existing user exports must still import correctly
2. **Never remove `commitPendingCleanup` logic** in `useCollection.ts`
3. **No backend** — do not add server-side code
4. **ID is the canonical identifier** — never use Pokémon name for persistence
5. **All CSS goes in `src/styles.css`** — do not create additional CSS files
6. **Ask before architectural changes** — new dependencies, format changes, layout restructuring

---

## File Map — What Changed vs `pokedex/frontend/`

| File | Status | Change |
|------|--------|--------|
| `src/api/pokemonApi.ts` | **Modified** | Loads local JSON; no backend calls |
| `src/pages/PokedexPage.tsx` | **Modified** | Client-side filtering; no detail fetch |
| `src/components/PokemonTcgTab.tsx` | **Modified** | Uses `pokemon.name` for TCG lookup |
| `vite.config.ts` | **Modified** | No proxy; `base: '/pokedex-collection-manager-static/'` |
| `package.json` | **Modified** | Removed `axios`; added setup scripts |
| `scripts/compile-pokedata.mjs` | **New** | Compiles source data into static JSON |
| `scripts/collect-tcg-data.mjs` | **New** | Fetches TCG card metadata from TCGdex |
| `scripts/download-images.mjs` | **New** | Downloads all images locally |
| `.github/workflows/deploy.yml` | **New** | GitHub Pages deployment via Actions |
| All other `src/` files | **Unchanged** | Identical to `pokedex/frontend/src/` |

---

## Data Files

| File | Size (est.) | When Generated | Committed? |
|------|-------------|----------------|------------|
| `public/data/pokemon-compiled.json` | ~10MB | `npm run compile-data` | Yes |
| `public/data/tcg-cards.json` | ~5MB | `npm run collect-tcg` | Yes |
| `public/data/type-chart.json` | <10KB | `npm run compile-data` | Yes |
| `public/data/tcg-download-manifest.json` | ~3MB | `npm run collect-tcg` | **No** (gitignored) |
| `public/data/download-errors.json` | varies | `npm run download-images` | Optional |
| `public/images/pokemon/*.webp` | ~44MB | `npm run download-images` | Yes |
| `public/images/pokemon-xl/*.webp` | ~88MB | `npm run download-images` | Yes |
| `public/images/games/*.png` | ~1MB | `npm run download-images` | Yes |
| `public/images/tcg/**/*.webp` | ~268MB | `npm run download-images` | Yes |

**Total committed size: ~406MB** — within GitHub Pages 1GB limit.

---

## Change Logging

Every change made to this project must be recorded in `.ai/changes-log.md`.

For each change, add an entry with:
- Date (YYYY-MM-DD)
- Files modified
- What was changed
- Why it was changed
