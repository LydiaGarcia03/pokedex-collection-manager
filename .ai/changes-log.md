# Changes Log

## 2026-11-19 (4)

### Aba Games: jogo não marcado sempre cinza; check igual ao das cartas

**Files modified:**
- `src/components/PokemonGamesTab.tsx`:
  - O jogo que você não tem fica sempre cinza (`--muted`), não só no modo de visibilidade. A prop
    `collectionVisible` saiu do componente.
  - O check redondo foi trocado pelo mesmo quadradinho das cartas TCG
    (`selectable-item-checkbox --compact --blurred`, com `--selected` quando marcado). Ele aparece
    sempre que o Pokémon está na coleção: vazio quando o jogo falta, cheio quando você tem.
- `src/components/PokemonModal.tsx`: deixou de passar `collectionVisible` para a aba Games.
- `src/styles.css`:
  - Sai `.pokemon-game-swatch__check`.
  - Entra o tamanho do quadradinho nos blocos: 28px no computador e 22px no celular, como nas
    cartas do celular.
- `CLAUDE.md`: a descrição da aba Games foi atualizada.

**Why:** o User disse que os jogos não marcados deveriam aparecer desmarcados, como no mock, e
que o check deveria ter o mesmo estilo do check das cartas.

## 2026-11-19 (3)

### Aba Games: blocos com a cor de cada jogo (H4), no computador e no celular

**Files modified:**
- `src/utils/gameDetails.ts` (novo): tabela fixa com a cor marcante e o ano de lançamento
  original (Japão) de cada jogo do `games-catalog.json`. Um jogo que falte na tabela usa cor
  neutra e fica sem ano.
- `src/components/PokemonGamesTab.tsx`, reescrito:
  - sai o texto "List of games this pokemons shows up…";
  - cada jogo vira um bloco (`.pokemon-game-swatch`) em degradê com a cor dele, com ícone, nome
    e "Gen · ano · DLC" (os nomes das DLCs aparecem no título);
  - jogos coletados têm check redondo e borda clara;
  - quando o Pokémon não está na coleção, uma linha avisa que é preciso adicioná-lo para marcar
    jogos;
  - continua igual: só dá para marcar com o Pokémon na coleção, e no modo "collection visible" o
    que falta perde a cor (`--muted`), como as cartas TCG.
- `src/styles.css`:
  - Saem as regras da grade antiga (`.pokemon-game-grid`, `.pokemon-game-item*`,
    `.pokemon-tab-description`) e a parte delas nas regras que dividiam com as cartas TCG.
  - Entram as regras `.pokemon-game-swatch*`: 6 por linha no computador, 4 abaixo de 1100px e 3
    no celular.
- `CLAUDE.md`: a aba Games foi descrita e o mapa de arquivos atualizado.

**Why:** o User escolheu a H4 na 2ª rodada do mock da aba Games. As cores aparecem sempre e o
cinza só no modo de visibilidade, para manter a regra que já vale para as cartas e os cards da
listagem.

## 2026-11-19 (2)

### Mock da aba Games: 2ª rodada de ideias

**Files modified:**
- `docs/games-tab-mock.html`: o mock passa a mostrar a 2ª rodada, com a Atual e a G4 para
  comparar. As ideias novas são:
  - H1: prateleiras por geração, que rolam para o lado;
  - H2: linha do tempo dos lançamentos, com ano e versões juntas e "Only in …";
  - H3: agrupado por console;
  - H4: blocos com a cor de cada jogo;
  - H5: etiquetas compactas.

  Nenhuma tem barra de progresso nem All / Owned / Missing. Uma bolinha amarela marca o jogo em
  que o Pokémon aparece numa DLC. Anos (lançamento original no Japão) e consoles vêm de uma
  tabela fixa no mock.

**Why:** o User achou a G4 ainda ruim e pediu outras ideias.

## 2026-11-19

### Mock: estilos da aba Games (computador e celular)

**Files modified:**
- `docs/games-tab-mock.html` (novo): cada opção aparece no computador (layout D) e no celular,
  com dados reais de Pikachu, Ekans e Gengar e o catálogo de jogos do projeto `pokedex`. As opções
  são:
  - G0: como está hoje;
  - G1: por geração, com progresso em cada uma;
  - G2: lista com detalhes (geração, DLC, exclusivo);
  - G3: pares de versão, com "Only in …" e a versão ausente apagada;
  - G4: ícones grandes, com filtro de geração.

  De G1 a G4, todas têm progresso ("x of y collected") e os filtros All / Owned / Missing.

**Why:** o User está insatisfeito com a aba Games no computador e no celular, e pediu vários
estilos antes de decidir.

Depois, o User escolheu a G4, sem a barra de progresso e sem All / Owned / Missing. O mock agora
abre nela, só com o filtro de geração.

## 2026-11-18 (20)

### Categoria (genus) na seção Species do computador

**Files modified:**
- `src/components/PokemonInfoTab.tsx`: o bloco "Genus" (por exemplo, "Seed Pokémon") entra em
  Species no `PokemonInfoDesktop`, logo depois do gênero. Usa o mesmo rótulo do celular.
- `CLAUDE.md`: a descrição da aba Info do computador foi atualizada.

**Why:** a categoria saiu do banner (entrada 15) e tinha ficado sem lugar no computador. O User
achou que ela cabe bem em Species, como no celular.

## 2026-11-18 (19)

### Banner do detalhe no computador: chão + símbolo do tipo

**Files modified:**
- `scripts/generate-type-symbols.py` (novo, Python + Pillow, escolha do User): a partir de cada
  `public/images/types/type-{type}.png`, guarda só o símbolo branco do meio. Amplia para 512px e
  refaz o contorno (blur + limiar), salvando como máscara branca.
- `public/images/types/symbol-*.png` (novos, 18 arquivos, ~170 KB no total). Conferidos numa
  prancha: os 18 saíram limpos, inclusive Flying e Ice, que têm o círculo claro.
- `src/components/PokemonModal.tsx`:
  - A coluna colorida ganha `.pokemon-detail-hero__symbol`, com a máscara do primeiro tipo via
    `--type-symbol`.
  - A imagem fica dentro de `.pokemon-detail-hero__stage`, com chão e sombra de contato.
- `src/styles.css`:
  - Saem os círculos decorativos da coluna.
  - Novas regras:
    - `__symbol`: 420px, 14%, `top: 30px; right: -150px`, cortado pela borda;
    - `__stage`: desce 24px em relação a antes;
    - `__ground`: faixa escura sem linha branca, que some nas laterais e embaixo;
    - `__contact-shadow`.
  - A imagem sobe 4% para os pés ficarem na sombra.
  - Todos os elementos da coluna ficam acima do símbolo.
- `CLAUDE.md`: a coluna, o script novo e a tabela de dados foram atualizados.

**Why:** o User escolheu "Chão + símbolo do tipo" no mock `docs/desktop-banner-mock.html`, com
os ajustes de posição feitos lá (conteúdo e símbolo mais para baixo, chão sem linha branca).

## 2026-11-18 (18)

### Mock do banner: conteúdo mais para baixo, chão sem linha branca

**Files modified:**
- `docs/desktop-banner-mock.html`:
  - Em todas as opções, o Pokémon, o chão e as informações básicas (número, nome, tipos) descem
    24px. A área da imagem passa a ter `margin-top: 24px`.
  - O chão perde a faixa branca do horizonte: o degradê agora começa transparente e escurece.

**Why:** pedido do User.

Depois, também a pedido do User, o símbolo do canto (do tipo e da Pokébola) desceu mais 20px:
`.corner` passou de `top: 10px` para `top: 30px`.

## 2026-11-18 (17)

### Mock do banner: símbolo mais baixo, chão + símbolo e chão + Pokébola

**Files modified:**
- `docs/desktop-banner-mock.html`:
  - O símbolo do tipo desce 70px (de `top: -60px` para `top: 10px`). Ele passa a ser um elemento
    próprio da coluna (`.corner`), separado da área da imagem.
  - Novas opções:
    - "Chão + símbolo do tipo": o chão com sombra de contato, mais o símbolo no canto.
    - "Chão + Pokébola": o chão, mais a Pokébola no canto, na mesma posição e tamanho do
      símbolo.
  - O mock agora abre em "Chão + símbolo do tipo".

**Why:** o User pediu o símbolo um pouco mais para baixo e as duas combinações.

## 2026-11-18 (16)

### Mock do banner: símbolo do tipo grande no canto

**Files modified:**
- `docs/desktop-banner-mock.html`: a opção "Símbolo do tipo" (agora a que abre primeiro) mostra
  o símbolo grande (420px, 14% de opacidade) no canto de cima à direita da coluna, cortado pela
  borda, no lugar dos círculos de hoje. As máscaras saem dos ícones de 128px em
  `public/images/types`, ampliados para 512px com o contorno refeito (blur + limiar), para não
  ficarem borrados.

**Why:** o User escolheu o símbolo do tipo e pediu que fosse maior, no lugar da circunferência
atual, mais no canto e cortado. Nenhum ícone foi baixado de fora: a versão maior é gerada a partir
dos ícones do próprio projeto.

## 2026-11-18 (15)

### Sem espécie e sem borda azul no detalhe do computador; mock de variações do banner

**Files modified:**
- `src/components/PokemonModal.tsx`: a espécie (por exemplo, "Seed Pokémon") saiu do banner.
- `src/styles.css`:
  - `.pokemon-detail-modal` perde a borda azul (`1px solid rgba(96,165,250,.62)`). No lugar, um
    anel de 1px quase invisível (`rgba(255,255,255,.06)`) junto da sombra.
  - Saiu a regra `.pokemon-detail-hero__genus`.
- `docs/desktop-banner-mock.html` (novo): variações do fundo atrás do Pokémon na coluna colorida.
  As opções são: atual; plataforma oval com sombra de contato; chão com horizonte; contorno de
  Pokébola; e o símbolo do primeiro tipo, tirado da parte branca dos ícones em
  `public/images/types` e usado como máscara.

**Why:** o User disse que a espécie não precisa aparecer no banner. Com a coluna colorida, a
borda azul do modal ficava muito evidente. O User também pediu opções para o Pokémon não parecer
flutuar, e para trocar o círculo de trás por uma Pokébola ou pelo símbolo do tipo.

## 2026-11-18 (14)

### Detalhe do Pokémon no computador: opção D com a aba Info I1

**Files modified:**
- `src/components/PokemonModal.tsx`
  - O layout do computador foi trocado por uma coluna fixa na cor do primeiro tipo
    (`.pokemon-detail-hero`). Ela tem os botões redondos (fechar, shiny, visibilidade,
    coletado), a imagem, o número, o nome, a forma, os tipos, as abas empilhadas e a
    navegação ← → com miniatura.
  - As abas mostram contagem: jogos e, quando o catálogo TCG já está carregado, cartas.
  - O conteúdo rola à direita, com os links externos no rodapé.
  - Novo `changePokemon(±1)`, usado pelas setas da tela, pelo deslizar do celular e pelas setas do
    teclado (`useEffectEvent`; ignora quando se está digitando).
- `src/components/PokemonInfoTab.tsx`
  - Novo `PokemonInfoDesktop`, com:
    - `SectionShortcuts`: barra fixa About · Stats · Species · Moves, que pula para a seção e
      acompanha a rolagem;
    - About com os dados rápidos;
    - Base Stats ao lado de Abilities & Nature, com a mesma altura;
    - Type Effectiveness dividida em fraquezas, resistências e imunidades;
    - Species com o gênero;
    - golpes de Level up e TM lado a lado (`DesktopMoveTable`), cada um com rolagem própria.
  - `AbilityList` e `NatureList` foram extraídos e agora servem aos dois layouts.
  - O `MoveTable` antigo do computador foi removido. O celular continua igual (`MoveList`).
- `src/styles.css`
  - Removidas as regras do layout antigo do computador: cabeçalho, botões "Visibility"/"Close",
    sidebar, navegação, abas com encaixe no painel, tabelas de golpes antigas e as regras de ≤900px
    e ≤640px que reorganizavam esse layout. O modal do computador não aparece mais em ≤640px,
    porque o celular usa o `PokemonModalMobile`.
  - `.pokemon-detail-modal__select` foi mantido, porque o celular usa.
  - Novas regras: `.pokemon-detail-hero*` e `.pokemon-info-desktop*`. Abaixo de 1100px, os blocos
    lado a lado ficam um embaixo do outro; abaixo de 900px, a coluna colorida fica mais estreita.
- `CLAUDE.md`: nova seção "Detalhe do Pokémon no computador" e o mapa de arquivos atualizado.

**Why:** o User escolheu a opção D com a variação I1 da aba Info nos mocks
(`docs/desktop-detail-d-mock.html`), e manteve a sombra do Pokémon como está hoje. O pedido era
levar o estilo novo do celular para o computador.

## 2026-11-18 (13)

### Mock: variações de Base Stats na aba Info (computador)

**Files modified:**
- `docs/desktop-detail-d-mock.html`: o seletor agora mostra a D4, para comparar, e 4 variações.
  Todas usam a coluna colorida da D, a sombra de hoje, o About, os atalhos, a Espécie com o gênero
  e os golpes lado a lado.
  - I1: Base Stats ao lado de Habilidades (com a mesma altura), e Type Effectiveness na largura
    toda.
  - I2: Base Stats na largura toda, com o Total no título. Embaixo, Fraquezas ao lado de
    Habilidades, com a mesma altura.
  - I3: um bloco "Battle" com Base Stats e Type Effectiveness lado a lado. Habilidades sobem para
    o About.
  - I4: Base Stats em barras verticais ao lado de Type Effectiveness. Habilidades sobem para o
    About.
  - O seletor de destaque do Pokémon saiu: fica a sombra de hoje.

**Why:** na D4, o Base Stats esticado ainda ficava estranho, com um vão entre Speed e Total. O
User pediu mais opções só para essa parte, mantendo o que já tinha aprovado.

## 2026-11-18 (12)

### Mock D4: stats agrupados; destaque do Pokémon fica como está hoje

