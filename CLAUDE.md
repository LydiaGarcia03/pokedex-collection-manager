# CLAUDE.md — Pokédex Collection Manager (Static)

## What This Project Is

Static version of the Pokédex Collection Manager, deployable on GitHub Pages with no backend.
Functionally identical to the `pokedex` (Spring Boot) project but runs entirely in the browser.

**GitHub Pages URL:** `https://LydiaGarcia03.github.io/pokedex-collection-manager/`
**Source repository:** `https://github.com/LydiaGarcia03/pokedex-collection-manager`

**Nota:** o diretório local do projeto se chama `pokedex-static`, mas o repositório no GitHub se
chama `pokedex-collection-manager` (sem sufixo "-static") — por isso a URL do GitHub Pages e o
`base` do `vite.config.ts` usam `/pokedex-collection-manager/`, não `/pokedex-collection-manager-static/`.
⚠️ O `git remote -v` local ainda aponta para `pokedex-collection-manager-static.git` (nome antigo,
provavelmente redirecionado pelo GitHub após um rename) — considerar atualizar com
`git remote set-url origin https://github.com/LydiaGarcia03/pokedex-collection-manager.git` para
evitar depender do redirect.

---

## Regras de Trabalho do Agente

Antes de qualquer alteração neste projeto, ler e seguir **`.ai/rules.md`**. Esse arquivo define
como o agente deve trabalhar aqui: manter `.ai/changes-log.md` e este `CLAUDE.md` atualizados,
garantir compatibilidade contínua com deploy gratuito no GitHub Pages, seguir clean code, sempre
perguntar antes de decisões de projeto, e sempre apresentar um plano de entrega para mudanças
grandes.

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
| Cloud sync | Backend database | Firebase Auth + Firestore (client-side BaaS, no server maintained by this project) |

---

## Funcionalidades

### Navegação e coleção
- Navegação por todos os ~1242 Pokémon (incluindo formas regionais, Mega Evolution e Gigantamax)
- Busca por nome/número, filtro por geração (Gen I–IX)
- Detalhes por Pokémon: stats, efetividade de tipo, habilidades, learnsets, dados de espécie
- Cartas TCG por Pokémon com imagens locais
- Jogos em que cada Pokémon aparece
- Marcar Pokémon/cartas/jogos como coletados, modo "Toggle Collection Visibility"
- Marcar uma carta TCG já selecionada como **foil** (badge de "sparkle" com gradiente roxo-neon
  metálico no canto inferior-esquerdo do card, só aparece depois que a carta está marcada — ver
  `src/components/PokemonTcgTab.tsx`)
- Exportar/importar coleção como arquivo de texto (formato `POKEDEX_COLLECTION_V2` — ver Critical Rules)

### Sincronização em nuvem (Firebase)
- Login/cadastro por e-mail e senha via **Firebase Authentication**
- Coleções salvas na nuvem via **Firestore**, sincronizadas entre dispositivos (regras em `firestore.rules`, restritas por `userId`)
- **Firebase App Check + reCAPTCHA v3** protege todas as chamadas ao Firebase contra bots/abuso
- Continua sendo "sem backend próprio": Firebase é um BaaS hospedado pela Google, não um servidor mantido por este projeto — compatível com deploy 100% estático no GitHub Pages (ver Critical Rule #3 e `.ai/rules.md`)
- Requer variáveis de ambiente `VITE_FIREBASE_*` e `VITE_RECAPTCHA_SITE_KEY` (ver `README.md` → Environment Variables), configuradas como secrets do repositório para o GitHub Actions

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
In production, `BASE_URL` is `/pokedex-collection-manager/` (nome do repositório no GitHub).

---

## Critical Rules

1. **Never change `POKEDEX_COLLECTION_V2` format** — existing user exports must still import correctly
2. **Never remove `commitPendingCleanup` logic** in `useCollection.ts`
3. **No server-side code maintained by this project** — client-side BaaS (e.g. Firebase Auth/Firestore) is acceptable since it requires no server we host or maintain, but it must never require a backend the user has to run
4. **ID is the canonical identifier** — never use Pokémon name for persistence
5. **All CSS goes in `src/styles.css`** — do not create additional CSS files
6. **Ask before architectural changes** — new dependencies, format changes, layout restructuring
7. **Follow `.ai/rules.md`** — changes-log discipline, CLAUDE.md upkeep, GitHub Pages compatibility, clean code, ask-before-deciding, delivery plans for large changes

---

## File Map — What Changed vs `pokedex/frontend/`

| File | Status | Change |
|------|--------|--------|
| `src/api/pokemonApi.ts` | **Modified** | Loads local JSON; no backend calls |
| `src/pages/PokedexPage.tsx` | **Modified** | Client-side filtering; no detail fetch |
| `src/components/PokemonTcgTab.tsx` | **Modified** | Uses `pokemon.name` for TCG lookup |
| `vite.config.ts` | **Modified** | No proxy; `base: '/pokedex-collection-manager/'` (nome do repo no GitHub) |
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

Full working rules for the agent (when to update this file, when to plan first, GitHub Pages
compatibility, clean code) live in **`.ai/rules.md`** — read it before starting any work.
