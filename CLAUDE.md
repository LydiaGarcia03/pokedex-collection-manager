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
| Data source | REST API → pokedex.json | `public/data/pokemon-compiled.json` + `public/data/moves/{id}.json` |
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
- Painel de filtros da listagem em `src/components/FilterPanel.tsx`: no computador, abas à esquerda
  (Collection / Generation / Type / Game / Options) e conteúdo à direita; no celular, folha que sobe de
  baixo com seções em acordeão e resumo do que está escolhido. Rodapé com Reset e "Show N Pokémon"
  (os filtros aplicam na hora; o botão só fecha). O `PokedexPage` continua dono do estado e da filtragem
- Filtro de coleção no painel de filtros da listagem: **All / Owned / Missing**, com contagem. Um Pokémon
  que acabou de mudar de estado continua visível até o mouse/dedo sair do card, o detalhe fechar ou o
  filtro mudar (`stickyCollectionIds` em `PokedexPage.tsx`), para não sumir debaixo do dedo nem fazer o
  detalhe aberto pular de Pokémon
- Detalhes por Pokémon: stats, efetividade de tipo, habilidades, learnsets, dados de espécie
- Cartas TCG por Pokémon com imagens locais — cartas que o TCGdex ainda não tem imagem buscam a
  imagem, nesta ordem, no Serebii (`scripts/fetch-serebii-tcg-images.mjs`) e depois em fontes
  gratuitas extras (`scripts/fetch-fallback-tcg-images.mjs`: pokemon-tcg-data/Scrydex,
  pkmncards.com para Trainer Kits, Limitless para TCG Pocket, e overrides manuais em
  `scripts/tcg-image-overrides.json`). O que nenhuma fonte encontra fica listado em
  `scripts/tcg-missing-images.json` e aparece como placeholder nome/set/número (ver
  `.ai/changes-log.md` 2026-08-24 e 2026-11-15)
- **O pipeline de cartas é aditivo:** nenhum script remove carta ou imagem já existente no
  catálogo — `collect-tcg` faz merge com o `tcg-cards.json` atual em vez de reescrever do zero
- Jogos em que cada Pokémon aparece — cada versão de um par (ex. Scarlet vs Violet) mostra sua
  lista correta e distinta de exclusivos (ver `.ai/changes-log.md` 2026-08-19)
- Aba Games (`PokemonGamesTab.tsx`), opção H4 de `docs/games-tab-mock.html`, no computador e no
  celular. Cada jogo é um bloco na cor marcante dele, com ícone, nome e
  "Gen · ano de lançamento no Japão · DLC". Cor e ano vêm de uma tabela fixa em
  `src/utils/gameDetails.ts`, porque esses dados não existem no `pokedex`. Um jogo que você tem
  ganha borda clara e check. No modo "Toggle Collection Visibility", os que faltam ficam cinza;
  fora dele, todos ficam coloridos. É a mesma regra dos Pokémon da listagem e das cartas TCG. O check é o mesmo quadradinho das cartas TCG (`.selectable-item-checkbox`). Para
  marcar jogos é preciso que o Pokémon esteja na coleção; se não estiver, a aba mostra uma linha
  avisando. São 6 blocos por linha no computador (4 abaixo de 1100px) e 3 no
  celular.
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
- Marcar cartas TCG como **tenho** ou **foil** (`useCollection.setCardOwnership`; foil sempre conta
  como "tenho"). A carta foil ganha a etiqueta prateada "FOIL" (opção V5 de
  `docs/foil-style-mock.html`) e uma borda de arco-íris que gira, como o verso de um CD, com um
  brilho iridescente suave por cima (`@property --foil-angle`). A caixinha do canto de uma carta
  foil é prateada, com o ícone de três brilhos no lugar do check. Onde se marca ou filtra foil (botão
  "Yes, foil", ação "Foil" da barra de várias cartas, filtro Foil), o ícone é o de três brilhos
  (`FoilSparklesIcon.tsx`, F1 de `docs/foil-icon-mock.html`). Tudo fica em
  `src/components/PokemonTcgTab.tsx`.
  - **Celular:** a caixinha do canto marca "tenho". Tocar na carta abre a carta grande com
    "In my collection: No / Yes / Yes, foil".
  - **Computador** (opção T4 de `docs/tcg-tab-mock.html`):
    - a caixinha do canto alterna vazio → ✓ tenho (azul) → três brilhos, foil (prateada) → vazio;
    - clicar na carta abre a mesma carta grande do celular, como janela, com Esc e ← → para
      fechar e trocar de carta;
    - no modo "Toggle Collection Visibility", as cartas que faltam ficam cinza (no computador só a
      imagem, para a caixinha continuar clicável);
    - Shift+clique numa carta liga o modo de várias cartas: a partir daí, um clique escolhe a carta
      (contorno amarelo) e uma barra embaixo aplica "Have", "Foil" ou "Remove" a todas. Uma dica
      curta embaixo dos filtros explica o atalho; não há botão.