**Files modified:**
- `docs/desktop-detail-d-mock.html`: no Base Stats da D4, os stats ficam juntos em cima e o Total
  vai para o pé da seção, com uma linha acima. Antes, as linhas se espaçavam pela altura toda. O
  seletor de destaque passa a abrir em "Como está hoje (escolhido)". As outras opções continuam
  no seletor só para referência.

**Why:** o User achou os stats separados demais no Gengar. Entre os destaques testados, preferiu
manter a sombra de hoje.

## 2026-11-18 (11)

### Mock D4 e opções de sombra atrás do Pokémon

**Files modified:**
- `docs/desktop-detail-d-mock.html`:
  - Nova variação D4: a organização da D1 com a barra de atalhos da D3 (About · Stats · Species ·
    Moves). Base Stats estica até o fim de "Abilities & Nature", com as linhas espaçadas para
    ocupar a altura.
  - Novo seletor "Destaque do Pokémon". As opções são "Como está hoje" (igual a
    `.pokemon-detail-mobile__image`), "Contorno claro", "Disco claro", "Disco azul-marinho" e
    "Fundo mais suave". Todas, menos a de hoje, têm um contorno claro fino ao redor do Pokémon.

**Why:** o User escolheu a D1, mas quis os atalhos da D3 e sem buraco embaixo do Base Stats.
Também pediu mais destaque para o Pokémon, porque ele pode ter a mesma cor do fundo (Gengar no
roxo). Uma primeira versão com contorno e mancha pretos ficou escura demais e foi descartada.
Por isso as opções não dependem de sombra: contorno claro, um disco atrás do Pokémon ou menos cor
do tipo no fundo.

## 2026-11-18 (10)

### Mock: variações da opção D do detalhe no computador

**Files modified:**
- `docs/desktop-detail-d-mock.html` (novo): a opção D original e 3 variações, cada uma com outra
  organização da aba Info.
  - D1: ordem fixa. "About" com a descrição e 5 dados rápidos. Depois, Base Stats ao lado de
    Fraquezas + Habilidades. Por fim, Espécie e golpes de Level up e TM lado a lado.
  - D2: descrição, altura, peso, geração e região sobem para a coluna colorida. O lado direito
    começa em Base Stats e Fraquezas. Golpes numa tabela completa com seletor.
  - D3: seções em sequência, com uma barra fixa de atalhos (Overview · Stats · Matchups · Moves)
    que acompanha a rolagem.
  - Em todas, "Type Effectiveness" separa fraquezas, resistências e imunidades (0×).
- `docs/desktop-detail-mock.html` continua como estava (A a E), para comparação.

**Why:** o User escolheu a opção D, mas pediu as informações mais bem organizadas. Na D original,
as seções caíam nas 2 colunas na ordem em que cabiam.

## 2026-11-18 (9)

### Mock: visual do celular no detalhe do computador

**Files modified:**
- `docs/desktop-detail-mock.html` (novo): 5 opções para o detalhe do Pokémon no computador,
  com dados reais de Pikachu, Charizard e Gengar e imagens de `public/`. As opções são: A, como
  está hoje; B, mesma estrutura com o visual do celular; C, cabeçalho grande no topo com barra
  compacta ao rolar; D, coluna colorida fixa com as abas dentro dela; E, painel lateral.

**Why:** o User quer levar parte do estilo novo do celular para o computador e pediu várias
opções antes de decidir. Nada no app mudou ainda.

## 2026-11-18 (8)

### Performance: botão do usuário sem "Login" piscando e golpes fora do JSON principal

**Files modified:**
- `src/hooks/useAuth.ts`: guarda no `localStorage` (`pcm.lastUserName`) o nome do último usuário
  logado e devolve `lastUserName`. Também exporta `userDisplayName`.
- `src/components/UserMenu.tsx`: novo `UserMenuPlaceholder`, com a mesma aparência do botão do
  usuário, só que desabilitado.
- `src/pages/PokedexPage.tsx`: enquanto o Firebase restaura a sessão, se havia alguém logado,
  mostra o `UserMenuPlaceholder` em vez de "Login".
- `src/styles.css`: o hover do `.user-menu__trigger` não vale quando ele está desabilitado.
- `scripts/compile-pokedata.mjs`: `moves`, `levelUpMoves` e `machineMoves` saem do
  `pokemon-compiled.json` e vão para `public/data/moves/{id}.json`, um arquivo por Pokémon.
- `public/data/pokemon-compiled.json` e `public/data/moves/`: regenerados. O conteúdo foi
  comparado com o arquivo anterior: 0 diferenças, só a divisão mudou.
- `src/types/Pokemon.ts`: novo `PokemonMoves`. Os campos de golpes saem de `Pokemon`.
- `src/api/pokemonApi.ts`: novo `loadPokemonMoves(id)`, com cache. Uma falha não fica em cache.
- `src/components/PokemonInfoTab.tsx`: carrega os golpes ao abrir o Pokémon e mostra "Loading
  moves…" (ou o erro) enquanto isso.
- `CLAUDE.md`: setup, mapa de arquivos e tabela de dados atualizados.

**Why:** o User notou demora para o app carregar o estilo, principalmente no botão do usuário.
O CSS não era a causa (12 KB comprimido, carrega junto com a página). O botão mostrava "Login" até
o Firebase confirmar a sessão e depois trocava para o botão do usuário. Além disso, a listagem
esperava ler um JSON de 24 MB, e 85% dele eram golpes, usados só na aba Info do detalhe. Agora o
arquivo principal tem 3,5 MB. O cache do PWA (`/data/.*\.json`, `StaleWhileRevalidate`) já cobre
`data/moves/`, e esses arquivos continuam fora do precache (`globIgnores: data/**`).

## 2026-11-18 (7)

### Volta da barra do Android que muda de cor no detalhe (desfaz a entrada 6)

**Files modified:**
- `src/styles.css`: o fundo do `:root` volta a `#0b3360`, e volta a regra
  `:root.pokemon-detail-mobile-open` com fundo `#082744`.
- `src/components/PokemonModalMobile.tsx`: volta o efeito que põe essa classe no `<html>`
  enquanto o detalhe está aberto.

**Why:** com a barra sempre escura, o resultado não ficou bom no celular. O User preferiu a versão
da entrada 5: a barra fica clara na listagem e escurece junto com a barra Info/Games/TCG quando o
detalhe abre.

## 2026-11-18 (6)

### Barra de navegação do Android sempre escura

**Files modified:**
- `src/styles.css`: o fundo do `:root` passa de `#0b3360` para `#082744`, e sai a regra
  `:root.pokemon-detail-mobile-open`.
- `src/components/PokemonModalMobile.tsx`: sai o efeito que punha a classe no `<html>`.

**Why:** a entrada anterior confirmou a causa. O Chrome usa o fundo da página para pintar a barra
do Android. Mas a barra mudava de cor ao abrir o detalhe, e o User quer o tom escuro sempre. O
`body` tem o próprio degradê, então a listagem não muda visualmente.

## 2026-11-18 (5)

### Barra de navegação do Android com a cor da barra Info/Games/TCG (nova tentativa)

**Files modified:**
- `index.html` — meta `theme-color` passa de `#0b3360` para `#082744`, igual ao manifest.
- `src/components/PokemonModalMobile.tsx` — enquanto o detalhe do celular está aberto, o `<html>`
  recebe a classe `pokemon-detail-mobile-open`.
- `src/styles.css` — `:root.pokemon-detail-mobile-open` tem fundo `#082744`.

**Why:** mesmo com o manifest `#082744` já publicado, a barra do Android continuou clara (igual à
captura da listagem). Há duas causas possíveis, e esta entrada cobre as duas. A primeira: a meta
do `index.html` ainda era `#0b3360`, e o Chrome pode usá-la no lugar do manifest. A segunda: o
Chrome mais novo pinta a área atrás da barra do sistema com o fundo da página, que era `#0b3360`.
Efeito colateral: a barra de status do topo fica um pouco mais escura, o que combina com o
cabeçalho da listagem.

## 2026-11-18 (4)

### Botão "Back to top" escondido enquanto o detalhe do Pokémon está aberto

**Files modified:**
- `src/pages/PokedexPage.tsx` — o `.scroll-to-top` só aparece quando nenhum Pokémon está aberto
  (`activePokemonIndex === null`).

**Why:** no celular, depois de rolar a listagem, o botão da listagem continuava visível por cima
do detalhe aberto, em cima da aba Games da barra Info/Games/TCG. Ele pertence só à listagem.

## 2026-11-18 (3)

### Barra de abas do detalhe volta ao tom escuro; barra de navegação do Android escurece junto

**Files modified:**
- `src/styles.css` — `.pokemon-detail-mobile__tabbar` volta ao tom escuro de antes (`#082744`,
  agora opaco).
- `vite.config.ts` — `theme_color` e `background_color` do manifest passam de `#0b3360` para
  `#082744`. A meta `theme-color` do `index.html` continua `#0b3360`, então a barra de status do
  topo não muda.

**Why:** comparando as capturas, a entrada anterior deixou a barra Info/Games/TCG mais clara. O
User prefere o tom escuro original e quer a barra do Android igual a ela. Como o Android só usa o
manifest para essa barra, quem muda agora é o manifest. Efeitos colaterais: a barra de baixo do
Android também fica mais escura na listagem, e a splash screen passa a ter esse fundo. O Android
só aplica um manifest novo quando atualiza o app instalado. Isso pode levar até cerca de um dia,
ou é imediato se o app for reinstalado.

## 2026-11-18 (2)

### Barra de abas do detalhe no celular com a cor da barra de navegação do Android

**Files modified:**
- `src/components/PokemonModalMobile.tsx` — removida a troca dinâmica do `theme-color` da entrada
  anterior.
- `src/styles.css` — `.pokemon-detail-mobile__tabbar` passa de `rgba(8, 39, 68, 0.98)` para
  `#0b3360`, o `theme_color` do manifest.

**Why:** testado no celular, a troca dinâmica do `theme-color` só mudou a barra de status do topo.
No app instalado, a barra de navegação do Android continua com o `theme_color` fixo do manifest.
Então quem se adapta agora é a barra de abas, para formar uma faixa contínua com a do sistema. Se
o `theme_color` do manifest mudar, mudar este fundo junto.

## 2026-11-18

### Barra de navegação do Android com a cor do detalhe do Pokémon no celular

**Files modified:**
- `src/components/PokemonModalMobile.tsx` — enquanto o detalhe do celular está aberto, a meta
  `theme-color` passa para `#082744` (fundo da barra de abas Info/Games/TCG) e volta ao valor
  anterior (`#0b3360`) ao fechar.

**Why:** no app instalado, o Android pinta a barra de navegação do sistema (voltar/início/recentes)
com o `theme-color`. Na listagem o `#0b3360` combina com o fundo, mas no detalhe ficava uma faixa
mais clara abaixo da barra de abas, que é mais escura. A barra de status do topo também usa essa
cor, então fica um pouco mais escura enquanto o detalhe está aberto.

## 2026-11-15 (18)

### Novo painel de filtros da listagem (abas no computador, folha no celular)

Implementação do plano aprovado (mock `docs/filter-panel-mock.html`: D no computador, B no
celular).

**Files modified:**
- `src/components/FilterPanel.tsx` — novo. No computador (`FilterTabsPanel`), um painel ancorado no
  botão Filters, com abas à esquerda (Collection / Generation / Type / Game / Options), um número
  por aba quando há filtro ativo e "Clear" por seção. No celular (`FilterSheet`), uma folha que
  sobe de baixo com fundo escurecido, acordeão de uma seção por vez e o resumo do que está
  escolhido. Conteúdo compartilhado entre os dois:
  - gerações como botões com a região;
  - grade de ícones dos 18 tipos e chips Legendary/Mythical/Starter;
  - jogos em lista agrupada por geração, com ícone e busca, e os chips de DLC quando há um único
    jogo com DLC;
  - seletor All/Owned/Missing com contagem;
  - interruptores Shiny e Exclude forms.

  Rodapé com Reset e "Show N Pokémon". Fecha com Esc, com o fundo (celular) ou com clique fora
  (computador).
- `src/pages/PokedexPage.tsx` — o bloco do dropdown virou `<FilterPanel>`.
  - Saíram o estado `openCombobox`, o `isMobile` da seção Collection, as listas montadas só para o
    combobox (`typeOptions`, `categoryOptions`, `typeFilterGroups`, `generationOptions`) e as
    constantes que foram para o componente (`GEN_REGION_LABELS`, tipos, categorias, opções de
    coleção).
  - `gameGroups` agora traz o ícone de cada jogo.
  - A opção "─" do DLC passou a se chamar "Base game"; o significado é o mesmo, `DLC_NONE_ID`.
  - Os toggles de geração e tipo recebem valores tipados.
  - Estado, filtragem, `stickyCollectionIds` e `clearFilters` não mudaram.
- `src/components/FilterCombobox.tsx` — removido (o User autorizou). Era usado só pelo painel antigo.
- `src/styles.css` — removidos o CSS do dropdown antigo, do combobox (`.filter-combobox*`) e as
  regras de celular dele (inclusive o ajuste do DLC da entrada 16, que não se aplica mais).
  Adicionadas as classes `filter-panel__*` e `filter-sheet__*`. Os estilos do `filter-switch`
  continuam.
- `CLAUDE.md` — funcionalidade e File Map.

**Verificação:** `tsc` e `npm run build` passam. O lint continua com os mesmos 6 problemas, todos
anteriores.

---

## 2026-11-15 (17)

### Mock: novo visual do painel de filtros da listagem

**Files modified:**
- `docs/filter-panel-mock.html` — novo. Página estática (fora do `public/`, não vai para o deploy).
  Compara o painel de hoje com 4 opções, no computador e no celular lado a lado:
  - A: o painel suspenso de hoje, com as opções à vista (gerações como botões, tipos como grade de
    ícones, seletor All/Owned/Missing, jogos em lista com ícones e busca, rodapé "Reset" /
    "Show N Pokémon").
  - B: gaveta lateral no computador / folha que sobe no celular, com seções em acordeão.
  - C: barra de filtros abaixo da busca, filtros ativos como etiquetas removíveis.
  - D: abas laterais no computador / páginas no celular.

  Tudo é clicável. O "Show N Pokémon" calcula com os dados reais dos 1.288 Pokémon (geração,
  tipos, categorias, formas e jogos, ~60KB embutidos). A coleção do exemplo é fictícia.

