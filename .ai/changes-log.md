# Changes Log

## 2026-06-14 (feature)

### Feature: filtro por geração na barra de busca

**Files modified:** `src/api/pokemonApi.ts`, `src/pages/PokedexPage.tsx`, `src/styles.css`

**What changed:**
- `pokemonApi.ts`: `filterPokemon` recebe novo parâmetro `generation?: number | null` e filtra por `p.generation`.
- `PokedexPage.tsx`: estado `selectedGeneration`, dropdown custom com `ChevronDown`, useEffect para fechar ao clicar fora, `useMemo` atualizado.
- `styles.css`: estilos `.gen-filter`, `.gen-filter__button`, `.gen-filter__dropdown`, `.gen-filter__option`.

**Why:**
Usuário solicitou filtro por geração (I–IX) com botão "All Gens ∨" à direita do search bar, no mesmo estilo pill/visual da barra de busca.

---

## 2026-06-14 (fix 6)

### Fix: ícones de tipo não carregam no GitHub Pages

**Files modified:** `src/components/TypeBadge.tsx`

**What changed:**
- Adicionado `const BASE = import.meta.env.BASE_URL` e substituído `src="/images/types/..."` por `src={\`${BASE}images/types/...\`}`.

**Why:**
Caminho absoluto `/images/types/type-bug.png` funciona em dev (`base: '/'`) mas quebra no GitHub Pages porque o Vite serve os arquivos de `public/` sob `/pokedex-collection-manager-static/`. Os 18 ícones de tipo já existem em `public/images/types/`.

---

## 2026-06-14 (fix 5)

### Fix: ícones de Let's Go Eevee e Let's Go Pikachu não exibidos

**Files modified:** `../pokedex/src/main/resources/data/games-catalog.json`, `../pokedex/src/main/resources/data/pokemon-extras.json`

**What changed:**
- `games-catalog.json`: IDs `lgpe-le` e `lgpe-lp` renomeados para `lgpe-lge` e `lgpe-lgp`.
- `pokemon-extras.json`: 189 ocorrências de `lgpe-le` e 189 de `lgpe-lp` substituídas pelos novos IDs.
- JSON recompilado.

**Why:**
O CDN `static.pokepc.net/images/games/icons` serve os arquivos como `lgpe-lge.webp` e `lgpe-lgp.webp`, mas o catálogo de jogos usava `lgpe-le`/`lgpe-lp`, causando 404.
Nota: arquivo de Pikachu no disco é `lgpe-lgp.webp` (não `lgpe-pgp` como mencionado pelo usuário — provável typo).

---

## 2026-06-14 (fix 4)

### Fix: formas alternativas sem dados de jogos mostram mensagem de dev

**Files modified:** `scripts/compile-pokedata.mjs`, `src/components/PokemonGamesTab.tsx`

**What changed:**
- `compile-pokedata.mjs`: quando `buildGames(ext.games)` retorna null para uma forma alternativa (id ≠ dexNumberFormatted), busca os jogos do Pokémon base como fallback.
- `PokemonGamesTab.tsx`: substituída a mensagem de desenvolvedor por "Nenhum jogo encontrado para este Pokémon."

**Why:**
Formas Gigantamax e outras formas alternativas não têm `game_indices` na PokeAPI, então seus extras não têm campo `games`. O resultado era null no JSON compilado e um texto de instrução técnica exibido ao usuário final.
JSON recompilado — Butterfree Gigantamax (0012-gmax) passou de `games: null` para 32 jogos herdados do base.

---

## 2026-06-14 (fix 3)

### Fix: ícones de jogos não exibidos (.png vs .webp)

**Files modified:** `src/api/pokemonApi.ts`, `scripts/compile-pokedata.mjs`, `scripts/download-images.mjs`

**What changed:**
- `pokemonApi.ts`: ao carregar games do JSON, substitui `.png` por `.webp` no `iconUrl` (fix imediato sem recompilar dados).
- `compile-pokedata.mjs`: `iconUrl` agora gerado com `.webp` em vez de `.png`.
- `download-images.mjs`: removida a tentativa `.png` para ícones de jogos; CDN só serve `.webp`.

**Why:**
Todos os 33 ícones de jogos foram baixados como `.webp` (o CDN `static.pokepc.net/images/games/icons` não serve `.png`), mas o compile script gravava a URL com `.png`, causando 404 em todas as imagens de jogos.

---

## 2026-06-14 (fix 2)

### Fix: dev server não abre em http://localhost:5175/

**Files modified:** `vite.config.ts`

**What changed:**
- `base` agora é dinâmico: `'/'` em `npm run dev`, `'/pokedex-collection-manager-static/'` em `npm run build`.

**Why:**
Com `base` fixo em `/pokedex-collection-manager-static/`, o Vite em dev só respondia em `http://localhost:5173/pokedex-collection-manager-static/`. Navegar para a raiz causava loading infinito sem erros. Separar dev de build faz o dev funcionar igual ao projeto `pokedex` (Spring Boot) sem subpath.

---

## 2026-06-14 (fix 1)

### Fix: image URLs not resolving correctly (dev + GitHub Pages)

**Files modified:** `src/api/pokemonApi.ts`

**What changed:**
- Added `resolveUrl()` helper that prepends `BASE_URL` to image paths stored in JSON (which start with `/`).
- In `loadAllPokemon()`: remaps `imageUrl`, `imageUrlXl`, and `games[*].iconUrl` after loading `pokemon-compiled.json`.
- In `loadTcgCardCatalog()`: remaps `imageUrl` for every TCG card after loading `tcg-cards.json`.

**Why:**
The JSON files store image paths as absolute paths (e.g. `/images/pokemon/bulbasaur.webp`).
Because `vite.config.ts` sets `base: '/pokedex-collection-manager-static/'`, Vite serves `public/` files under that base path — so the correct URL is `/pokedex-collection-manager-static/images/pokemon/bulbasaur.webp`.
A bare `/images/pokemon/...` path resolves to the server root, causing 404s in both local dev and GitHub Pages.