- Busca na aba TCG (computador e celular): campo por nome da carta, nome do set e número, mais os
  filtros All / Owned / Missing / Foil (estes só com o Pokémon selecionado). Os nomes dos sets vêm
  de `public/data/tcg-sets.json`

### Detalhe do Pokémon no celular (≤640px)
- Layout próprio em `src/components/PokemonModalMobile.tsx`, escolhido por `useIsMobile`
  (`src/hooks/useIsMobile.ts`). O `PokemonModal` continua dono do estado e da lógica
- Tela cheia; cabeçalho com degradê na cor do primeiro tipo do Pokémon (`--type-color`, a partir
  das variáveis `--type-*` em `:root` no `styles.css`, as mesmas dos badges de tipo); barra
  compacta que desce ao rolar (`IntersectionObserver`); abas Info / Games / TCG numa barra no
  rodapé; deslizar para o lado em qualquer ponto da tela troca de Pokémon (elementos com
  `data-no-pokemon-swipe`, campos de texto e a carta ampliada ficam de fora)
- Conteúdo adaptado: informações em blocos de 2 colunas, stats coloridos por faixa, moves em lista
  com "Level up / TM" (`MoveList` em `PokemonInfoTab.tsx`), games em 3 colunas, cartas em 3
- Mocks de referência: `docs/mobile-detail-mock.html` (opção E), `docs/tcg-search-mock.html`
  (opção C), `docs/tcg-foil-mock.html` (D, estilo 5)
- Exportar/importar coleção como arquivo de texto (formato `POKEDEX_COLLECTION_V2` — ver Critical Rules)
- Versão do app (`src/appInfo.ts`) exibida bem pequena, só "v1.0.0": no computador, no pé da coluna de abas do painel de filtros; no celular, como última linha do menu Actions (opções 4 e 2 de `docs/app-version-mock.html`), para saber se o PWA instalado está atualizado. Regra de quando subir patch/minor/major em `.ai/rules.md` (regra 9)

### Detalhe do Pokémon no computador (>640px)
- Layout em `PokemonModal.tsx`, a partir do mock `docs/desktop-detail-d-mock.html`: opção D,
  com a aba Info na variação I1. As outras opções estão em `docs/desktop-detail-mock.html`.
- Coluna fixa à esquerda (`.pokemon-detail-hero`) na cor do primeiro tipo, com a mesma
  `--type-color` do celular. Nela ficam os botões redondos (fechar, shiny, visibilidade,
  coletado), o Pokémon apoiado num "chão" escuro com sombra de contato, o nome, os tipos, as abas
  Info / Games / TCG empilhadas com contagem e a navegação ← → com miniatura. Só o lado direito
  rola. As setas ← → do teclado trocam de Pokémon, exceto durante a digitação.
- O fundo da coluna tem o símbolo do primeiro tipo grande e clarinho, no canto de cima à direita
  (`.pokemon-detail-hero__symbol`). A opção escolhida foi "Chão + símbolo do tipo" do mock
  `docs/desktop-banner-mock.html`. Os símbolos são máscaras brancas de 512px em
  `public/images/types/symbol-{type}.png`, geradas uma vez a partir dos ícones de tipo por
  `python scripts/generate-type-symbols.py`, que precisa de Pillow. Só é preciso rodar de novo se
  os ícones mudarem.
- A aba Info do computador fica em `PokemonInfoDesktop`, dentro de `PokemonInfoTab.tsx`. Ela tem:
  - uma barra fixa de atalhos (About · Stats · Species · Moves) que acompanha a rolagem;
  - About com a descrição e os dados rápidos;
  - Base Stats ao lado de "Abilities & Nature", terminando na mesma linha;
  - Type Effectiveness na largura toda, com fraquezas, resistências e imunidades em linhas
    separadas;
  - Species com o gênero e a categoria (genus);
  - golpes de Level up e TM lado a lado, cada lista com rolagem própria.
- Abaixo de 1100px de largura, os blocos lado a lado ficam um embaixo do outro.

### PWA (instalável no celular)
- Instalável via "Add to Home Screen"/prompt do navegador — abre em tela cheia, sem barra de
  navegador (`display: standalone`), com ícone e splash screen próprios
