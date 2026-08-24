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
- Cartas TCG por Pokémon com imagens locais — cartas que o TCGdex ainda não tem imagem (comum em
  sets/promos muito recentes) buscam a imagem no Serebii como fallback (best-effort; o que não
  bate aparece como placeholder nome/set/número em vez de ficar escondido — ver
  `.ai/changes-log.md` 2026-08-24 e `scripts/fetch-serebii-tcg-images.mjs`)
- Jogos em que cada Pokémon aparece — cada versão de um par (ex. Scarlet vs Violet) mostra sua
  lista correta e distinta de exclusivos (ver `.ai/changes-log.md` 2026-08-19)
- Filtro de DLC (Isle of Armor, Crown Tundra, The Teal Mask, The Indigo Disk) — habilitado só
  quando exatamente um jogo está selecionado no filtro de Game e esse jogo tem DLC conhecido
  (hoje: Sword/Shield e Scarlet/Violet); dado de origem via scraping do Serebii, não existe em
  nenhuma API já usada no projeto (ver `.ai/changes-log.md` 2026-08-19 e
  `scripts/fetch-serebii-dlc-reference.mjs`)
- Filtro de Tipo inclui, além dos 18 tipos elementares, as categorias Legendary, Mythical e
  Starter (linha evolutiva inteira, ex. Bulbasaur/Ivysaur/Venusaur) — `starter` é calculado em
  `scripts/compile-pokedata.mjs` a partir de uma tabela fixa de dex numbers por geração (não vem
  do projeto `pokedex`); `legendary`/`mythical` já existiam nos dados (ver `.ai/changes-log.md`
  2026-08-24)
- Marcar Pokémon/cartas/jogos como coletados, modo "Toggle Collection Visibility"
- Marcar uma carta TCG já selecionada como **foil** (badge de "sparkle" com gradiente roxo-neon
  metálico no canto inferior-esquerdo do card, só aparece depois que a carta está marcada — ver
  `src/components/PokemonTcgTab.tsx`)
- Exportar/importar coleção como arquivo de texto (formato `POKEDEX_COLLECTION_V2` — ver Critical Rules)

### PWA (instalável no celular)
- Instalável via "Add to Home Screen"/prompt do navegador — abre em tela cheia, sem barra de
  navegador (`display: standalone`), com ícone e splash screen próprios
- Gerado por `vite-plugin-pwa` (ver `vite.config.ts`) — manifest + service worker (Workbox)
  100% estáticos, nenhuma mudança necessária no `.github/workflows/deploy.yml`
- Cache do app shell (JS/CSS/HTML, poucos MB) é pré-cacheado no build; imagens
  (`/images/**`) e dados compilados (`/data/*.json`) são cacheados sob demanda em runtime
  (`CacheFirst` e `StaleWhileRevalidate` respectivamente) conforme a Lydia navega — decisão
  deliberada para não tentar pré-cachear os ~570MB de imagens/cartas TCG de uma vez (ver
  `.ai/changes-log.md` 2026-08-24)
- Ícones em `public/pwa-*.png`, `public/maskable-icon-512x512.png`,
  `public/apple-touch-icon-180x180.png`, `public/favicon.ico` — gerados a partir de
  `public/pokedex-favicon.png` via `npx @vite-pwa/assets-generator --preset minimal-2023
  public/pokedex-favicon.png` (não é uma dependência do projeto, só uma ferramenta de geração
  usada pontualmente); re-rodar esse comando se o favicon-fonte mudar

### Sincronização em nuvem (Firebase)
- Login/cadastro por e-mail e senha via **Firebase Authentication**, com reset de senha
  (`sendPasswordResetEmail`) acessível pelo link "Forgot password?" na tela de login — sem
  configuração adicional no Firebase Console (usa o e-mail/action page padrão do Firebase)
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
- `public/data/tcg-cards.json` — card catalog with local image URLs (committed to repo). Cards
  TCGdex hasn't uploaded an image for yet are kept with `imageUrl: null` (not dropped) — see Step
  3b.
- `public/data/tcg-download-manifest.json` — source URLs for downloading (NOT committed)

```powershell
npm run collect-tcg
```

### Step 3b — Fill in missing card images from Serebii (optional, re-run anytime)
TCGdex is sometimes slow to upload images for brand-new sets/promos. This script looks up
whatever `npm run collect-tcg` left as `imageUrl: null` on Serebii's card database instead —
best-effort (see `scripts/fetch-serebii-tcg-images.mjs` for how matching works and its known
gaps: niche/vintage products like McDonald's Collections, Trainer's Kits, and Japan-only sets
often don't match). Whatever's still unresolved after this keeps `imageUrl: null` and shows the
existing name/set/number placeholder in the TCG tab instead of being hidden.

```powershell
npm run fetch-serebii-tcg
```

Run this again on its own whenever you notice new cards without images — no need to re-run
`collect-tcg` first, as long as `tcg-cards.json` already has the `imageUrl: null` entries.

### Step 4 — Download all images
Downloads ~1100 Pokémon sprites + ~19000 TCG card images (~440MB total, TCGdex + Serebii-sourced).
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
| `vite.config.ts` | **Modified** | No proxy; `base: '/pokedex-collection-manager/'` (nome do repo no GitHub); `VitePWA` plugin (manifest + service worker) |
| `package.json` | **Modified** | Removed `axios`; added setup scripts; `vite-plugin-pwa` (devDependency) |
| `scripts/compile-pokedata.mjs` | **New** | Compiles source data into static JSON |
| `scripts/collect-tcg-data.mjs` | **New** | Fetches TCG card metadata from TCGdex |
| `scripts/fetch-serebii-tcg-images.mjs` | **New** | Fills in TCG card images TCGdex is missing, from Serebii |
| `scripts/download-images.mjs` | **New** | Downloads all images locally |
| `.github/workflows/deploy.yml` | **New** | GitHub Pages deployment via Actions |
| All other `src/` files | **Unchanged** | Identical to `pokedex/frontend/src/` |

---

## Data Files

| File | Size (est.) | When Generated | Committed? |
|------|-------------|----------------|------------|
| `public/data/pokemon-compiled.json` | ~10MB | `npm run compile-data` | Yes |
| `public/data/tcg-cards.json` | ~2MB | `npm run collect-tcg`, updated by `npm run fetch-serebii-tcg` | Yes |
| `public/data/type-chart.json` | <10KB | `npm run compile-data` | Yes |
| `public/data/tcg-download-manifest.json` | ~3MB | `npm run collect-tcg`, extended by `npm run fetch-serebii-tcg` | **No** (gitignored) |
| `public/data/download-errors.json` | varies | `npm run download-images` | Optional |
| `public/images/pokemon/*.webp` | ~44MB | `npm run download-images` | Yes |
| `public/images/pokemon-xl/*.webp` | ~88MB | `npm run download-images` | Yes |
| `public/images/games/*.png` | ~1MB | `npm run download-images` | Yes |
| `public/images/tcg/**/*.webp` | ~440MB | `npm run download-images` | Yes |

**Total committed size: ~570MB** — within GitHub Pages 1GB limit.

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