**Por quê:** pedido do User, depois do ajuste do espaço vazio do DLC no celular. Nenhum código do
app foi alterado nesta entrada.

---

## 2026-11-15 (16)

### Painel de filtros no celular: sem o espaço vazio do DLC

**Files modified:**
- `src/styles.css` — no `@media (max-width: 640px)`, `.pokedex-filter__dlc-slot--hidden` usa
  `display: none`.

**Por quê:** o User mandou um print do painel de filtros no celular com um espaço vazio grande
entre "Game" e "Collection". Era o campo de DLC: ele fica sempre renderizado e só invisível
(`visibility: hidden`), para o painel não mudar de tamanho. No computador ele fica ao lado do Game,
mas no celular, empilhado embaixo, vira um buraco. O problema já existia antes do filtro de coleção.
No celular o campo agora some de vez quando não se aplica e aparece abaixo do Game quando um único
jogo com DLC é escolhido. O computador não muda.

---

## 2026-11-15 (15)

### Filtro de coleção como dropdown no celular

**Files modified:**
- `src/pages/PokedexPage.tsx` — no celular (`useIsMobile`), a seção Collection do painel de filtros
  usa o mesmo `FilterCombobox` de Generation/Type/Game. As opções aparecem como "All (N)",
  "Owned (N)" e "Missing (N)" e o dropdown fecha ao escolher, porque a seleção é única. No
  computador continuam os três botões. `openCombobox` ganhou o valor `'collection'`.

**Por quê:** pedido do User.

---

## 2026-11-15 (14)

### Listagem: filtro de coleção (All / Owned / Missing)

**Files modified:**
- `src/pages/PokedexPage.tsx`:
  - Nova seção "Collection" no painel de filtros, com três opções e contagem (computador e celular).
  - Conta como filtro ativo no badge do botão e é zerada pelo "Reset".
  - A filtragem roda depois dos filtros de busca, geração, tipo e jogo (`attributeFiltered`), e as
    contagens refletem esses filtros.
  - `stickyCollectionIds`: um Pokémon que muda de estado (marcado ou desmarcado na grade, ou aberto
    no detalhe) continua visível sob Owned/Missing até o mouse ou o dedo sair do card (o mesmo
    evento do `commitPendingCleanup`), o detalhe fechar ou o filtro mudar. Sem isso, o card sumiria
    debaixo do dedo e o detalhe aberto, que navega pela posição na lista, pularia para outro
    Pokémon.
- `src/styles.css` — `.pokedex-filter__collection-option*`, no mesmo visual dos filtros da aba TCG.
- `CLAUDE.md` — funcionalidade descrita.

**Por quê:** pedido do User, para o computador e o celular.

---

## 2026-11-15 (13)

### Troca de Pokémon mais rápida no detalhe

**Files modified:**
- `src/components/PokemonCard.tsx` — agora é `memo`, e `onOpenDetails` recebe o id do Pokémon.
- `src/pages/PokedexPage.tsx` — callbacks estáveis (`useCallback` + ref com os handlers mais
  recentes) para a grade. Antes, cada troca de Pokémon no detalhe re-renderizava os ~1.300 cards
  da grade por trás do modal, porque o `PokemonCard` não era memorizado e recebia funções novas a
  cada render. As funções do `useCollection` continuam as mesmas, inclusive o
  `commitPendingCleanup`; só são chamadas pela ref.
- `src/api/pokemonApi.ts` — `getLoadedTcgCards` e `getLoadedTcgSetNames`: leitura síncrona do que
  já está em cache.
- `src/components/PokemonTcgTab.tsx` — começa com os dados do cache, então não mostra mais o spinner
  a cada troca de Pokémon. As imagens da grade usam `loading="lazy"` e `decoding="async"`, então as
  visíveis baixam primeiro em vez das até 246 de uma vez.
- `src/components/PokemonModal.tsx` — com a aba TCG aberta, pré-carrega as 12 primeiras cartas do
  Pokémon anterior e do próximo.

**Por quê:** o User pediu que as informações do Pokémon anterior e do próximo aparecessem mais
rápido ao trocar.

---

## 2026-11-15 (12)

### Aba TCG: mensagens em inglês

**Files modified:**
- `src/components/PokemonTcgTab.tsx` — as duas mensagens que restavam em português foram
  traduzidas, como o resto do app:
  - "TCGdex indisponível" → "Card data unavailable". O texto foi corrigido para "The TCG card data
    could not be loaded. Check your connection and try again.", porque na versão estática o aviso
    aparece quando o `tcg-cards.json` não carrega, não quando a API do TCGdex cai.
  - "Nenhuma carta TCG encontrada para X." → "No TCG cards found for X."

**Por quê:** pedido do User; o app é todo em inglês.

---

## 2026-11-15 (11)

### Celular: deslizar entre Pokémon como carrossel, sem tela azul

**Files modified:**
- `src/components/PokemonModalMobile.tsx`:
  - Novo `NeighborPeek`: cópia visual do cabeçalho do Pokémon anterior e do próximo, montada fora
    da tela, uma de cada lado da página. Como está montada, já carrega a imagem do vizinho.
  - A página e os dois cabeçalhos vizinhos ficam dentro de um `pager`, que é o que se move com o
    dedo.
  - Ao soltar, o `pager` termina de deslizar até o vizinho ocupar a tela. Aí a troca de Pokémon
    acontece de forma síncrona (`flushSync`) e o transform é removido no mesmo frame, então a
    troca não aparece. Saiu a animação de "entrar pelo outro lado" (150ms + 200ms) e entrou um
    deslizar único, de 110 a 280ms conforme o quanto o dedo já arrastou.
  - `HeroIdentity` extraído, para o cabeçalho real e o vizinho usarem a mesma marcação.
- `src/components/PokemonModal.tsx` — passa `isPokemonSelected`, para o vizinho mostrar o
  checkbox de coleção correto.
- `src/styles.css` — `.pokemon-detail-mobile__pager` e `.pokemon-detail-mobile__peek`.

**Por quê:** o User viu uma tela azul ao deslizar quando o próximo Pokémon ainda não tinha
carregado. Era o intervalo entre a página atual sair e a próxima entrar.

---

## 2026-11-15 (10)

### Celular: deslizar entre Pokémon mais fluido

**Files modified:**
- `src/components/PokemonModalMobile.tsx` — novo hook `usePageSwipe` no lugar do par
  `onTouchStart`/`onTouchEnd`. A página acompanha o dedo; ao soltar, desliza para fora e o próximo
  Pokémon entra pelo outro lado (150ms + 200ms). A troca acontece se o arrasto passar de 1/4 da
  tela ou se for um movimento rápido. No primeiro ou último Pokémon a página resiste ao arrasto e
  volta. Usa listeners nativos com `passive: false`, porque os do React são passivos, para segurar
  a rolagem vertical quando o gesto é claramente horizontal. As setas ‹ › usam a mesma animação.
  Em repouso o `transform` é removido, porque um ancestral com transform quebraria o
  `position: fixed` da carta ampliada.
- `src/styles.css` — `touch-action: pan-y` e `overflow: hidden` no detalhe do celular,
  `overflow-x: hidden` no container que rola, e `touch-action: none` na carta ampliada.

**Por quê:** o User achou o deslizar lento. O navegador arrastava a página para o lado sozinho
(com `overflow-y: auto`, o eixo horizontal também vira rolável) e ela voltava. Só depois disso,
ao soltar o dedo, o Pokémon trocava, e sem animação.

---

## 2026-11-15 (9)

### Celular: novo detalhe do Pokémon, busca na aba TCG e foil pela carta ampliada

Implementação do plano aprovado (mocks: `docs/mobile-detail-mock.html` opção E,
`docs/tcg-search-mock.html` opção C, `docs/tcg-foil-mock.html` D estilo 5).

**Etapa 1: base**
- `src/hooks/useIsMobile.ts` — novo. `(max-width: 640px)` via `useSyncExternalStore`.
- `src/styles.css` — as 18 cores de tipo viraram variáveis `--type-*` em `:root`, usadas pelos
  badges e pelo cabeçalho do celular (os mesmos valores de antes).
- `src/types/Pokemon.ts` — tipo `CardOwnership` (`'none' | 'owned' | 'foil'`).
- `src/hooks/useCollection.ts` — `getCardOwnership` e `setCardOwnership`. Mesma regra do
  `toggleCard` (só com o Pokémon selecionado), mesmo formato salvo (`{ id, foil }`) e mesma posição
  da carta na lista. `POKEDEX_COLLECTION_V2` e `commitPendingCleanup` não mudaram.

**Etapa 2: nomes dos sets**
- `scripts/collect-tcg-sets.mjs` — novo. Gera `public/data/tcg-sets.json` (215 sets, ~6KB) a
  partir da lista de sets do TCGdex. É aditivo e o `npm run collect-tcg` roda ele em seguida.
  Ficou como script próprio, e não dentro do `collect-tcg-data.mjs`, para poder gerar os nomes sem
  refazer a coleta inteira.
- `src/api/pokemonApi.ts` — `loadTcgSetNames()`, com cache.
- `package.json` — `collect-tcg` agora roda os dois scripts.

**Etapa 3: busca na aba TCG (computador e celular)**
- `src/components/PokemonTcgTab.tsx` — campo de busca (nome da carta, nome do set, número sem
  zeros à esquerda; vários termos combinados; sem acento), filtros All / Owned / Missing / Foil com
  contagem (só com o Pokémon selecionado), "N of M cards" e o estado vazio "No cards found".
- `src/components/PokemonModal.tsx` — a aba TCG recebe `key={pokemon.id}`, então busca, filtros e
  carta aberta zeram ao trocar de Pokémon. Isso substituiu o `useEffect` que zerava a carta aberta e
  tirou 2 avisos antigos do lint.

**Etapa 4: foil no celular**
- `PokemonTcgTab.tsx` — no celular, tocar na carta abre a carta grande em tela cheia, com setas,
  deslizar para a carta anterior/próxima e "In my collection: No / Yes / Yes, foil". A lista que
  ela percorre é congelada ao abrir, para a carta não sumir quando muda o filtro. O quadradinho do
  canto ganhou uma área de toque de 44px e continua marcando direto. O computador continua igual
  (clique marca, duplo clique amplia, botão ✦ pequeno).
- `styles.css` — cartas foil com borda roxa e brilho holográfico (computador e celular), que fica
  parado com `prefers-reduced-motion`.

**Etapa 5: detalhe no celular**
- `src/components/PokemonModalMobile.tsx` — novo. Layout de celular. Tela cheia; cabeçalho na cor do
  primeiro tipo, com fechar / Shiny / Visibility / coleção, número, nome, tipos e imagem; barra
  compacta que desce ao rolar; "‹ anterior · swipe to switch · próximo ›"; abas no rodapé; deslizar
  em qualquer ponto da tela troca de Pokémon; links Bulbapedia/Smogon no fim da aba Info.
- `PokemonModal.tsx` — o conteúdo das abas e os links externos viraram variáveis usadas pelos dois
  layouts; com `useIsMobile` renderiza o layout novo. O JSX do computador não mudou.
- `src/components/PokemonInfoTab.tsx` — `MoveList` (lista com "Level up / TM") no lugar das tabelas
  no celular; classes de faixa nos stats (`--high` ≥80, `--low` <45, `--mid`), que só têm cor no
  celular; linhas de Abilities e Recommended Nature marcadas como largas.
- `styles.css` — estilos do layout novo, todos dentro de `.pokemon-detail-mobile` (o computador não
  é afetado): informações em blocos de 2 colunas, games em 4 colunas, cartas em 3, busca com fonte
  de 16px (evita o zoom do iPhone) e margens seguras do iPhone (`env(safe-area-inset-*)`).

**Etapa 6:** `CLAUDE.md` atualizado (funcionalidades, nova seção do detalhe no celular, Step 3,
File Map, Data Files). `npm run build` passa. O lint tem 6 problemas, todos já existentes antes
(eram 8).

**Por quê:** o User escolheu esses designs nos mocks e aprovou o plano de entrega.

---

## 2026-11-15 (8)

### Mock de foil: opção D escolhida, comparação dos estilos de botão

**Files modified:**
- `docs/tcg-foil-mock.html` — o User escolheu a opção D (tocar na carta abre a carta grande). As
  opções F a J foram removidas do mock. Agora ele compara só os botões embaixo da carta: a D
  original ("Owned/Not owned", "Foil/Not foil") e 5 estilos novos com texto fixo, sem negação:
  1 caixinhas ("Collected", "Foil"), 2 interruptores ("In my collection", "Foil"), 3 ação ↔ estado
  ("Add to collection" ↔ "In collection"), 4 botões redondos com ícone e 5 pergunta com 3 respostas
  ("No / Yes / Yes, foil"). O telefone já abre com uma carta ampliada.

**Por quê:** o User achou pouco intuitivos os nomes "Not owned" e "Not foil".

---

## 2026-11-15 (7)

### Mocks: rodada 2 do foil e textos do app em inglês

**Files modified:**
- `docs/tcg-foil-mock.html` — reescrito. Saem as opções A, B, C e E da rodada 1; a D fica para
  comparar. Entram 5 opções que partem da D: F painel até a metade da tela com seletor de 3 estados
  (Not owned / Owned / Foil), G carrossel com miniaturas, H virar a carta na grade, I detalhe que
  abre dentro da grade (acordeão) e J a D com um modo "Review cards" (uma carta por vez, que avança
  sozinho). Em todas, o quadradinho do canto ganha área de toque de 44px.
- `docs/mobile-detail-mock.html`, `docs/tcg-search-mock.html` — textos que aparecem dentro do app
  traduzidos para o inglês (busca, filtros, contagens, estado vazio, "swipe to switch", etc.).

**Por quê:** o User não gostou especialmente de nenhuma opção da rodada 1 (a D foi a mais
promissora) e lembrou que o app é todo em inglês. As explicações em volta dos mocks seguem em
português.

---

## 2026-11-15 (6)

### Mocks: foil no celular; detalhe com Pichu/Raichu e deslizar