- Barra de navegação do Android (◀ ● ■): o Chrome a pinta com o fundo do `:root`, que é `#082744` fixo em
  todas as telas (mesma cor da barra de abas do detalhe). No celular, o degradê da listagem fica num
  `body::before` fixo que termina em `#082744`, emendando com a barra. Não trocar a cor do `:root` por
  tela: isso repinta a página e faz a barra piscar (opção A de `docs/nav-bar-color-mock.html`)
- Gerado por `vite-plugin-pwa` (ver `vite.config.ts`) — manifest + service worker (Workbox)
  100% estáticos, nenhuma mudança necessária no `.github/workflows/deploy.yml`
- Cache do app shell (JS/CSS/HTML, poucos MB) é pré-cacheado no build; imagens
  (`/images/**`) e dados compilados (`/data/*.json`) são cacheados sob demanda em runtime
  (`CacheFirst` e `StaleWhileRevalidate` respectivamente) conforme o User navega — decisão
  deliberada para não tentar pré-cachear os ~570MB de imagens/cartas TCG de uma vez (ver
  `.ai/changes-log.md` 2026-08-24)
- Ícones em `public/pwa-*.png`, `public/maskable-icon-512x512.png`,
  `public/apple-touch-icon-180x180.png`, `public/favicon.ico` — Pokébola em traço dourado
  (`#ffcb05`) sobre azul-marinho (`#0b3360`), desenho-fonte em `docs/pwa-icon.svg` (transparente
  fora do disco, usado em `pwa-*.png` e `favicon.ico`) e `docs/pwa-icon-maskable.svg` (fundo sólido
  até a borda, usado no maskable e no Apple, porque Android e iPhone não aceitam fundo transparente
  nesses ícones). As opções avaliadas estão em `docs/pwa-icon-options-mock.html`. Não usar o preset
  `minimal-2023` do `@vite-pwa/assets-generator` a partir de um PNG sem canal alfa: foi isso que
  deixou cantos pretos no ícone anterior (ver `.ai/changes-log.md` 2026-11-07)

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
and produces `public/data/pokemon-compiled.json` (everything except moves) plus one
`public/data/moves/{id}.json` per Pokémon (`moves`, `levelUpMoves`, `machineMoves`). Moves were
~85% of the old single file and are only shown in the detail's Info tab, so they're fetched when
a Pokémon is opened (`loadPokemonMoves` in `src/api/pokemonApi.ts`). The folder is rewritten on
every run.

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
- `public/data/tcg-sets.json` — `{ setId: setName }` for the TCG search, written right after by
  `scripts/collect-tcg-sets.mjs` (can also be run on its own: `node scripts/collect-tcg-sets.mjs`)

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

