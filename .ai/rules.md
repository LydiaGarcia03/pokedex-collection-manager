# .ai/rules.md — Regras de Trabalho do Agente

Estas regras governam como qualquer agente (Claude Code ou outro) deve trabalhar neste projeto.
Elas complementam o `CLAUDE.md` (que descreve o projeto) e devem ser seguidas em toda sessão.

---

## 1. Manter o `.ai/changes-log.md` atualizado

Toda alteração feita no código deve ser registrada em `.ai/changes-log.md` no momento em que é feita — não no final da sessão, não em lote.

Cada entrada deve conter:
- Data (YYYY-MM-DD)
- Arquivos modificados
- O que mudou
- Por que mudou

## 2. Manter o `CLAUDE.md` atualizado

Sempre que uma **mega funcionalidade** for adicionada, removida ou alterada de forma estrutural
(ex.: nova integração externa como Firebase, nova aba/página, mudança de arquitetura de dados,
mudança de URL/deploy), o `CLAUDE.md` deve ser atualizado no mesmo momento para refletir o estado
real do projeto — tabelas de features, "How This Differs", "File Map" e regras críticas incluídas.

Não deixar o `CLAUDE.md` divergir do código. Se notar uma divergência existente entre `CLAUDE.md`
e o código real, sinalizar isso ao usuário antes de assumir qual dos dois está correto.

## 3. Compatibilidade com deploy gratuito no GitHub Pages

Toda decisão técnica deve ser avaliada considerando que o projeto **precisa continuar sendo
deployável gratuitamente via GitHub Pages**:
- Sem backend/servidor próprio — serviços de terceiros só são aceitáveis se forem BaaS
  totalmente client-side (ex.: Firebase Auth/Firestore), nunca um servidor mantido pelo usuário.
- Tamanho total do conteúdo publicado (`dist/` / `public/`) deve permanecer **abaixo de 1GB**.
  Antes de adicionar imagens/dados grandes, verificar o impacto no tamanho total.
- `base` do Vite e a URL do GitHub Pages devem sempre corresponder ao nome real do repositório
  (a menos que exista um domínio customizado via `CNAME`).
- Nenhuma chamada de API externa deve ser necessária em runtime no site publicado — apenas
  durante os scripts de setup local (`compile-data`, `collect-tcg`, `download-images`).

## 4. Clean code e boas práticas

- Seguir os padrões já estabelecidos no projeto (ver `CLAUDE.md` → Critical Rules).
- Evitar abstrações prematuras, código morto, e duplicação desnecessária.
- Preferir editar arquivos existentes a criar novos.
- Não adicionar comentários óbvios; comentar apenas o não-óbvio (motivo, não o quê).
- Não introduzir dependências novas sem necessidade clara (ver regra 6 abaixo).

## 5. Perguntar antes de decidir

Sempre que houver uma decisão de projeto a ser tomada — e não uma instrução explícita já dada
pelo usuário — o agente deve perguntar antes de agir. Isso inclui:
- Divergências encontradas entre documentação e código (qual é a fonte da verdade?).
- Escolhas de arquitetura, nomes de URL/repositório, formatos de dado.
- Qualquer ambiguidade sobre o que o usuário realmente quer.

Não presumir e seguir em frente silenciosamente quando existe mais de uma interpretação razoável.

## 6. Plano de entrega para grandes mudanças

Toda mudança grande (nova funcionalidade, refatoração estrutural, mudança de arquitetura,
mudança que afeta múltiplos arquivos/áreas do projeto) deve ser precedida de um **plano de
entrega** apresentado ao usuário para aprovação antes da implementação — usando o modo de
planejamento do Claude Code quando disponível.

Mudanças pequenas e localizadas (fix de bug pontual, ajuste de estilo, correção de texto) não
exigem plano formal, mas ainda assim devem ser comunicadas claramente antes/durante a execução.

## 7. Nunca rodar a aplicação pelo usuário

O agente **nunca** deve iniciar o dev server (`npm run dev`) ou qualquer outro processo que suba a
aplicação para testes visuais/manuais — nem para "verificar rapidinho" antes de reportar como
pronto. Verificação automatizada que não sobe a aplicação continua permitida e esperada (build,
type-check, lint, testes automatizados).

Quando uma mudança de UI/frontend estiver implementada, o agente deve:
- Rodar as verificações automatizadas cabíveis (`npm run build`, etc.).
- Informar ao User que terminou e pedir para ela mesma subir a aplicação (`npm run dev`) e testar.
- Não sugerir nem tentar rodar a aplicação por conta própria, mesmo com automação de browser
  disponível.

## 8. Textos da aplicação em inglês

Todo texto voltado ao usuário final, exibido na interface (labels, botões, mensagens de erro/vazio,
títulos, tooltips, textos de feedback, etc.), deve ser escrito em **inglês** — independente do
idioma usado na conversa com o User ou nos comentários/documentação do projeto (`CLAUDE.md`,
`.ai/`, commits). Comentários de código, documentação interna e esta pasta `.ai/` continuam em
português normalmente.

Se notar texto de interface já existente em português (ex.: mensagens antigas), sinalizar ao User
em vez de corrigir silenciosamente por conta própria (ver regra 5).