**Files modified:**
- `docs/tcg-foil-mock.html` — novo. Comparação entre o jeito atual de marcar foil no celular
  (botão de 20×20px que só aparece depois de marcar a carta) e 5 opções, todas dentro do design E:
  A faixa "Foil" na base da carta, B toque em ciclo (sem → tenho → foil), C segurar abre um painel
  com interruptores, D tocar abre a carta grande com botões "Tenho"/"Foil", E seletor "Marcar
  coleção / Marcar foil". As cartas foil ganham brilho holográfico.
- `docs/mobile-detail-mock.html` — tirado o "Mouse Pokémon" (genus) do cabeçalho das opções D e E.
  Agora tem Pichu, Pikachu e Raichu (dados reais), setas de anterior/próximo funcionando nos dois
  telefones e deslizar para o lado no telefone da opção, em qualquer ponto da tela e com qualquer
  rolagem (no computador, clicar e arrastar).

**Por quê:** pedidos do User. Nenhum código do app foi alterado. A opção E do detalhe ficou
registrada como escolhida, para implementar depois.

---

## 2026-11-15 (5)

### Mock: novo design do detalhe do Pokémon no celular

**Files modified:**
- `docs/mobile-detail-mock.html` — novo. Página estática (fora do `public/`, não vai para o deploy)
  com dois telefones lado a lado: à esquerda, a reprodução do layout atual (≤640px); à direita, uma
  de 4 opções novas (A: cabeçalho compacto, B: imagem grande que encolhe, C: abas embaixo, D: cartão
  na cor do tipo) e, a pedido do User, E (cabeçalho da D + barra de abas no rodapé da C, aberta por padrão; ao rolar para baixo, uma barra compacta com o Pokémon, fechar, Shiny, Visibility e coleção desce no topo). As abas Info/Games/TCG, a coleção, o Visibility, o Shiny, os jogos e as cartas são
  clicáveis, e a busca na aba TCG funciona. Usa os dados e as imagens reais do Pikachu.

**Por quê:** o User gostou da opção C da busca na aba TCG, mas quer resolver antes o design do
detalhe no celular. Nenhum código do app foi alterado.

---

## 2026-11-15 (4)

### Correção: cartas duplicadas da Pokémon Futsal

**Files modified:**
- `public/data/tcg-cards.json` — removidas as 5 cartas `fut20-1..5` (Pikachu, Eevee, Grookey,
  Scorbunny, Sobble "on the Ball").
- `public/images/tcg/fut20-1..5/` — removidas (com autorização do User).
- `public/data/tcg-download-manifest.json` (gitignored) — removidas as 5 entradas.
- `scripts/fetch-fallback-tcg-images.mjs` — removido o recurso de "sets extras" (`EXTRA_PTCG_SETS`)
  e o `fut20` da lista de sets do pokemon-tcg-data.
- `CLAUDE.md` — removida a menção à Futsal no Step 3c.

**Por quê:** o TCGdex já tinha essa coleção como `fut2020` ("Pokémon Futsal 2020"). Como o nome
era diferente do pokemon-tcg-data ("Pokémon Futsal Collection"), a comparação por nome achou que
ela faltava, e as mesmas 5 cartas apareciam duas vezes. As cartas `fut2020` continuam no catálogo,
com imagem. Catálogo final: 20.295 cartas, todas com imagem.

---

## 2026-11-15 (3)

### Mock: opções de barra de busca na aba TCG

**Files modified:**
- `docs/tcg-search-mock.html` — novo. Página estática (fora do `public/`, não vai para o deploy)
  com 6 opções interativas (A a F) de busca na aba TCG, cada uma mostrada no computador e no
  celular lado a lado, usando 48 cartas reais do Pikachu das imagens locais.

**Por quê:** o User quer uma busca na aba TCG e vai escolher uma opção antes da implementação.
Nenhum código do app foi alterado.

---

## 2026-11-15 (2)

### Fallback de cartas TCG: reimpressões, imagens manuais e pkmncards de uma carta só

**Files modified:**
- `scripts/fetch-fallback-tcg-images.mjs`:
  - Fonte nova "reprint": acha a carta original no catálogo (mesmo nome normalizado, mesmo
    ilustrador e mesmos nomes de ataque, via detalhes de carta do TCGdex) e reaproveita a imagem
    local dela. Resolveu 35 cartas de Trainer Kits HS/DP, 3 Yellow A Alternate e o Palkia da 30th
    Classic Collection. Quando o ilustrador é outro (arte diferente), a carta é rejeitada.
  - Fonte nova "manual file": se já existe `public/images/tcg/{id}/low.webp` para uma carta sem
    `imageUrl`, o arquivo é adotado como está e nunca é sobrescrito. Serve para imagens salvas à
    mão pelo navegador.
  - pkmncards: lê também sets com uma carta só, que usam o layout de página de carta.
  - Mapeamento `30th → me55` (pokemon-tcg-data) para as três cartas Mew `30th-B/G/R`.
- `CLAUDE.md` — Step 3c atualizado.

**Por quê:** o User pediu para resolver as 76 cartas restantes. Sobram 37 (My First Battle,
Poké Card Creator Pack, Ancient Mew, Pikachu at the Museum, Terapagos & Friends e Jolteon-EX 28a),
que só existem no Bulbagarden Archives. Ele bloqueia download por script, e o agente não contorna
esse bloqueio (nem por headers, nem automatizando o navegador). Por isso o User salvou as 37 pelo
navegador ("Página da Web, completa" de uma página com as imagens). Elas foram conferidas (são
JPEG/PNG de verdade), copiadas para `public/images/tcg/{id}/low.webp` e adotadas pela fonte
"manual file".

**Resultado final:** 20.300 de 20.300 cartas com imagem. Nenhuma carta ou imagem perdida em
relação ao backup, nenhum link quebrado. `public/` com ~635MB.

---

## 2026-11-15

### Imagens para (quase) todas as cartas TCG + pipeline aditivo

**Files modified:**
- `scripts/collect-tcg-data.mjs` — agora faz merge com o `tcg-cards.json` e o manifest existentes
  em vez de reescrever do zero: nenhuma carta é removida (mesmo se o TCGdex parar de retorná-la ou
  a request falhar) e nenhuma imagem já resolvida (Serebii/fallback) volta a `null`.
- `scripts/fetch-fallback-tcg-images.mjs` — novo. Último passo do pipeline: resolve o que TCGdex e
  Serebii não acharam, usando fontes gratuitas, nesta ordem: overrides manuais, pokemon-tcg-data
  (JSON aberto no GitHub) + CDN Scrydex/pokemontcg.io, pkmncards.com (Trainer Kits), Limitless
  (TCG Pocket). Baixa e valida cada imagem (rejeita 404 e o placeholder "no image" que o Scrydex
  devolve com HTTP 200) antes de marcar a carta. Também adiciona ao catálogo a Pokémon Futsal
  Collection (`fut20`), que o TCGdex não lista. Flags `--dry-run` e `--only=setId,...`. Também
  trata cartas listadas em `download-errors.json` (ex.: `30th-B/G/R`, Mew, que o TCGdex anuncia com
  imagem mas devolve 404): busca nas outras fontes e, se nada achar, volta `imageUrl` para `null`
  para mostrar o placeholder em vez de uma imagem quebrada.
- `scripts/tcg-image-overrides.json` — novo, vazio. `cardId → URL` para resolver à mão.
- `scripts/tcg-missing-images.json` — novo, gerado: cartas ainda sem imagem, por set.
- `package.json` — script `fetch-fallback-tcg`, incluído no `setup` antes do `download-images`.
- `public/data/tcg-cards.json`, `public/images/tcg/**` — dados e imagens novos.
- `CLAUDE.md` — Funcionalidades, Step 3c, File Map e Data Files.

**Resultado:** de 1.416 cartas sem imagem, sobraram 76 (de ~20.300). Entraram também 139 cartas
de Delta Reign (`me06`) e 5 da Futsal. Comparado com o backup do catálogo, nenhuma carta e nenhuma
imagem foi perdida. O re-run do Serebii agora casou os promos `mep`, que antes não casavam.

**O que sobrou e por quê:** My First Battle (28) e Poké Card Creator Pack (5) só existem no
Bulbagarden Archives, que bloqueia download automático (403); Trainer Kits HS/DP (35) são
reimpressões que o pkmncards lista só sob o set original, sem indicar qual; Yellow A Alternate (4)
e alguns promos avulsos não estão em nenhuma fonte gratuita. Todos podem ser resolvidos com
`scripts/tcg-image-overrides.json`.

**Por quê:** o User pediu imagem para todas as cartas de todas as coleções, sem custo, e sem
excluir nenhuma carta/imagem existente. Foils não entram como cartas separadas (o catálogo não tem
entradas de reverse holo; o app já marca foil por opção). Shiny Vault/Trainer Gallery/Galarian
Gallery continuam, porque são cartas distintas (número e arte próprios).

---

## 2026-11-07 (4)

### Novo ícone do PWA: Pokébola em traço dourado sobre azul-marinho

**Files modified:**
- `public/pwa-64x64.png`, `public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/favicon.ico`
  — substituídos, agora transparentes fora do disco.
- `public/maskable-icon-512x512.png`, `public/apple-touch-icon-180x180.png` — substituídos, com
  fundo sólido até a borda (sem a margem branca e os cantos pretos do anterior).
- `docs/pwa-icon.svg`, `docs/pwa-icon-maskable.svg` — novos, desenho-fonte dos ícones.
- `CLAUDE.md` — seção de ícones do PWA atualizada.

**Por quê:** o User escolheu a opção T (Contorno) em dourado no azul no mock. Os nomes dos arquivos
não mudaram, então `vite.config.ts` e `index.html` continuam iguais. O `public/pokedex-favicon.png`
foi removido a pedido do User, porque não era mais usado por nada.

---

## 2026-11-07 (3)

### Mock de ícones do PWA: terceira rodada em traço e duas cores

**Files modified:**
- `docs/pwa-icon-options-mock.html` — 7 opções novas (T a Z) com a Pokébola em traço e duas
  cores, mais um seletor com 6 combinações de cores que muda todos os desenhos da rodada.

**Por quê:** as opções sem Pokébola (I a S) não tinham cara de Pokémon. O User sugeriu poucas
cores, com a linha da bola de uma cor e o fundo de outra.

---

## 2026-11-07 (2)

### Mock de ícones do PWA: segunda rodada sem Pokébola

**Files modified:**
- `docs/pwa-icon-options-mock.html` — 11 opções novas (I a S) que não usam a Pokébola, botão para
  alternar entre as rodadas e um ícone que imita o Pokémon GO ao lado de cada prévia. As opções A
  a H continuam disponíveis no botão "Primeira rodada".

**Por quê:** o app fica ao lado do Pokémon GO na tela do User, e um ícone de Pokébola ficaria
parecido demais com ele.

---

## 2026-11-07

### Mock: opções de ícone do PWA com fundo transparente

**Files modified:**
- `docs/pwa-icon-options-mock.html` — novo. Página estática (abre direto no navegador, fora do
  `public/`, então não vai para o deploy) com 8 opções de ícone em SVG, com prévia em fundo
  transparente, nos recortes de Android/iPhone/desktop e em tamanhos pequenos.

**Por quê:** o ícone instalado do PWA estava feio. Causa: `public/pokedex-favicon.png` é RGB sem
canal alfa, então os cantos pretos foram parar em todos os ícones gerados. Nenhum ícone do app foi
alterado ainda; o User vai escolher uma opção antes.

---

## 2026-09-25

### Dados: cartas TCG da coleção de 30 anos (30th Celebration + 30th Classic Collection)

**Files modified:**
- `public/data/tcg-cards.json` — regenerado via `npm run collect-tcg` + `npm run
  fetch-serebii-tcg`. Agora 1025 Pokémon / 20651 cartas. Entraram os sets `30th` (30th
  Celebration, 155 cartas únicas, todas com imagem) e `30th-c` (30th Classic Collection, 30
  cartas, **todas sem imagem**: TCGdex ainda não publicou e o Serebii não bateu nenhuma, então
  aparecem como placeholder nome/set/número).
- `public/images/tcg/30th-*/low.webp` — 155 imagens novas via `npm run download-images`.

**Por quê:** lançamento da coleção de 30 anos do Pokémon TCG (16/09/2026).

**Observações:**
- A primeira rodada de `collect-tcg` perdeu todas as cartas do Scatterbug por uma falha
  passageira do TCGdex (aviso "1 name(s) returned no data"). Rodei de novo e ficou ok. Se esse
  aviso aparecer, sempre rodar de novo antes de commitar, senão as cartas daquele Pokémon somem
  da aba TCG.
- 4 imagens (`30th-021`, `-082`, `-111`, `-148`) deram HTTP 503 no primeiro download e baixaram
  numa segunda rodada. O `public/data/download-errors.json` não é reescrito quando não há erros,
  então ainda lista esses 4 como falha, mas isso está desatualizado.
- Para pegar as imagens da 30th Classic Collection depois: `npm run fetch-serebii-tcg` +
  `npm run download-images` (ou `collect-tcg` completo, se o TCGdex publicar primeiro).

## 2026-08-24 (#6)

### Feature: app instalável como PWA (Progressive Web App)

**Files modified:**
- `package.json` — nova devDependency `vite-plugin-pwa` (^1.3.0; confirmado compatível com
  Vite 8 antes de instalar). Nenhuma dependência de runtime nova — Workbox vem embutido no
  plugin, roda só em build-time.
- `vite.config.ts` — plugin `VitePWA`:
  - `registerType: 'autoUpdate'`, manifest (nome, short_name "Pokédex", `theme_color`/
    `background_color: #0b3360` — a cor de fundo dominante já usada no app, `display:
    standalone`, ícones incluindo variante `maskable`). `start_url`/`scope` resolvidos
    automaticamente pelo plugin a partir do `base` do Vite — confirmado no build que ficaram
    `/pokedex-collection-manager/`, não `/`.
  - `workbox.globPatterns` restrito a `**/*.{js,css,html}` + `globIgnores: ['images/**',
    'data/**']` — decisão deliberada (combinada com o User antes de implementar) para NÃO
    pré-cachear os ~570MB de imagens/cartas TCG nem os JSONs compilados no install; confirmado
    no build: precache final ficou em 11 arquivos / 876.90 KiB (só o app shell).
  - `workbox.runtimeCaching`: `/images/` → `CacheFirst` (nunca mudam depois de baixadas,
    `maxEntries: 800`, `maxAgeSeconds` 30 dias) e `/data/*.json` → `StaleWhileRevalidate`
    (serve cache na hora, atualiza em background — o User regenera esses arquivos
    periodicamente). Resultado: o que ela já visitou funciona offline depois, sem pré-carregar
    tudo de uma vez.