### Step 3c — Fill in the rest from other free sources (optional, re-run anytime)
Resolves whatever TCGdex and Serebii both missed: pokemon-tcg-data / Scrydex (subsets como Shiny
Vault/Trainer Gallery/Galarian Gallery, promos, McDonald's, Classic Collection), pkmncards.com
(Trainer Kits XY/BW/SM/HS/DP/EX), Limitless (TCG Pocket). Downloads each image itself and validates it (404s and Scrydex's
"no image" placeholder are rejected), so a card only gets a local `imageUrl` once the file is on
disk.

```powershell
npm run fetch-fallback-tcg            # all missing cards
node scripts/fetch-fallback-tcg-images.mjs --dry-run --only=mep,svp   # preview specific sets
```

Whatever is still missing is written to `scripts/tcg-missing-images.json`. To fix one by hand,
add `"cardId": "https://..."` to `scripts/tcg-image-overrides.json` and re-run the command.
Reprints (Trainer Kits, Yellow A Alternate, Classic Collection) reuse the original card's image,
matched by name + illustrator + attack names via TCGdex card details.

Known gap: My First Battle, Poké Card Creator Pack and a few one-off promos exist only on
Bulbagarden Archives, which blocks scripted downloads. Save those through a browser straight to
`public/images/tcg/{cardId}/low.webp` and re-run the command — a file already on disk for a card
without `imageUrl` is adopted as-is and never overwritten.

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
git add public/data/moves/
git add public/data/tcg-cards.json
git add public/data/tcg-sets.json
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
| `src/components/PokemonTcgTab.tsx` | **Modified** | Uses `pokemon.name` for TCG lookup; search + filters; card viewer with No / Yes / Yes, foil (phone full screen, desktop window); desktop corner box cycles have/foil and Shift+click multi-mark |
| `src/components/PokemonModal.tsx` | **Modified** | Renders `PokemonModalMobile` at ≤640px; desktop = type-colored hero column with stacked tabs + ← → keys; tab content and links shared by both layouts |
| `src/components/PokemonModalMobile.tsx` | **New** | Phone layout of the Pokémon detail |
| `src/components/PokemonGamesTab.tsx` | **Modified** | Game swatches in each game's color (H4); hint when the Pokémon isn't collected |
| `src/components/FoilSparklesIcon.tsx` | **New** | Three-sparkles icon for marking/filtering foil |
| `src/utils/gameDetails.ts` | **New** | Signature color + original release year per game id |
| `src/components/PokemonInfoTab.tsx` | **Modified** | `MoveList` on mobile; `PokemonInfoDesktop` (I1 layout, section shortcuts) on desktop; stat band classes; loads moves on open (`loadPokemonMoves`) |
| `src/components/FilterPanel.tsx` | **New** | Listing filter panel (desktop tabs / mobile bottom sheet); replaced `FilterCombobox.tsx` |
| `src/hooks/useIsMobile.ts` | **New** | `(max-width: 640px)` media query as a hook |
| `src/hooks/useCollection.ts` | **Modified** | `getCardOwnership` / `setCardOwnership` (same saved format); `toggleFoil` removed (unused) |
| `vite.config.ts` | **Modified** | No proxy; `base: '/pokedex-collection-manager/'` (nome do repo no GitHub); `VitePWA` plugin (manifest + service worker) |
| `package.json` | **Modified** | Removed `axios`; added setup scripts; `vite-plugin-pwa` (devDependency) |
| `scripts/compile-pokedata.mjs` | **New** | Compiles source data into static JSON; moves split into `data/moves/{id}.json` |
| `src/appInfo.ts` | **New** | `APP_NAME` + `APP_VERSION`; only the version is shown (filter panel tab column on desktop, Actions menu on phone) |
| `src/hooks/useAuth.ts` | **Modified** | Remembers the last logged-in name (`pcm.lastUserName`) so the header shows the user button, not "Login", while Firebase restores the session |
| `src/components/UserMenu.tsx` | **Modified** | `UserMenuPlaceholder`: same look as the trigger, disabled, shown during that wait |
| `scripts/collect-tcg-data.mjs` | **New** | Fetches TCG card metadata from TCGdex |
| `scripts/collect-tcg-sets.mjs` | **New** | Writes `tcg-sets.json` (set names for the TCG search) |
| `scripts/fetch-serebii-tcg-images.mjs` | **New** | Fills in TCG card images TCGdex is missing, from Serebii |
| `scripts/fetch-fallback-tcg-images.mjs` | **New** | Fills in what's still missing from pokemon-tcg-data/Scrydex, pkmncards, Limitless, manual overrides |
| `scripts/tcg-image-overrides.json` | **New** | Manual `cardId → imageUrl` overrides used by the fallback script |
| `scripts/download-images.mjs` | **New** | Downloads all images locally |
| `scripts/generate-type-symbols.py` | **New** | One-off (Python + Pillow): type icon → big white symbol mask for the desktop detail corner |
| `.github/workflows/deploy.yml` | **New** | GitHub Pages deployment via Actions |
| All other `src/` files | **Unchanged** | Identical to `pokedex/frontend/src/` |

---

## Data Files

| File | Size (est.) | When Generated | Committed? |
|------|-------------|----------------|------------|
| `public/data/pokemon-compiled.json` | ~3.5MB | `npm run compile-data` | Yes |
| `public/data/moves/{id}.json` | ~23MB total, 1288 files | `npm run compile-data` | Yes |
| `public/data/tcg-cards.json` | ~2MB | `npm run collect-tcg` (merge), updated by `npm run fetch-serebii-tcg` and `npm run fetch-fallback-tcg` | Yes |
| `public/data/type-chart.json` | <10KB | `npm run compile-data` | Yes |
| `public/data/tcg-sets.json` | ~6KB | `npm run collect-tcg` (or `node scripts/collect-tcg-sets.mjs`) | Yes |
| `public/data/tcg-download-manifest.json` | ~3MB | `npm run collect-tcg`, extended by `npm run fetch-serebii-tcg` | **No** (gitignored) |
| `public/data/download-errors.json` | varies | `npm run download-images` | Optional |
| `public/images/pokemon/*.webp` | ~44MB | `npm run download-images` | Yes |
| `public/images/pokemon-xl/*.webp` | ~88MB | `npm run download-images` | Yes |
| `public/images/games/*.png` | ~1MB | `npm run download-images` | Yes |
| `public/images/types/symbol-*.png` | ~170KB (18 files) | `python scripts/generate-type-symbols.py` | Yes |
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
