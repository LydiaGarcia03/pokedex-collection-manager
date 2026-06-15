# Changes Log

## 2026-06-14 (fix 7)

### Fix: modal não exibe menus no celular — múltiplos problemas de responsividade

**Files modified:** `src/styles.css`

**What changed:**
- `@media (max-width: 900px)`:
  - Modal: `height: auto; max-height: calc(100vh - 16px); overflow-y: auto` (o modal inteiro rola, não o panel interno).
  - Layout: `flex: none` (corrige o colapso — `flex: 1; flex-basis: 0` num container de altura auto colapsava o layout para 0, subindo o footer até o header).
  - Layout: `overflow: visible; grid-template-columns: 1fr`.
  - Content: `height: auto; overflow: visible`.
  - Tabs: `transform: none` em todos os estados (o `translateY(4px)` do desktop que fundia as tabs com a borda do panel ficava desalinhado no empilhamento mobile).
  - Panel: `border-radius: 12px; margin-top: 12px; overflow-x: hidden; overflow-y: visible` (border-radius completo para layout empilhado; overflow-x hidden evita overflow das tabelas de moves).
- `@media (max-width: 640px)` (celulares):
  - Backdrop: `align-items: flex-end` (modal sobe da base).
  - Modal: `border-radius: 20px 20px 0 0; border-bottom: none`.
  - Header: `position: sticky; top: 0; z-index: 10; background: #0b3360` (fica visível ao rolar).
  - Sidebar: `max-width: 200px`.
  - Nav buttons: `min-height: 48px; padding: 0 16px` (setas mais espaçadas).
  - Tabs: `flex: 1; font-size: 0.82rem` (dividem espaço igualmente).
  - Panel: `padding: 16px 14px 24px`.
  - Moves section: `padding: 16px 12px`.

**Why:**
Múltiplos problemas simultâneos no celular: (1) layout colapsava para 0 altura por causa de `flex: 1; flex-basis: 0` em container auto-height, fazendo o footer subir; (2) `overflow: hidden` no content + overflow visual no panel causava overflow das tabelas na tela; (3) `transform: translateY(4px)` das tabs criava contorno desalinhado no layout empilhado; (4) setas de navegação muito compactas.

---

## 2026-06-14 (feature)

### Feature: Toggle Collection Visibility

**Files modified:** `src/pages/PokedexPage.tsx`, `src/components/PokemonCard.tsx`, `src/components/PokemonModal.tsx`, `src/components/PokemonTcgTab.tsx`, `src/components/PokemonGamesTab.tsx`, `src/styles.css`

**What changed:**
- `PokedexPage.tsx`: Adicionado estado `collectionVisible` (boolean, default false) e botão "Toggle Collection Visibility" na section `collection-actions`, ao lado de "Export Collection". O botão recebe a classe `collection-action-button--active` quando ativo. O prop `collectionVisible` é passado para `PokemonCard` e `PokemonModal`.
- `PokemonCard.tsx`: Novo prop `collectionVisible: boolean`. Quando `collectionVisible && !selected`, o artigo recebe a classe `pokemon-card--dimmed`.
- `PokemonModal.tsx`: Novo prop `collectionVisible: boolean`, repassado para `PokemonTcgTab` e `PokemonGamesTab`.
- `PokemonTcgTab.tsx`: Novo prop `collectionVisible: boolean`. Cada card recebe `pokemon-tcg-card--dimmed` quando `collectionVisible && !checked`.
- `PokemonGamesTab.tsx`: Novo prop `collectionVisible: boolean`. Cada game item recebe `pokemon-game-item--dimmed` quando `collectionVisible && !checked`.
- `styles.css`: Adicionadas classes `.pokemon-card--dimmed`, `.pokemon-game-item--dimmed`, `.pokemon-tcg-card--dimmed` com `filter: grayscale(100%) opacity(0.4)` e `.collection-action-button--active` com destaque visual.

**Why:**
Usuário solicitou funcionalidade de toggle para visualizar a coleção: ao ativar, itens não selecionados ficam em tons de cinza para simbolizar que não fazem parte da coleção. Itens selecionados mantêm suas cores originais.

---

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