- `index.html` — `theme-color`, `apple-mobile-web-app-capable`,
  `apple-mobile-web-app-status-bar-style` (`black-translucent`), `apple-mobile-web-app-title`
  ("Pokédex") e `apple-touch-icon` — necessários pro Safari/iOS respeitar o modo standalone
  (tela cheia, sem chrome do navegador) além do que o manifest já cobre sozinho no Android/Chrome.
  Favicon trocado para o `favicon.ico` + `pwa-192x192.png` gerados (ver abaixo).
- `public/pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`,
  `apple-touch-icon-180x180.png`, `favicon.ico` (novos) — gerados a partir do
  `public/pokedex-favicon.png` (1254×1254) existente via `npx @vite-pwa/assets-generator
  --preset minimal-2023 public/pokedex-favicon.png` (ferramenta rodada pontualmente via npx,
  não é dependência do projeto — usa `sharp` internamente sem precisar instalá-lo aqui).
- `CLAUDE.md` — nova seção "PWA (instalável no celular)" em Funcionalidades; File Map
  atualizado.

**Verificado:** `npm run build` gera `dist/manifest.webmanifest` e `dist/sw.js` corretos;
inspecionei o `sw.js` gerado diretamente e confirmei que as 11 entradas do precache são só
app shell (nenhum arquivo de `images/` ou `data/*.json`), e que as duas regras de
`runtimeCaching` (`pokedex-images`/`CacheFirst`, `pokedex-data`/`StaleWhileRevalidate`) foram
compiladas corretamente. `manifest.webmanifest` confirmado com `start_url`/`scope` respeitando o
`base` de produção. Subi `vite preview` só para checar os status HTTP desses arquivos via curl
(sem navegar/testar visualmente) e derrubei o processo logo em seguida — não é a mesma coisa que
"rodar o app", mas registro aqui por transparência já que envolveu subir um servidor.

**Why:** Pedido do User — queria que o link do GitHub Pages desse a sensação de um app de
verdade instalado no celular, não só um site salvo.

---

## 2026-08-24 (#5)

### Fix: cartas TCG de imagem grande cortavam na grade em vez de encaixar como as outras

**Root cause:** `.pokemon-tcg-card` só tinha `min-height: 172px` (não uma altura fixa), e o
`<img>` dentro dela usava `height: 100%`. Um `height: 100%` só resolve de forma confiável quando
o pai tem uma altura *definida* — `min-height` sozinho não conta como isso. Resultado: imagens de
resolução/proporção maior podiam renderizar mais altas que 172px e ficavam cortadas pelo
`overflow: hidden` do card, enquanto imagens "normais" cabiam certinho — inconsistente entre
cartas.

**Files modified:**
- `src/styles.css` — `.pokemon-tcg-card` trocou `min-height: 172px` por `aspect-ratio: 5 / 7`
  (proporção padrão de carta de trading card, 2.5in x 3.5in), que dá ao card uma altura definida
  derivada da largura da coluna do grid — agora todo card tem exatamente o mesmo formato,
  independente da resolução nativa da imagem, e `object-fit: cover` (já existente) corta de
  forma uniforme em vez de esporádica. `.pokemon-tcg-card__placeholder` trocou o `height: 172px`
  fixo por `height: 100%` para acompanhar.

**Why:** Pedido do User — algumas imagens (maior resolução) ultrapassavam a área do card e
ficavam cortadas de forma inconsistente com as demais.

---

## 2026-08-24 (#4)

### Feature: foco em tela cheia de uma carta TCG (duplo-clique / long-press)

**Files modified:**
- `src/components/PokemonTcgTab.tsx` — duplo-clique (desktop) ou toque-e-segure de 500ms
  (mobile) numa carta com imagem resolvida abre uma visão em foco que ocupa todo o espaço da
  listagem de cartas (substitui o grid), com um botão X para fechar. Sem imagem (placeholder),
  o gesto não faz nada — não há o que ampliar. Reseta ao trocar de Pokémon/forma
  (`useEffect` em `pokemon.id`).
  - Seleção de carta continua funcionando no clique simples (`selected` mode) — o duplo-clique
    dispara dois `click` antes do `dblclick` do navegador, então a seleção alterna duas vezes e
    volta ao estado original (mesmo resultado final, sem efeito colateral).
  - No touch, o long-press dispara um `click` sintético ao soltar o dedo — suprimido via
    `suppressNextClickRef` para não alternar a seleção logo depois de abrir o foco.
  - Mover o dedo (scroll) ou soltar antes de 500ms cancela o long-press normalmente.
- `src/styles.css` — `.pokemon-tcg-card-focus` (área grande com a imagem, `object-fit`
  implícito via `max-width/max-height`), `.pokemon-tcg-card-focus__close` (botão circular),
  `.pokemon-tcg-card--zoomable` (cursor `zoom-in` fora do modo de seleção).

**Why:** Pedido do User — ver a carta grande sem precisar abrir cada imagem separadamente.

---

## 2026-08-24 (#3)

### Fix: cartas com placeholder (sem imagem) ordenadas por último na grade

**Files modified:**
- `src/components/PokemonTcgTab.tsx` — `displayCards` agora passa por um sort estável
  (`Number(!a.imageUrl) - Number(!b.imageUrl)`) antes de renderizar, então cartas sem imagem
  resolvida (placeholder nome/set/número) sempre aparecem depois das cartas com imagem real,
  mantendo a ordem original dentro de cada grupo.

**Why:** Pedido do User — depois do fallback do Serebii (ver entrada seguinte), a grade
misturava cartas com imagem e placeholders na ordem original do TCGdex; melhor priorizar
visualmente as cartas com arte real.

---

## 2026-08-24 (#2)

### Feature: cartas TCG sem imagem no TCGdex buscam fallback no Serebii

**Problema:** `collect-tcg-data.mjs` descartava (`filter(c => c.image)`) qualquer carta que o
TCGdex ainda não tinha subido imagem — comum em sets/promos muito recentes, já que o TCGdex leva
tempo para fotografar cada carta nova. Resultado: cartas reais (ex. Mega Charizard X ex do set
"Mega Evolution", lançado 2025/2026) simplesmente não apareciam na aba de TCG, sem indicação de
que existiam.

**Files modified:**
- `scripts/collect-tcg-data.mjs` — parou de descartar cartas sem `image`; agora entram no
  catálogo com `imageUrl: null` em vez de sumir. Log final agora mostra quantas ficaram sem
  imagem.
- `scripts/fetch-serebii-tcg-images.mjs` (novo) — para cada carta com `imageUrl: null`, busca a
  página de cardex do Serebii do Pokémon (`serebii.net/card/dex/{dexNumber}.shtml`, uma por
  espécie) e tenta achar a linha correspondente por nome do set (normalizado; sets de promo usam
  uma pequena tabela de tradução já que o TCGdex os nomeia diferente do Serebii, ex. "SVP Black
  Star Promos" vs "SV Promos" do Serebii) + número da carta (após remover zeros à esquerda).
  Best-effort by design — combinado com o User antes de implementar, sem tentar mapear todo set
  já lançado manualmente. Atualiza `tcg-cards.json` in-place e estende
  `tcg-download-manifest.json` com as URLs do Serebii encontradas (mesmo esquema de path local
  `/images/tcg/{cardId}/low.webp` das cartas do TCGdex — nenhuma mudança no frontend foi
  necessária, `PokemonTcgTab.tsx`/`CardImage` já tinha um placeholder para `imageUrl: null`).
- `package.json` — novo script `fetch-serebii-tcg`, inserido no pipeline `setup` entre
  `collect-tcg` e `download-images`.
- `CLAUDE.md` — novo "Step 3b" no setup, tabelas de File Map/Data Files atualizadas, bullet de
  Funcionalidades atualizado.

**Resultado real (rodado nesta sessão):** das 20458 cartas totais, 1383 estavam sem imagem no
TCGdex. O matching do Serebii resolveu 658 (48%) — cobrindo quase 100% do caso que motivou o
pedido (promos recentes: Mega Promos 87/88, SV Promos 27/30, SM Promos 77/79, Trainer
Gallery/Galarian Gallery quase completos). As 725 restantes são majoritariamente nicho: Trainer's
Kits (221), McDonald's Collections (168), o set "Paldean Wonders" que é exclusivo do Japão (119,
não existe no cardex em inglês do Serebii), cartas Crystal vintage da era e-Card/Aquapolis/Skyridge
(74, o Serebii não lista essas variantes na página por espécie), Unseen Forces Unown Collection
(28), My First Battle (28), promos só-japonesas (27) e Celebrations Classic Collection (23).
Decisão combinada com o User: essas 725 aparecem como placeholder (nome/set/número, sem imagem)
em vez de ficarem escondidas.

**Bug encontrado e corrigido durante a implementação:** a regex de parsing das linhas do cardex do
Serebii assumia que o número da carta no path da URL era sempre numérico (`\d+`); cartas de
subsets "secret rare" (Trainer Gallery, Galarian Gallery) usam um path alfanumérico
(`astralradiance/H1.jpg`), então essas linhas inteiras eram silenciosamente ignoradas pelo parser.
Corrigido para aceitar `[A-Za-z0-9]+` — isso sozinho quase dobrou a taxa de match (de 27% para
48%).

**Why:** Pedido do User — cartas novas (promos, coleção mais recente) ficavam invisíveis por
depender só do TCGdex ter subido a imagem.

---

## 2026-08-24

### Feature: filtro de Tipo ganha categorias Legendary / Mythical / Starter

**Files modified:**
- `scripts/compile-pokedata.mjs` — novo campo `starter` no Pokémon compilado, computado via
  `isStarter(dexNumber)` contra uma tabela hardcoded `STARTER_DEX_RANGES` (os 9 primeiros dex
  numbers de cada geração — trio grama/fogo/água, 3 estágios cada). `legendary`/`mythical` já
  existiam no pipeline (vindos de `pokedex.json` do projeto irmão `pokedex`), não precisaram
  de mudança de fonte.
- `src/types/Pokemon.ts` — `starter?: boolean` em `PokemonSummary`; novo tipo exportado
  `PokemonTypeFilterId = PokemonType | 'LEGENDARY' | 'MYTHICAL' | 'STARTER'` para o estado do
  filtro (mantém `PokemonType` restrito aos 18 tipos elementares reais).
- `src/api/pokemonApi.ts` — `PokemonFilters.types` agora usa `PokemonTypeFilterId[]`;
  `filterPokemon` ganhou `matchesTypeFilter`, que checa `legendary`/`mythical`/`starter` para os
  3 pseudo-ids e cai para `types.includes(...)` nos tipos reais (mesma semântica OR de antes).
- `src/pages/PokedexPage.tsx` — novo `CATEGORY_TYPES`; o combobox "Type" passou a usar `groups`
  (já suportado por `FilterCombobox`) com dois grupos: "Type" (os 18 tipos) e "Category"
  (Legendary/Mythical/Starter); `filterTypes` e `toggleFilterType` ampliados para
  `PokemonTypeFilterId`.
- `src/styles.css` — 3 novas cores de badge fallback: `.pokemon-type--legendary` (âmbar),
  `.pokemon-type--mythical` (magenta), `.pokemon-type--starter` (teal). Sem ícones novos — o
  `TypeBadge` já cai para uma badge de letra colorida quando não existe PNG em
  `images/types/type-{x}.png`, que é o caso proposital dessas 3 pseudo-categorias.
- `public/data/pokemon-compiled.json` — regenerado via `npm run compile-data` para incluir o
  campo `starter`.

