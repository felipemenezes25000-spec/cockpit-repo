# Prompt de onboarding — Codex

Cole o bloco abaixo como primeira mensagem de uma sessão nova do Codex neste
repositório. Ele não pede implementação: pede leitura, prova de entendimento e
relatório de divergências. Só depois disso é que se dá a primeira tarefa.

---

```
Você vai trabalhar no Cockpit Consultório: sistema de gestão de um consultório
de estética real, em produção, com dado de saúde de pacientes reais. Next.js 15
(App Router) + Supabase, hospedado na Vercel, tudo em português.

Esta primeira sessão é só de entendimento. NÃO altere nenhum arquivo, não rode
comando de banco e não proponha refatoração. Ao final, você vai me responder
por escrito.

## Passo 1 — Leia, nesta ordem

1. `AGENTS.md` na raiz — INTEIRO. É o documento-chave e a fonte de verdade.
   Preste atenção especial à seção 9 (invariantes) e à seção 13 (erros
   conhecidos e código morto).
2. `docs/overview-sistema.md` — o produto: cada módulo, as decisões de design e
   o porquê delas.
3. `supabase/README.md` — o banco por cima.
4. `supabase/migrations/*.sql`, em ordem numérica. Leia de verdade, inclusive
   os comentários de cabeçalho: as permissões do sistema moram nas políticas de
   RLS, não na interface. A migração 0004 corrige uma falha de escalada de
   privilégio — entenda qual.
5. O código, nesta ordem: `src/lib/` (as regras), depois `src/server/consultas/`
   e `src/server/acoes/` (leitura e escrita), depois `src/components/`.

Os comentários do código são densos e explicam decisões. Não os pule: em vários
pontos eles são a única fonte de uma regra.

## Passo 2 — Prove que entendeu

Responda com precisão. Se a resposta não estiver nos documentos, vá ao código e
cite arquivo e linha. Se continuar sem resposta, diga "não achei" — não invente.

 1. Onde mora a leitura do banco e onde mora a escrita? O que impede um
    componente de consultar o Supabase direto?
 2. Por que `validarPaciente` NÃO é `server-only`, sendo que valida escrita?
 3. Uma venda de R$ 1.000 no crédito em 5x com taxa de 6%: quantos recebimentos
    são gerados, de que valor cada um, e por quê?
 4. A taxa de cartão aparece em algum lugar como despesa? Por quê?
 5. Quem pode alterar a taxa de uma venda? Em quantas camadas isso é verificado,
    e quais são elas nominalmente?
 6. Cite duas regras de permissão que a interface e a ação de servidor impõem mas
    que a RLS NÃO cobre. Por que isso é intencional em um caso?
 7. Por que `papel_atual`, `tem_acesso` e `e_administradora` vivem no schema
    `private` e não em `public`?
 8. Uma conta recém-criada no Supabase consegue ver dado de paciente? Por quê?
 9. Por que o código usa `getUser()` e nunca `getSession()`?
10. Como este sistema descobre "que dia é hoje"? O que é proibido usar, e por quê?
11. Onde uma cor pode ser escrita? Quantos papéis distintos o vermelho tem neste
    sistema, e quais?
12. Qual é o único jeito de alterar a estrutura do banco? O que se faz logo
    depois, e qual é o risco desse passo seguinte?
13. Como se apaga uma paciente? E uma venda? E um recebimento?
14. O que a RLS faz quando um perfil consulta uma tabela que não pode ver — ela
    dá erro? Que consequência isso tem para uma tela que soma valores?
15. Um formulário novo: qual é o contrato entre a página, o componente e a ação
    de servidor? Onde fica o botão de envio, e por quê exatamente ali?

## Passo 3 — Relate divergências

Depois de responder, me diga:

- **Contradições**: qualquer ponto em que o `AGENTS.md` diverge do código. Cite
  os dois lados. O documento já foi auditado uma vez, mas não é infalível — e a
  regra do projeto é que o código vence e o documento é corrigido no mesmo commit.
- **O que ficou obscuro**: o que você entendeu pela metade e precisaria conferir
  antes de mexer.
- **O que eu precisaria decidir**: qualquer coisa que dependa da clínica e não
  esteja definida. A seção 10 do AGENTS.md lista as que já conhecemos — me diga
  se encontrou outras.

## Passo 4 — As linhas vermelhas

Estas valem a partir de agora, em toda tarefa:

- **Nunca** use a chave `service_role`, em lugar nenhum.
- **Nunca** edite uma migração já aplicada. Correção é arquivo novo.
- **Nunca** edite `src/lib/supabase/tipos-banco.ts` à mão — é gerado.
- **Nunca** rode `db:push`, `db:tipos`, `dados:exemplo` ou `dados:limpar`: não
  existe banco local nem de homologação, os quatro falam direto com o banco de
  produção da clínica. Quem aplica sou eu.
- **Nunca** tente `supabase login`. Você não tem e não terá credencial deste
  banco — é decisão, não limitação de ambiente a contornar. Se o login falhar,
  não insista nem procure caminho alternativo: não é para funcionar.
  Para escrever código você não precisa dele — o schema inteiro está em
  `supabase/migrations/*.sql` e em `src/lib/supabase/tipos-banco.ts`.

  Quando a tarefa exigir mudança no banco: escreva a migração nova, **pare**, e
  me diga o que ela faz. Eu aplico e regenero os tipos.

  Até eu aplicar, **seu código não vai passar no typecheck** — `tipos-banco.ts`
  ainda não conhece as tabelas novas. Isso é esperado. Não edite o arquivo
  gerado à mão para "consertar": me avise que o typecheck só fecha depois da
  aplicação.
- **Nunca** rode `npm run build` sem antes conferir a porta 3000. `next build` e
  `next dev` compartilham a pasta `.next`: buildar com o dev no ar corrompe o
  servidor em execução, a aplicação abre sem CSS nenhum e algumas rotas dão 500.
  O sintoma não parece erro de build, e leva a caçar bug no lugar errado.
  `lint` + `typecheck` já cobrem uma alteração comum.
- **Nunca** escreva cor fora de `src/app/globals.css`.
- **Nunca** calcule data sem passar por `src/lib/dates.ts` (fuso da clínica).
- **Nunca** faça conta de dinheiro em ponto flutuante — centavos inteiros,
  `src/lib/moeda.ts`.
- **Nunca** confie em validação de formulário: a que vale é a da ação de servidor.
- **Nunca** invente uma regra de negócio que não está definida — pergunte. Vale
  em especial para regra de lucro, períodos de retorno e horário de funcionamento.
- Toda ação de servidor começa com `usuarioAtual()`. O layout não protege server
  action.

E o inverso, que também importa: a seção 13 do AGENTS.md lista bugs conhecidos e
código morto. **Não os imite por analogia, e não os conserte por conta própria** —
vários tocam dinheiro e permissão. Se um deles atrapalhar sua tarefa, me avise.

## Passo 5 — Como trabalhar daqui em diante

- Tudo em português: interface, mensagens, funções, variáveis, comentários,
  colunas, migrações, commits.
- Comentário explica o PORQUÊ, não o quê. É o padrão do repositório inteiro.
- Antes de dar qualquer tarefa por concluída: `npm run lint` e
  `npm run typecheck` limpos — e só esses dois. Não existe suíte de testes: não
  diga que "os testes passam".
- Não comite nem faça push sem eu pedir. A branch é `main`, única.
- Se encontrar algo que contradiz o `AGENTS.md`, corrija o documento no mesmo
  commit da mudança.

Comece pelo Passo 1. Não implemente nada até eu confirmar que seu entendimento
está correto.
```