**Dados de Starter (81 espécies base, 104 entradas contando formas Mega/Gmax/regionais):**
Kanto (1–9), Johto (152–160), Hoenn (252–260), Sinnoh (387–395), Unova (495–503), Kalos
(650–658), Alola (722–730), Galar (810–818), Paldea (906–914). Pikachu/Eevee (parceiros de
Let's Go) ficaram de fora por decisão do User. Verificado contra o Serebii que não existe uma
página dedicada de "starters" para scraping (`serebii.net/pokemon/starterpokemon.shtml` e
`/scarletviolet/starters.shtml` retornaram 404) — a lista é conhecimento estável e bem
estabelecido de Pokémon, e os ranges batem exatamente com "os 9 primeiros dex numbers de cada
geração", como a própria User apontou.

**Why:**
Pedido do User — queria filtrar Pokémon por Legendary e Starter (decidido junto com ela: Legendary
e Mythical como filtros separados; Starter marca a linha evolutiva inteira, não só a forma base).

### Ajuste: símbolos de Legendary/Mythical/Starter

**Files modified:**
- `src/components/TypeBadge.tsx` — pseudo-tipos (`LEGENDARY`/`MYTHICAL`/`STARTER`) não tentam mais
  buscar um PNG inexistente em `images/types/` (pula o `useImageRetry` passando src vazio); Legendary
  e Mythical renderizam uma bolinha colorida sem letra, Starter renderiza uma bolinha cinza com um
  ícone de estrela branca (`Star` do `lucide-react`, já usado no projeto).
- `src/styles.css` — `.pokemon-type--legendary` (amarelo `#facc15`), `.pokemon-type--mythical`
  (roxo `#9333ea`), `.pokemon-type--starter` (cinza `#6b7280`, ícone branco); as três ganham
  `border-radius: 50%` (círculo) em vez do quadrado arredondado dos tipos elementares reais.

**Why:**
Pedido do User — queria bolinhas sólidas (sem a letra inicial usada como fallback dos tipos
elementares) para diferenciar visualmente as categorias dos tipos reais.

**Ajuste seguinte:** a estrela branca (antes só no Starter) passou a aparecer nas três bolinhas
(Legendary/Mythical/Starter também), a pedido do User — `TypeBadge.tsx` unificou o branch das 3
categorias para sempre renderizar `<Star>`; `.pokemon-type--legendary`/`--mythical` ganharam
`color: white` (já existia em `--starter`).

---

## 2026-08-23 (#2)

### Fix: imagens de Pokémon travadas em erro após 503 transitório do GitHub Pages

**Files modified:**
- `src/hooks/useImageRetry.ts` (novo) — hook que tenta recarregar uma imagem automaticamente após
  `onError`, com backoff de 1s/2s/4s (3 tentativas), forçando um request novo via query param
  cache-buster; expõe `{ src, failed, onError }`.
- `src/components/PokemonCard.tsx` — imagem do card da grid agora usa `useImageRetry`; enquanto
  falhando/retentando, não renderiza `<img>` quebrado (o wrapper já tem fundo próprio).
- `src/components/PokemonModal.tsx` — imagem da sidebar de detalhes (normal e shiny) idem.
- `src/components/TypeBadge.tsx` — ícone de tipo migrado do `useState` local para `useImageRetry`,
  mantendo o fallback de letra já existente.
- `src/components/PokemonGamesTab.tsx` (`GameIcon`) — ícone de jogo idem, mantendo o fallback de
  inicial já existente.

**Escopo consciente:** `PokemonTcgTab.tsx` (`CardImage`) ficou de fora — já tem um fallback próprio
baseado em timeout de 8s (cartas TCG às vezes travam em vez de dar erro), então incorporar retry lá
tem mais risco de regressão numa lista de ~18k cartas; pode ser revisitado se o mesmo problema de
503 aparecer lá também.

**Root cause:**
Não é um bug do app — é o GitHub Pages/Fastly CDN retornando 503 esporadicamente em requests de
assets estáticos (dataset de ~406MB de imagens). Antes, nenhum dos `<img>` de Pokémon tinha
`onError`, então uma falha transitória deixava o ícone de imagem quebrada até o usuário dar refresh
manual na página — o que o User reportou.

**Why:**
Pedido do User — reportou "Failed to load resource: 503" ocasional em imagens de Pokémon na versão
hospedada, que só voltavam a carregar com refresh manual. Ver plano de entrega aprovado na sessão
(`.claude/plans`).

---

## 2026-08-23

### Feature: reset de senha via Firebase Auth

**Files modified:**
- `src/firebase/auth.ts` — novo `resetPassword(email)` usando `sendPasswordResetEmail` do
  Firebase Auth.
- `src/components/AuthModal.tsx` — novo modo `'reset'` (além de `login`/`register`), acessível via
  link "Forgot password?" no modo login. Mostra só o campo de e-mail; ao enviar, mostra mensagem
  de confirmação genérica independente de o e-mail existir ou não (erro `auth/user-not-found` é
  tratado como sucesso, para não vazar quais e-mails têm conta cadastrada).
- `src/styles.css` — `.auth-modal__forgot-link` e `.auth-modal__success` (mesma forma de
  `.auth-modal__error`, mas em tom azul neutro).
- `CLAUDE.md` — bullet de login/cadastro atualizado para mencionar reset de senha.

**Why:**
Pedido do User — não havia forma de um usuário recuperar acesso à conta esquecendo a senha.
Firebase Auth já tinha suporte nativo (`sendPasswordResetEmail`), sem necessitar de backend
próprio nem configuração adicional no Firebase Console (usa o e-mail/action page padrão do
Firebase). Ver `.claude/plans` da sessão para o plano de entrega completo aprovado antes da
implementação.

---

## 2026-08-19 (fix, sobre o feature de DLC abaixo #3)

### Fix: contagem errada do "-" (base game), alinhamento do painel de filtros

**Files modified:**
- `scripts/fetch-serebii-dlc-reference.mjs` — agora também busca a Pokédex **base** (Paldea,
  Galar), não só as 4 DLCs; saída reestruturada para `{dlc: {...}, baseRegions: {...}}`.
- `scripts/compile-pokedata.mjs` — `buildGames()` recebe também `ext.baseDex` e escreve
  `inBaseDex: boolean` em cada objeto de jogo (verdadeiro só quando o pokémon tem entrada
  confirmada na Pokédex base daquele jogo — não é mais inferido pela ausência de `dlc`).
- `public/data/pokemon-compiled.json` — recompilado.
- `src/types/Pokemon.ts` — `PokemonGame.inBaseDex?: boolean`.
- `src/api/pokemonApi.ts` — `dlcBaseOnly` agora exige `g.inBaseDex === true` no jogo selecionado,
  em vez de `!g.dlc?.length`.
- `src/styles.css` — `.pokedex-filter__game-row` virou `display: grid; grid-template-columns: 1fr
  1fr` (era `flex` com proporção 2:1) — Game e DLC agora têm exatamente a mesma largura que
  Generation/Type na linha de cima, colunas alinhadas entre as 2 linhas do painel.

**Root cause do bug reportado:**
A raiz do problema em `dlc`: esse campo sempre significou "tem entrada na Pokédex daquela DLC"
(documentado como caveat desde o feature original), nunca "exclusivo daquela DLC". Muitos pokémon
aparecem tanto na Pokédex base quanto na de uma DLC (ex.: Slowpoke está em Galar E em Isle of
Armor). O filtro "-" inferia "é do jogo base" pela ausência de tag `dlc`, o que excluía
incorretamente qualquer pokémon com sobreposição — daí o 253 que o User viu, bem abaixo do
esperado. Fix completo (fonte de dado) em `../pokedex/.ai/changes-log.md` (entrada da mesma data)
— aqui só a propagação: compile + tipos + filtro.

**Why:**
Pedido do User — números batendo errado e o painel de filtros com Game/DLC em tamanhos diferentes
dos filtros de cima (Generation/Type).

---

## 2026-08-19 (fix, sobre o feature de DLC abaixo #2)

### Fix: opção "-" (base game only) como default real, 3 modos de filtro

**Files modified:**
- `src/api/pokemonApi.ts` — `PokemonFilters` ganhou `dlcBaseOnly?: boolean` (além do `dlcId`
  existente); `filterPokemon` agora, quando `dlcBaseOnly` é true, exige que o pokémon tenha, no
  jogo selecionado, uma entrada **sem** nenhuma tag de `dlc`.
- `src/pages/PokedexPage.tsx` — novo sentinel `DLC_NONE_ID = 'none'` (label `"-"`), agora é o
  default real do estado (`filterDlcId` inicia em `DLC_NONE_ID`, não mais em `DLC_ALL_ID`); lista
  de opções passou a ter 3 categorias: `"-"` (base only) → `"All DLCs"` (base + todas as DLCs,
  sem restrição) → uma opção por DLC específica do jogo selecionado; `activeFilterCount` só conta
  DLC como filtro ativo quando o usuário sai do default `"-"`.

**Why:**
Pedido do User: o "-" (Nenhuma DLC) deveria ser o default de verdade — não um estado "sem filtro"
implícito, mas o terceiro modo real de filtragem (só pokémon do jogo base, excluindo tudo que tem
tag de DLC). As 3 opções ficaram: jogo base somente (default) / jogo base + todas as DLCs / uma
DLC específica.

---

## 2026-08-19 (fix, sobre o feature de DLC abaixo)

### Fix: posicionamento, opção "All DLCs" e estabilidade do tamanho do painel

**Files modified:**
- `src/pages/PokedexPage.tsx` — `filterDlcId` deixou de ser `string | null` (default `null`) e
  passou a ser `string` com default `DLC_ALL_ID = 'all'`; `dlcOptions` agora sempre inclui
  `{id: 'all', label: 'All DLCs'}` como primeira opção (sempre selecionada por padrão); Game e DLC
  agora ficam lado a lado numa linha própria (`pokedex-filter__game-row`) em vez do DLC aparecer
  numa linha nova abaixo; o combobox de DLC é **sempre renderizado** (nunca condicionalmente
  removido do DOM) — fica só `visibility: hidden` (`pokedex-filter__dlc-slot--hidden`) quando não
  há um único jogo com DLC selecionado, pra reservar o espaço e o painel de filtros nunca mudar de
  tamanho.
- `src/styles.css` — novas classes `.pokedex-filter__game-row` (flex row, spans a grid inteira),
  `.pokedex-filter__game-slot` (flex 2), `.pokedex-filter__dlc-slot` (flex 1, `min-width: 130px`),
  `.pokedex-filter__dlc-slot--hidden`; empilha em coluna no breakpoint mobile existente.

**Why:**
Feedback do User depois de ver a primeira versão: (1) queria o DLC ao lado do Game, não embaixo;
(2) queria uma opção "All DLCs" real na lista, sempre selecionada por padrão, em vez do estado
implícito "nada selecionado = All"; (3) não queria que o painel de filtros mudasse de tamanho
quando o combobox de DLC aparecia/sumia.

---

## 2026-08-19 (feature)

### Feature: filtro de DLC (habilitado só com um único jogo selecionado)

**Files modified:**
- `scripts/fetch-serebii-dlc-reference.mjs` (novo) — fetch simples (sem Puppeteer, páginas do
  Serebii são HTML estático) das 4 páginas de Pokédex por DLC (Kitakami, Blueberry, Isle of Armor,
  Crown Tundra), extrai os slugs de pokémon listados em cada uma.
- `.gitignore` — adicionado `scripts/serebii-dlc-reference.json` (intermediário, não commitado —
  regenerar com `node scripts/fetch-serebii-dlc-reference.mjs`).
- `scripts/compile-pokedata.mjs` — carrega `dlc-catalog.json`; `buildGames()` agora recebe também
  o `dlc` de `pokemon-extras.json` e anexa `dlc: [{id, name}] | null` em cada objeto de jogo.
- `public/data/pokemon-compiled.json` — recompilado (`npm run compile-data`) com o novo campo.
- `src/types/Pokemon.ts` — `PokemonGame.dlc?: {id, name}[] | null`.
- `src/api/pokemonApi.ts` — `PokemonFilters.dlcId`; `filterPokemon` passa a checar se o pokémon
  tem, no jogo selecionado, uma entrada de `dlc` batendo com o `dlcId` escolhido.
- `src/pages/PokedexPage.tsx` — novo estado `filterDlcId`; `dlcOptionsForSelectedGame` (só
  populado quando exatamente 1 jogo está selecionado); novo `FilterCombobox` de DLC (reaproveitado
  em modo efetivamente single-select — clicar na DLC já ativa desmarca, default é "All"),
  renderizado só quando o jogo selecionado tem DLCs conhecidos; reset automático de `filterDlcId`
  quando deixa de ser válido para a seleção de Game atual.

**What changed:**
Correção da fonte de dados feita em `../pokedex/.ai/changes-log.md` (entrada da mesma data,
`dlc-catalog.json` + `patch-dlc.mjs`, via scraping do Serebii — nem PokeAPI nem pokepc.net
distinguem DLC de jogo base). Aqui só o lado `pokedex-static`: compile + tipos + UI.

**Why:**
Pedido do User — depois do fix de version-exclusivity no filtro de Game, ela quis um segundo
nível: dado um jogo selecionado (só Sword/Shield e Scarlet/Violet têm DLC hoje), filtrar por qual
DLC daquele jogo o pokémon é obtido.

---

## 2026-08-19 (fix)

### Fix: filtro Game=Scarlet (e todo par de jogos) devolvia a mesma lista dos dois lados

**Files modified:**
- `scripts/fetch-pokepc-games-reference.mjs` (novo) — usa o Puppeteer já presente como
  devDependency pra carregar o dataset público do pokepc.net e extrair `nid -> [gameIds]`
- `.gitignore` — adicionado `scripts/pokepc-games-reference.json` (arquivo intermediário, não
  commitado — regenerar com `node scripts/fetch-pokepc-games-reference.mjs`)
- `public/data/pokemon-compiled.json` — recompilado (`npm run compile-data`) após o fix na fonte

**What changed:**
Reproduzi os passos que o User usa pra comparar com o pokepc.net (Games → Scarlet → abrir as 3
pokédexes Paldea/Kitakami/Blueberry → Exclude forms → somar "Showing X of Y") via extensão do
Claude no Chrome. Descobri duas coisas:

1. A soma manual (843) não é o número certo de comparação — os botões Scarlet/Violet nas páginas
   de pokédex do pokepc.net são só links de navegação pra `/games/scarlet` e `/games/violet`, não
   filtram a lista, e as 3 pokédexes têm sobreposição (mesmo pokémon aparece em mais de uma). A
   soma conta repetido.
2. O bug real: nosso `games` (por pokémon) nunca diferenciava exclusividade de versão — Game=Red e
   Game=Blue, Game=Scarlet e Game=Violet, etc. sempre devolviam exatamente a mesma lista, pros 14
   pares de jogos do projeto. Causa raiz e correção completas em
   `../pokedex/.ai/changes-log.md` (entrada da mesma data) — o dado de origem
   (`pokemon-extras.json`) foi corrigido lá; aqui só recompilei com `npm run compile-data`.

Validação pós-fix (`pokemon-compiled.json`): Game=Scarlet agora tem 727 pokémon (658 sem formas)
contra 726 (658 sem formas) em Violet — listas diferentes, como esperado. Larvitar/Pupitar/Tyranitar
(exclusivos de Scarlet no jogo real) confirmados só com `sv-s`.

**Why:**
Pedido do User — o filtro de jogos mostrava a mesma quantidade pra qualquer versão dentro de um
par, o que não reflete os jogos reais.

---

## 2026-08-17 (fix)

### Fix: "Exclude forms" escondia a espécie inteira quando a forma base não batia com outro filtro ativo

**Files modified:**
- `src/api/pokemonApi.ts` (`filterPokemon` — quando `excludeForms` está ativo, agora agrupa por
  `dexNumberFormatted` e, dentro de cada grupo, prefere a forma base (`isBaseForm`) só entre as que
  já passaram nos demais filtros (busca/tipo/geração/jogo); se a base não bateu mas alguma forma
  irmã bateu, mostra essa forma irmã em vez de esconder a espécie inteira)

**What changed:**
Depois do fix anterior (forma base = `id === dexNumberFormatted`), descobri testando com Game =
Scarlet + Exclude Forms = true + busca "Mau" que o Maushold sumia inteiro. Causa: a entrada base
`"0925"` (Family of Four) não tem `games` nenhum no dataset de origem (`pokemon-extras.json` do
projeto `pokedex` só tem esse dado associado à entrada `"0925-family-of-three"` — um buraco na
geração dos dados upstream, não uma indicação real de que Family of Four não existe em
Scarlet/Violet). Com o filtro de jogo ativo, a base falhava esse filtro e a forma alternativa falhava
o próprio "Exclude forms" — nenhuma das duas sobrava.

Cheguei a considerar corrigir isso "emprestando" o `games` da forma irmã pra base direto no
`compile-pokedata.mjs`, mas confirmei que esse mesmo buraco de dados existe em ~28 espécies e, pra
várias delas (Basculin, Darmanitan), as formas têm listas de jogos genuinamente diferentes entre si
— emprestar às cegas geraria dado errado (ex.: Darmanitan Standard Mode "herdando" a lista Galar-only
de Darmanitan Galariano). Por isso a correção ficou só na camada de filtro: `excludeForms` agora
escolhe, por grupo de `dexNumber`, a base **entre as formas que já passaram nos outros filtros**, e
só cai pra uma forma irmã quando a base não passou — em vez de aplicar `isBaseForm` antes de checar
os outros filtros. Sem filtro de jogo ativo, o comportamento não muda (Family of Four continua sendo
o representante).

**Why:**
Pedido do User — ela testou o fix anterior com Game = Scarlet e viu o Maushold sumir inteiro; pediu
que pelo menos uma das formas (a "principal") continuasse aparecendo.

---

### Fix: "Exclude forms" usava `formName` pra decidir o que é forma base

**Files modified:**
- `src/api/pokemonApi.ts` (`filterPokemon` trocou `if (excludeForms && p.formName)` pelo novo
  helper `isBaseForm(p)`, que compara `p.id === p.dexNumberFormatted`)

**What changed:**
O toggle "Exclude forms" descartava qualquer entrada com `formName` preenchido, assumindo que a
forma base sempre tem `formName == null`. Isso é falso pra várias espécies onde TODAS as formas têm
`formName` setado — ex.: #925 Maushold ("Family of Four" é a base, "Family of Three" é a
alternativa, mas nenhuma tem `formName` nulo), Deoxys, Rotom, Giratina, Tornadus/Thundurus/Landorus,
Oricorio, etc. Nesses casos o toggle removia a forma base junto com as alternativas. Verifiquei nos
1288 registros de `pokemon-compiled.json` que a forma base de cada `dexNumber` é sempre e
exclusivamente a que tem `id === dexNumberFormatted` (sem sufixo, ex. `"0925"` vs
`"0925-family-of-three"`) — isso vale pra todos os 211 grupos com mais de uma forma, então troquei o
critério do filtro pra usar isso em vez do texto de `formName`.

**Why:**
Pedido do User — ela notou que "forms" deveria ser entendido como variação do Pokémon base
identificada pelo número de dex/id, não pelo texto de `formName`, que é secundário e não confiável
pra essa distinção.

---

### Fix: painel de filtros preso numa faixa estreita no mobile

**Files modified:**
- `src/styles.css` (`.pokedex-filter__dropdown` dentro do `@media (max-width: 640px)`)

**What changed:**
No mobile, `left: 0; right: 0` no painel resolvia contra a caixa do próprio `.pokedex-filter`
(`position: relative`, largura = só o botão "Filters", ~140px) — não contra a tela. Resultado: o
painel abria preso numa coluna estreita do lado direito, com os 3 comboboxes e os toggles
espremidos, mesmo já estando em `grid-template-columns: 1fr`. Trocado pra `right: 0; left: auto;
width: calc(100vw - 40px)` — mantém o mesmo canto de ancoragem (alinhado à direita, junto ao botão)
mas define a largura explicitamente contra a viewport, então o painel passa a esticar quase até a
borda esquerda da tela. Não adicionei `overflow-y`/`max-height` ao painel externo (mesma razão do
fix de scrollbar de ontem: cortaria as listboxes internas dos comboboxes).

**Why:**
Pedido do User. Validado testando em 390px e 360px de largura via um iframe injetado no próprio
app rodando localmente (a extensão do Claude no Chrome não conseguiu redimensionar a janela real do
navegador nesta sessão) — confirmei que o painel passou a ocupar quase a largura toda da tela, sem
overflow horizontal, e que as listboxes de Type/Game continuam abrindo por cima do conteúdo sem
cortes nesse layout mais largo.

---

## 2026-08-17 (feature)

### Feature: toggles "Shiny" e "Exclude forms" no painel de filtros

**Files modified:**
- `src/api/pokemonApi.ts` (`PokemonFilters` ganhou `excludeForms?: boolean` — `filterPokemon`
  descarta `p.formName` truthy quando ativo; novo helper exportado `getShinyImageUrl(imageCode)`
  centraliza a URL da CDN de sprites shiny do PokéPC, antes hardcoded só em `PokemonModal.tsx`)
- `src/components/PokemonModal.tsx` (usa o novo `getShinyImageUrl` em vez da string hardcoded)
- `src/components/PokemonCard.tsx` (nova prop `shiny: boolean`; troca `pokemon.imageUrl` por
  `getShinyImageUrl(pokemon.imageCode)` quando `shiny` é true)
- `src/pages/PokedexPage.tsx` (novos estados `filterExcludeForms`/`filterShiny`; seção "Options" no
  painel de filtros com os 2 toggles, abaixo do grid de comboboxes; `filterShiny` é passado pra
  cada `<PokemonCard>`; `filterExcludeForms` entra em `filterPokemon`/conta no badge de filtros
  ativos; `clearFilters` reseta os dois; `hasActiveFilterPanel` — novo — mostra o botão Reset também
  quando só o Shiny está ligado, já que ele não entra na contagem do badge por não alterar a lista)
- `src/styles.css` (`.pokedex-filter__options-grid`, `.filter-switch-row`, `.filter-switch` — switch
  pill com knob deslizante, mesma paleta azul do resto do painel)

**What changed:**
Replicados os 2 toggles do painel de filtros do pokepc.net (`pokepc.net/pokedex/national`):
- **Shiny**: troca o sprite de todos os cards da grid pela versão shiny (mesma CDN
  `static.pokepc.net` já usada pelo toggle individual que já existia no modal de detalhe — reuso do
  mesmo padrão, não uma integração nova).
- **Exclude forms**: reduz a listagem só às espécies base (`formName == null`), ocultando Mega
  Evolution, Gigantamax, formas regionais e variantes de gênero como cards separados — mesmo
  comportamento verificado no pokepc.net (reduz de 1595→1025 lá; aqui reduz de 1288→989).

**Why:**
Pedido do User, após confirmar o comportamento interagindo com os toggles em pokepc.net/pokedex/national
(inspecionei visualmente: "Exclude forms" muda a contagem exibida pro total de espécies únicas;
"Shiny" só troca o sprite exibido, sem mudar a contagem).

---

## 2026-08-17 (fix)

### Fix: ícone + label das opções do filtro deslocados pra esquerda

**Files modified:**
- `src/styles.css` (`.filter-combobox__option` — `gap` de 8px pra 4px e `padding` de `7px 10px`
  pra `7px 10px 7px 4px`, reduzindo só o espaço à esquerda)

**Why:**
Pedido do User — ícone/label das opções do combobox (Type, Generation/Region, Game) estavam
deslocados demais pra direita por causa do padding/gap reservado pro checkmark.

---

## 2026-08-17 (fix)

### Fix: ícones do filtro de Tipo maiores e mais espaçados do label

**Files modified:**
- `src/components/FilterCombobox.tsx` (`option.icon` passou a ser envolvido num
  `<span className="filter-combobox__option-icon">`, pra poder estilizar tamanho/espaçamento sem
  afetar outros usos do `TypeBadge`)
- `src/styles.css` (`.filter-combobox__option-icon` — `margin-right: 6px` somado ao `gap: 8px` já
  existente no botão, total ~14px entre ícone e label; `.pokemon-type-icon`/`.pokemon-type` dentro
  desse wrapper sobem de 16px pro 22px — escopado só ao filtro, não mexe no tamanho do badge nos
  cards/modal)

**Why:**
Pedido do User — os ícones de tipo no filtro estavam pequenos e coladas no texto.

---

## 2026-08-17 (feature)

### Feature: ícone do tipo ao lado do label no filtro de Tipo

**Files modified:**
- `src/components/FilterCombobox.tsx` (`FilterComboboxOption` ganhou campo opcional `icon?:
  ReactNode`, renderizado entre o checkmark e o label em cada opção)
- `src/pages/PokedexPage.tsx` (`typeOptions` passa `icon: <TypeBadge type={type} />` — reaproveita
  o componente `TypeBadge` já usado nos cards e no modal de detalhe, com fallback para um círculo
  colorido com a inicial do tipo caso o ícone `images/types/type-{type}.png` falhe ao carregar)

**What changed:**
Cada opção do combobox de Tipo agora mostra o ícone colorido do tipo (mesmo ícone usado nos badges
de tipo dos cards de Pokémon) ao lado do nome, em vez de só texto.

**Why:**
Pedido do User, pra facilitar a identificação visual dos tipos na lista do filtro.

---

## 2026-08-17 (fix)

### Fix: scrollbar indevida cortando a listbox dos comboboxes de filtro

**Files modified:**
- `src/styles.css` (`.pokedex-filter__dropdown` perdeu `overflow-y: auto` e `max-height: 70vh`)

**What changed:**
O painel externo de filtros tinha `overflow-y: auto` + `max-height: 70vh` (sobra do design antigo,
de listas empilhadas sempre visíveis). Como as listboxes flutuantes dos `FilterCombobox` (`position:
absolute`) são filhas desse painel, esse `overflow` virava o container de scroll delas — cortava a
lista de Tipo/Jogo/Geração num retângulo minúsculo com sua própria mini-scrollbar em vez de abrir
normalmente por cima do conteúdo. O painel externo em si não precisa mais de scroll (ficou curto —
só 3 gatilhos), então o `overflow`/`max-height` foi removido de lá; cada combobox já tem seu próprio
`max-height: 260px; overflow-y: auto` na listbox interna, que agora abre sem ser cortada.

**Why:**
Pedido do User, que notou o visual estranho (scrollbar indevida) ao testar o painel no navegador
depois do redesign de ontem. Confirmado o bug e a causa abrindo o app localmente com a extensão do
Claude no Chrome, testando os 3 comboboxes (Type, Generation/Region, Game) antes e depois do fix.

---

## 2026-08-17 (feature, redesign)

### Redesign: painel de filtros no visual do pokepc.net, com combobox multi-select

**Files modified:**
- `src/components/FilterCombobox.tsx` (**novo**) — combobox multi-select reutilizável: label acima,
  gatilho estilo "select" (resume a seleção: "All" / rótulo único / "N selected") que abre uma
  listbox flutuante com opções marcáveis (`Check` icon), aceita `options` (lista plana) ou `groups`
  (com subtítulo, usado pelo filtro de Jogo)
- `src/pages/PokedexPage.tsx` (`filterGeneration: number|null` virou `filterGenerations: number[]`;
  novo estado `openCombobox` controla qual dos 3 comboboxes está com a listbox aberta por vez; o
  painel de filtros antigo — 3 seções empilhadas com listas de toggle-buttons — foi substituído por
  3 `<FilterCombobox>` num grid 2 colunas, com o de Jogo ocupando a linha inteira; botão de limpar
  renomeado de "Clear filters" pra "Reset")
- `src/api/pokemonApi.ts` (`PokemonFilters.generation` virou `generations?: number[]`, lógica OU
  igual a `types`/`gameIds`, já que Geração/Região passou a ser multi-select também)
- `src/styles.css` (bloco `.pokedex-filter__section*`/`.pokedex-filter__option*`/`.pokedex-filter__chip-grid`
  removido; painel (`.pokedex-filter__dropdown`) recebeu fundo `#051629`/borda `#0b3360` — cores
  extraídas via inspeção do CSS computado do pokepc.net —, virou `display:flex; flex-direction:column`
  com um `.pokedex-filter__grid` (2 colunas) dentro; classes novas `.filter-combobox*` para o
  componente novo; `.pokedex-filter__reset` substituiu `.pokedex-filter__clear`, alinhado à direita)

**What changed:**
Painel de filtros (adicionado ontem) foi redesenhado para reproduzir o visual do filtro do
pokepc.net (pokepc.net/pokedex/national) — botão pill "Filters" abre um `dialog` escuro com grid de
2 colunas de comboboxes "estilo select" (label + gatilho que resume a seleção + chevron), em vez do
formato anterior de 3 blocos verticais com listas de botões sempre visíveis. Diferente do pokepc.net
(que é single-select por categoria), aqui os 3 comboboxes — Generation/Region, Type, Game —
continuam multi-select com lógica OU, a pedido do User ("mesmo visual do pokepc, mas com
multi-seleção").

**Why:**
Pedido do User, após inspecionar o filtro do pokepc.net com a extensão do Claude no Chrome
(DOM/CSS computado do `dialog` de filtros). Ela confirmou que queria manter a multi-seleção (já
aprovada antes) e estender isso também pro filtro de Geração/Região, que antes era single-select.

---

## 2026-08-16 (feature)

### Feature: filtros por Tipo, Geração/Região e Jogo num botão único "Filters"

**Files modified:**
- `src/api/pokemonApi.ts` (`filterPokemon` trocou os parâmetros posicionais `type`/`generation`
  por um objeto `PokemonFilters { types?, generation?, gameIds? }`; `types` e `gameIds` usam lógica
  OU — `some()` — enquanto `generation` continua single-select exato)
- `src/pages/PokedexPage.tsx` (dropdown de Geração antigo, single-select, virou um botão "Filters"
  com ícone `Filter` (lucide) e um painel único com 3 seções: Generation/Region — mesmo mecanismo
  de antes, só com rótulo concatenando a região, ex. "Gen I · Kanto", já que no dataset região e
  geração são 1:1 —, Type — 18 tipos, multi-select, toggle — e Game — lista de jogos únicos
  derivada de `allPokemon` via `useMemo`, agrupada por geração, multi-select. Badge no botão mostra
  quantas das 3 categorias estão ativas)
- `src/styles.css` (bloco `.gen-filter*` renomeado/estendido para `.pokedex-filter*`; painel ficou
  mais largo com scroll interno (`max-height: 60vh`) pra caber as ~34 opções de jogo e 18 de tipo;
  novo override mobile pro painel ocupar a largura da tela em vez de estourar)

**What changed:**
Antes só existia filtro por Geração (single-select). Agora existe também filtro por Tipo elemental
(Elétrico, Fogo, etc., multi-seleção) e por Jogo em que o Pokémon pode ser capturado
(multi-seleção), todos acessíveis por um único botão "Filters" — o dropdown de Geração antigo foi
substituído por esse painel consolidado, com o rótulo de geração passando a incluir a região
correspondente.

**Why:**
Pedido do User. Decisões de UX validadas com ela antes da implementação (ver plano aprovado):
painel único em vez de múltiplos botões, tipo com lógica OU, painel em dropdown (não modal) com
scroll interno dado o volume de opções, e jogos como lista de texto (sem ícones) agrupada por
geração.

---

## 2026-08-07 (feature, fix)

### Fix: badge de foil — ícone prateado (gradiente SVG), sem inset shadow, regra de idioma

**Files modified:**
- `src/components/PokemonTcgTab.tsx` (removido `inset` do `box-shadow` do badge ativo — ficou só
  sombra externa; ícone `Sparkle` ativo agora usa `fill="url(#foil-toggle-silver)"`, um gradiente
  SVG `<linearGradient>` prateado definido uma vez em `<defs>` no topo do componente, em vez de
  `currentColor` branco)
- `src/styles.css` (`.pokemon-tcg-card__foil-toggle--active` — `color` mudou de branco (`#f3eefc`)
  para cinza-prata (`#bfbfbf`, tom do meio do gradiente) pro contorno do ícone combinar com o
  preenchimento; `box-shadow` perdeu a camada `inset`)
- `.ai/rules.md` (regra 8 adicionada — texto de interface sempre em inglês)

**What changed:**
- O badge de foil (fundo roxo `#7c5cb8`) continua igual; só o ícone deixou de ser branco sólido e
  passou a usar um degradê prateado, a pedido do User. Primeira tentativa (`#e6e6e6 → #bfbfbf →
  #8c8c8c → #d9d9d9`) ficou apagada demais; ajustado pra um degradê de mais contraste/brilho
  (`#ffffff → #d4d4d8 → #8a8a94 → #d4d4d8 → #ffffff`, padrão "faixa de brilho" diagonal) e um leve
  glow externo (`0 0 5px`, não-inset) pra dar mais destaque.
- `box-shadow` do badge ativo não tem mais a camada `inset` (que criava um realce interno
  destacando a borda) — só sombra externa (mais o glow prateado citado acima).
- Nova regra de processo: todo texto visível na interface deve ser em inglês, independente do
  idioma usado na conversa ou na documentação/`.ai/`.

**Why:**
Pedido do User: a estrela branca não combinava com o restante do badge; e ela quer que a
aplicação, daqui pra frente, tenha todo texto de interface em inglês.

---

## 2026-08-07 (docs)

### Docs: nova regra — agente nunca sobe a aplicação para testes

**Files modified:**
- `.ai/rules.md` (regra 7 adicionada)

**What changed:**
- Formalizada a regra de que o agente nunca deve rodar `npm run dev` (ou qualquer processo que
  suba a aplicação) para verificação visual — só automação (build/type-check/lint/testes). Ao
  terminar uma mudança de UI, o agente deve avisar o User e pedir para ela mesma subir e testar.

**Why:**
Pedido explícito do User durante o desenvolvimento da funcionalidade de foil — o agente havia
iniciado o dev server (`npm run dev`) para verificar visualmente a mudança de estrela/cor, e a
User preferiu ser ela a rodar e testar a aplicação.

---

## 2026-08-06 (feature)

### Feature: marcar cartas TCG selecionadas como foil

**Files modified:**
- `src/types/Pokemon.ts` (novo tipo `SelectedCard { id, foil }`)
- `src/hooks/useCollection.ts` (`selectedCardsByPokemonId` passa de `Record<string, string[]>` para
  `Record<string, SelectedCard[]>`; novo helper `normalizeSelectedCards` para migrar dados antigos
  em `readCollectionState`/`importFromJson`; novas funções `getFoilCardIds`, `isCardFoil`,
  `toggleFoil`; `toggleCard` agora guarda `{id, foil: false}` por padrão; `CollectionImportResult`
  ganhou `foilCount`)
- `src/utils/collectionFormat.ts` (`buildExportText`/`parseCollectionText` passam a ler/escrever a
  tag `[foil]` nas linhas de carta do formato `CARD COLLECTION`; `ParsedCollection` ganhou
  `foilCount`)
- `src/components/ImportCollectionModal.tsx` (resumo de import mostra `(N foil)` quando aplicável)
- `src/components/PokemonTcgTab.tsx` (novo badge (ícone `Sparkle` da `lucide-react`, `size={16}`
  num botão de `20px`, pra ficar proporcional ao padrão já usado no `<Check>` do checkbox de
  seleção) no canto inferior-esquerdo de cada carta, visível só quando a carta está marcada;
  wrapper do card trocado de `<button>` para `<div role="button">` com suporte a teclado, pra
  caber um segundo alvo clicável sem aninhar `<button>` dentro de `<button>`)
- `src/components/PokemonModal.tsx` (wiring de `foilCardIds`/`onToggleFoil` para `PokemonTcgTab`)
- `src/styles.css` (`.pokemon-tcg-card__foil-toggle` e `--active`, roxo sólido `#7c5cb8` — evita
  deliberadamente amarelo/dourado, que já é a cor convencional de "favorito" em outros apps e
  criaria confusão com foil; passou por quatro iterações a pedido do User — roxo-prateado apagado
  demais → gradiente roxo-neon chamativo demais → gradiente metálico ainda chamativo → cor sólida
  atual, no mesmo estilo do badge de seleção azul já existente, sem glow/gradiente)
- `CLAUDE.md` (linha nova em "Funcionalidades")

**What changed:**
- Cada carta selecionada agora carrega um status de foil (`{ id, foil }`), não uma lista separada —
  desmarcar a carta descarta o registro (e o foil) automaticamente, sem lógica de limpeza extra.
- Toda carta nova selecionada começa como não-foil; clicar na estrela alterna o status sem afetar a
  seleção da carta.
- Formato de texto de import/export ganhou a tag opcional `[foil]` nas linhas de carta — só aparece
  quando a carta é foil, cartas não-foil ficam idênticas ao formato anterior. Arquivos exportados
  antes desta mudança continuam importando normalmente (nenhuma carta como foil).
- Dados antigos em `localStorage`/Firestore (arrays de string simples) são migrados automaticamente
  para o novo formato `{id, foil: false}` ao carregar.

**Why:**
Pedido do User: poder indicar quais cópias de carta na coleção são a versão foil, sem poluir a
tela — a marcação só aparece depois que a carta já está selecionada.

---

## 2026-08-06 (docs, fix 2)

### Docs: URL do GitHub Pages confirmada e corrigida no CLAUDE.md

**Files modified:**
- `CLAUDE.md` (removido aviso de "pendente de verificação"; URL e Source repository corrigidos)

**What changed:**
- Confirmado com o User: o repositório no GitHub se chama `pokedex-collection-manager` (sem
  "-static") — só o diretório local é que se chama `pokedex-static`. `vite.config.ts` e
  `README.md` já estavam corretos (`base: '/pokedex-collection-manager/'`); quem estava
  desatualizado era o `CLAUDE.md`, que ainda citava `pokedex-collection-manager-static`.
- `CLAUDE.md` atualizado: `GitHub Pages URL` → `https://LydiaGarcia03.github.io/pokedex-collection-manager/`,
  `Source repository` → `https://github.com/LydiaGarcia03/pokedex-collection-manager`.
- **Nota deixada no CLAUDE.md:** `git remote -v` local ainda aponta para
  `pokedex-collection-manager-static.git` (provável nome antigo pré-rename, funcionando via
  redirect do GitHub). Não alterado — mudanças em git config não são feitas sem pedido explícito.
  Sugerido ao User rodar `git remote set-url origin ...` manualmente se quiser parar de depender do redirect.

**Why:**
Resolve a inconsistência sinalizada na entrada anterior (2026-08-06, docs) — o User confirmou qual nome é o correto.

---

## 2026-08-06 (docs)

### Docs: CLAUDE.md atualizado (Firebase, funcionalidades) + criado .ai/rules.md

**Files modified:**
- `CLAUDE.md` (seção "Funcionalidades" adicionada; tabela "How This Differs" inclui Cloud sync/Firebase; Critical Rule #3 revisada para permitir BaaS client-side; nova Critical Rule #7 referenciando `.ai/rules.md`; aviso de URL pendente de verificação adicionado)
- `.ai/rules.md` (novo — regras de trabalho do agente: changes-log, upkeep do CLAUDE.md, compatibilidade com GitHub Pages, clean code, perguntar antes de decidir, plano de entrega para grandes mudanças)

**What changed:**
- `CLAUDE.md` estava desatualizado: não mencionava Firebase Auth/Firestore/App Check (adicionados ao projeto após a redação original) e citava `pokedex-collection-manager-static` como URL/base do GitHub Pages, enquanto `vite.config.ts`/`README.md` usam `pokedex-collection-manager` desde o commit `6f3bb73d`.
- Documentada a stack de sincronização em nuvem (Firebase) como funcionalidade, deixando claro que continua sendo "sem backend próprio" (BaaS client-side).
- **URL não foi corrigida de fato** — o repositório real (`git remote`) é `pokedex-collection-manager-static`, mas `vite.config.ts`/`README.md` usam `/pokedex-collection-manager/`, uma inconsistência que pode quebrar o deploy (404 em assets) sem domínio customizado. Marcado como pendente de verificação com o User antes de alterar código.
- Criado `.ai/rules.md` formalizando regras de processo pedidas pelo User.

**Why:**
Pedido do User após revisão do projeto: manter o CLAUDE.md fiel ao estado real do código/funcionalidades e formalizar regras de processo (changes-log, upkeep de docs, compatibilidade com GitHub Pages, clean code, perguntar antes de decidir, plano de entrega para grandes mudanças) em um arquivo de regras dedicado.

---

## 2026-06-22 (data)

### Data: Legends: Z-A adicionado na aba de Jogos

**Files modified:**
- `public/images/games/lza.webp` (novo — ícone do jogo, adicionado manualmente)
- `scripts/update-lza-games.mjs` (novo — script que adiciona "lza" ao pokemon-extras.json)
- `../pokedex/src/main/resources/data/pokemon-extras.json` (465 entradas atualizadas)
- `../pokedex/src/main/resources/data/games-catalog.json` (já tinha "lza" — sem alteração)
- `../pokedex/scripts/generate-pokedata.mjs` (adicionado `legends-za` em VERSION_TO_SLUG e VERSION_GROUP_TO_SLUGS)
- `public/data/pokemon-compiled.json` (recompilado)

**What changed:**
- 503 Pokémon/formas no `pokemon-compiled.json` agora têm o jogo "Legends: Z-A" (`lza`) na lista de jogos
- Lista de 373 national dex numbers obtida da Bulbapedia (Lumiose Pokédex + DLC Mega Dimension)
- Formas alternativas (Mega, Gmax, regionais) herdam automaticamente o `lza` do Pokémon base
- `lza` respeita a ordem cronológica de lançamento (último da lista)

**Why:**
A PokeAPI ainda não tinha `game_indices` populados para `legends-za` (version 47, version group 30). A lista foi obtida via API do MediaWiki da Bulbapedia e aplicada diretamente com o script `update-lza-games.mjs`.

---

## 2026-06-15 (data)

### Data: Adicionados 45 Pokémon/formas faltando (39 Megas + 6 outras formas)

**Files modified:**
- `../pokedex/src/main/resources/data/pokedex.json` (fonte — 1242 → 1287 entradas)
- `public/data/pokemon-compiled.json` (recompilado automaticamente)
- `scripts/add-missing-pokemon.mjs` (novo script utilitário de inserção)
- `scripts/crawl-pokepc.mjs` (correção do bug de comparação nid vs id + exclusão Tatsugiri droopy/stretchy mega)

**What changed:**
- Adicionadas 39 Megas confirmadas via crawler PokéPC CDN:
  - Megas clássicas não registradas: Raichu X/Y, Clefable, Starmie, Meganium, Feraligatr, Skarmory, Chimecho, Staraptor
  - Novas Megas de Legends: Z-A: Absol Mega Z, Garchomp Mega Z, Lucario Mega Z, Heatran, Darkrai, Emboar, Excadrill, Scolipede, Scrafty, Eelektross, Chandelure, Golurk, Chesnaught, Delphox, Greninja, Pyroar, Floette Eternal Mega, Meowstic, Barbaracle, Dragalge, Zygarde Complete Mega, Crabominable, Golisopod, Drampa, Zeraora, Falinks, Scovillain, Glimmora, Tatsugiri, Baxcalibur
- Adicionadas 6 outras formas confirmadas: Cherrim Sunshine, Shaymin Sky, Darmanitan Zen Mode, Darmanitan Galarian Zen Mode, Floette Eternal Flower, Gimmighoul Roaming
- Tipos e habilidades de cada nova Mega/forma obtidos diretamente do CDN do PokéPC
- Atualizado Tatsugiri (base/droopy/stretchy): `capableOfMegaEvolution: true` + `megaEvolutions` adicionado

**Why:**
Pokémon Legends: Z-A introduziu dezenas de novas Mega Evoluções. Identificadas via comparação automatizada com o dataset do PokéPC (1595 entradas). O script `add-missing-pokemon.mjs` insere cada entrada na posição correta pelo dexNumber e reconstrói o sortOrder sequencial.

---

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
