# Implantar e atualizar o Cockpit

Guia prático para pôr o Cockpit no ar (Supabase + Vercel) e para levar um banco
antigo até a versão atual. Os comandos são copiáveis; onde o shell importa, há
a versão do PowerShell.

> [!IMPORTANT]
> **Estes passos são do dono do projeto** (ou de quem ele autorizar). Eles
> mexem no banco de uma clínica real, com dado de saúde. Agente de IA não se
> autentica no Supabase nem roda nada contra produção ([`AGENTS.md`](../AGENTS.md) §2).

| Você quer… | Vá para |
|---|---|
| Subir um projeto novo, do zero | [A. Projeto novo](#a-projeto-novo-do-zero) |
| Atualizar um banco que parou na migração 0018 | [B. Atualizar da 0018 até a 0032](#b-atualizar-um-banco-que-parou-na-0018) |
| Saber o que no repositório aponta para a infraestrutura de outro projeto | [C. O que trocar no repositório](#c-o-que-no-repositório-aponta-para-outro-projeto) |
| Entender o custo da CI e rodar os mesmos gates na sua máquina | [D. CI: custo e gates locais](#d-ci-custo-em-repositório-privado-e-os-mesmos-gates-na-sua-máquina) |
| Resolver um sintoma depois do deploy | [Problemas comuns](#problemas-comuns) |

---

## Três regras antes de começar

1. **Banco e código mudam na mesma janela.** Código novo contra banco antigo
   quebra: abaixo da 0025 caem a busca de pacientes e o Relacionamento, abaixo
   da 0028 toda venda nova dá `PGRST202` e abaixo da 0032 a assinatura não
   abre. O contrário **também** quebra: a 0032 derruba as assinaturas antigas
   das funções de assinatura (`documento_link_estado`,
   `documento_para_assinatura`, `documento_assinar_por_link`,
   `documento_responder_por_link`, `documento_assinar` e
   `documento_link_criar`), então o app antigo perde a assinatura no balcão e
   por link no instante do `db push`. Faça banco, segredo, variáveis e deploy
   de uma vez.
2. **O segredo da assinatura mora em dois lugares.** O valor vai para a Vercel
   (`ASSINATURA_SEGREDO_SERVIDOR`) e o SHA-256 dele vai para o banco
   (`private.segredo_do_servidor`). Sem um dos dois, toda assinatura responde
   `nao_autorizado`.
3. **Duas coisas nunca.** A chave `service_role` não entra na aplicação, nem
   na Vercel, nem no `.env.local`. E usuário não se cria com `insert` em
   `auth.users`: isso derruba o login de todo mundo com "Database error
   querying schema".

---

## Variáveis de ambiente

Modelo comentado em [`.env.local.example`](../.env.local.example). Nenhuma delas
tem valor fixo no código.

| Variável | Obrigatória? | Onde | Para quê |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Sim.** Sem ela a aplicação não sobe | Vercel e `.env.local` | URL do projeto Supabase. O middleware também monta a CSP a partir dela. É pública e entra no build |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Sim.** Sem ela a aplicação não sobe | Vercel e `.env.local` | Chave `anon public` (ou `publishable`). É pública por natureza: quem protege o dado é a RLS |
| `ASSINATURA_SEGREDO_SERVIDOR` | **Sim, para a assinatura.** A aplicação sobe sem ela, mas nenhum documento se assina | Vercel (só servidor, sem `NEXT_PUBLIC_`) e `.env.local`. O SHA-256 vai para o banco | Segredo que o banco confere em toda função pública de assinatura e no balcão. Mínimo de 32 caracteres |
| `ORIGEM_PUBLICA` | **Sim, em produção, para o link de assinatura** | Vercel (só servidor) | Origem do link que vai para a paciente (`https://seu-dominio.com.br`: só protocolo, domínio e porta, sem barra no fim). Vazia em produção, o link é recusado. Também é a base da prévia do link (`og:image`) |
| `SMTP_URL` | Opcional. Liga o código por e-mail | Vercel (só servidor) | Servidor de envio, ex.: `smtps://usuario:senha@smtp.provedor.com.br:465` |
| `SMTP_REMETENTE` | **Obrigatória se houver `SMTP_URL`** | Vercel (só servidor) | Remetente, ex.: `"Clínica <nao-responda@seu-dominio.com.br>"`. Com `SMTP_URL` e sem ela, a tela oferece o código e o envio falha |
| `EMAIL_PASTA` | Só desenvolvimento e testes | `.env.local` (a CI usa `e2e/.emails`) | Grava cada e-mail como JSON numa pasta em vez de enviar. É ignorada quando `VERCEL_ENV=production`. **Não defina na Vercel** |
| `service_role` | **Nunca** | Em lugar nenhum | Ignora toda a RLS. Fica fora da aplicação |

Na Vercel, variável alterada só vale **no próximo deploy**. As `NEXT_PUBLIC_*`
entram no build, então mudar uma delas exige build novo.

---

## Preparar a máquina (uma vez)

Precisa de **Node 22+** (a CI usa 22; o `@supabase/supabase-js` 2.117 declara
`engines: node >=22`) e de Git. Docker só é preciso para o banco local e os
gates da [seção D](#d-ci-custo-em-repositório-privado-e-os-mesmos-gates-na-sua-máquina).

```bash
git clone <url-do-seu-repositório> cockpit
cd cockpit
npm ci                       # instala tudo, inclusive o CLI do Supabase (devDependency)
npx supabase login           # abre o navegador
npx supabase link --project-ref <SEU_REF>
```

O `<SEU_REF>` é o trecho do meio da URL do painel:
`https://supabase.com/dashboard/project/<SEU_REF>`. O `link` pede a senha do
banco (Project Settings → Database). O vínculo fica em `supabase/.temp/`, que
está no `.gitignore`: vale só para esta máquina.

> [!WARNING]
> Depois do `link`, `npm run db:push`, `db:tipos`, `dados:exemplo` e
> `dados:limpar` falam **direto com o projeto vinculado**. Confira o ref antes
> de cada um.

---

## A. Projeto novo, do zero

### A1. Criar o projeto no Supabase

- Crie o projeto em **`sa-east-1` (São Paulo)**, ao lado da Vercel `gru1` que o
  [`vercel.json`](../vercel.json) fixa. **A região não muda depois:** trocar
  exige projeto novo e migração de dados.
- Anote o ref, a URL e a chave `anon` (Project Settings → API).
- Confira a versão do Postgres com `show server_version;` no SQL editor. O
  ambiente local e a CI usam o 17 (`supabase/config.toml`, `major_version = 17`).

### A2. Aplicar as 32 migrações

Faça o [preparo da máquina](#preparar-a-máquina-uma-vez) com o ref novo e depois:

```bash
npx supabase migration list      # 0001…0032 só na coluna Local; Remote vazia
npx supabase db push --dry-run   # mostra o que seria aplicado, sem aplicar
npm run db:push                  # aplica 0001 → 0032, em ordem, sem seed
```

Num banco vazio não há pré-conferência nem backfill: nada antigo pode violar
as regras novas.

### A3. Gravar o segredo da assinatura

Siga [O segredo da assinatura](#o-segredo-da-assinatura), logo abaixo. Guarde o
valor para a Vercel (passo A7).

### A4. Conferir os tipos e o banco

```bash
npm run db:tipos
git diff -- src/lib/supabase/tipos-banco.ts
```

O diff deve sair vazio ou mudar só a linha `PostgrestVersion` do bloco
`__InternalSupabase`. Nesse caso, descarte (`git checkout -- src/lib/supabase/tipos-banco.ts`):
a CI regenera os tipos a partir do banco local e compara. Qualquer outra
diferença quer dizer que o banco não bate com as migrações. Pare e investigue.

Depois rode as [conferências SQL](#conferências-sql-depois-do-push).

### A5. Configurar o Auth

Siga [Auth do Supabase](#auth-do-supabase): cadastro público desligado, URLs
de redirecionamento, senha mínima e SMTP do Auth.

### A6. Criar a primeira pessoa (administradora)

Siga [Primeiro usuário](#primeiro-usuário).

### A7. Publicar na Vercel

Siga [Vercel](#vercel). As variáveis entram **antes** do primeiro deploy.

### A8. Cadastrar o básico antes de usar

| O quê | Onde | Por quê |
|---|---|---|
| Taxas de cartão | Financeiro → Taxas (administradora) | Desde a 0020, venda no cartão sem taxa manual exige uma linha **ativa** do mesmo tipo e parcelamento. Sem ela: "Venda no cartão precisa da taxa da tabela padrão." |
| Procedimentos | Configurações → Procedimentos (administradora) | Preenchem duração e valor na agenda e na venda |
| Profissionais | SQL editor (não há tela de equipe) | Sem profissional ativa, "Quem atende" fica vazio e a agenda não marca nada |
| Modelos de documento | Documentos → Modelos (administradora) | Contrato, termo, orientação e anamnese nascem de um modelo |

```sql
insert into public.profissionais (nome, especialidade)
values ('Dra. Nome Sobrenome', 'Estética');
-- Para tirar alguém da agenda: update ... set ativo = false. Nunca DELETE.
```

Não rode `npm run dados:exemplo` em produção, a não ser para uma demonstração
num banco vazio. Ele recusa carregar se já houver dado real.

---

## B. Atualizar um banco que parou na 0018

Para quem tem o banco em `0001…0018` e o código novo (0019 → 0032). São 14
migrações de uma vez. Leia a lista inteira antes de começar e faça numa
janela sem uso da clínica.

<details>
<summary><b>O que cada migração da 0019 à 0032 faz com um banco em uso</b></summary>

| Migração | O que muda | Risco com dado antigo |
|---|---|---|
| `0019` privilégio mínimo | Grants tabela a tabela, uma política por operação, **sem DELETE** (exceto fotos), UPDATE de recebimento só do financeiro, auditoria ampliada, o próprio perfil só muda o nome | Nenhum. A escrita que dependia de DELETE ou de `for all` deixa de passar |
| `0020` financeiro conferido | Gatilho `vendas_confere_taxa`, recebimento confirmado imutável | Vendas antigas não são revalidadas. **Venda nova no cartão exige taxa ativa na tabela** |
| `0021` agenda sem choque | Gatilho com trava por profissional (`23P01`) | Não valida o legado: choque antigo só esbarra se alguém mexer no horário |
| `0022` documentos | Documento só nasce do modelo, evidência escrita pelo banco, pergunta da anamnese congela | Três CHECKs entram `NOT VALID` e só são validadas sem legado violando. Link exige data de nascimento na ficha |
| `0023` venda só pela função | Venda, histórico e ajuste só por `venda_registrar`/`venda_alterar_pagamento` (`SECURITY DEFINER`), confirmação coerente | Não mexe em dado. Venda antiga sem recebimento fica para a clínica decidir |
| `0024` fotos | Reconciliação (só leitura), UPDATE por coluna, sequências sem `anon` | Nenhum |
| `0025` contato estruturado | Backfill de `pendencias.origem`, um contato por paciente/origem/dia, `pacientes.busca` sem acento (`unaccent`), título de prontuário até 160 | **A única que pode falhar** (passo B5) |
| `0026` marca de exemplo | `exemplo` não se grava com sessão | Nenhum. Seed e SQL editor rodam sem sessão |
| `0027` o banco escreve a evidência | Autor e hora de versão de modelo, resposta e foto; CHECK `recebimentos_taxa_ate_o_valor` `NOT VALID` | Só validada sem legado violando |
| `0028` venda idempotente | `vendas.chave_envio`, `p_chave` em `venda_registrar`, foto só com o objeto no bucket | Nenhum. **O app novo contra banco sem ela dá `PGRST202` em toda venda** |
| `0029`–`0031` Captação | Leads, etapas, metas comerciais, contatos | Nada a migrar vindo da 0018 |
| `0032` assinatura com prova | Segredo do servidor, código por e-mail, rubrica, fatores, código de verificação, manifesto, carimbo de tempo, assinatura imutável | Cria `private.segredo_do_servidor` **vazia**: até o hash entrar, toda assinatura responde `nao_autorizado`. Assinaturas antigas ganham código de verificação, fatores e manifesto (sem carimbo) |

</details>

### B0. Congelar o deploy

No painel da Vercel (se houver), confira qual branch publica em produção e
**desligue o deploy automático** até o passo B10. Nada do código novo pode
chegar lá antes do banco.

### B1. Backup

No painel do Supabase, confira que o PITR ou um backup manual recente está
disponível. Sem backup, não siga.

### B2. Preparar a máquina e vincular

[Preparo da máquina](#preparar-a-máquina-uma-vez) com o ref do projeto, depois:

```bash
npx supabase migration list
```

A coluna **Remote** precisa mostrar exatamente `0001` a `0018`, e a **Local**
de `0001` a `0032`. O `db push` compara pelo prefixo numérico dos arquivos.

Se o histórico remoto estiver vazio ou em outro formato (migrações aplicadas
pelo painel, com carimbo de data), **pare**. Confirme que o banco está mesmo na
0018:

```sql
select
  to_regprocedure('private.documento_campos_criar(uuid)') is not null as tem_0018,  -- true
  to_regprocedure('private.perfil_proprio_so_nome()')     is not null as tem_0019;  -- false
```

e alinhe o histórico com o comando do CLI (não documentado no repositório;
confira na ajuda do CLI antes de rodar):

```bash
npx supabase migration repair --status applied 0001 0002 0003 0004 0005 0006 0007 0008 0009 0010 0011 0012 0013 0014 0015 0016 0017 0018
```

Versões estranhas no remoto saem com `--status reverted <versão>`.

### B3. Versão do Postgres

```sql
show server_version;
```

O repositório foi testado em Postgres 17 (`supabase/config.toml`). Isso não
muda o `push`, mas se o remoto for outra versão, ajuste `major_version` no
`config.toml` para testar localmente com a mesma, ou atualize o projeto pelo
painel antes.

### B4. Congelar o uso

Combine com a clínica uma janela sem uso. Do `db push` (B7) ao deploy (B10), o
app antigo fica **sem assinatura** (a 0032 derruba as funções antigas).

### B5. Pré-conferência que bloqueia (só leitura, SQL editor)

A 0025 **falha de propósito** se o histórico tiver algum destes casos. As duas
consultas precisam voltar **vazias**:

```sql
-- contato repetido na mesma paciente, tipo e dia
select paciente_id, tipo, (resolvida_em at time zone 'America/Sao_Paulo')::date as dia, count(*)
  from public.pendencias
 where situacao = 'resolvida' and paciente_id is not null and resolvida_em is not null
   and ((tipo = 'pesquisa' and descricao like 'Convite para avaliação no Google enviado%')
     or (tipo = 'outro' and descricao like 'Mensagem de aniversário enviada%'))
 group by 1, 2, 3 having count(*) > 1;

-- título de prontuário acima de 160 caracteres
select id from public.prontuarios where char_length(titulo) > 160;
```

Se voltar linha, **não corrija por script**. É histórico da clínica, e ela
decide caso a caso. Se o `db push` rodar assim mesmo, ele aplica 0019–0024 e
para na 0025, sem registrá-la.

### B6. Pré-conferência informativa (não derruba a migração)

Estas linhas antigas não impedem o `push`, mas a regra nova fica `NOT VALID` e
elas passam a ser recusadas no próximo UPDATE. Anote para a clínica:

```sql
-- canal do link fora do formato que a aplicação grava (0022)
select id, canal_envio from public.documento_links
 where not (canal_envio = '' or canal_envio ~ '^WhatsApp[ 0-9()+.-]{0,30}$');

-- versão de prontuário acima dos limites (0022)
select id from public.prontuario_versoes
 where length(queixa) > 6000 or length(avaliacao) > 6000 or length(conduta) > 6000
    or length(evolucao) > 6000 or length(orientacoes) > 6000
    or length(observacoes) > 6000 or length(motivo) > 240;

-- foto com caminho fora de <prontuario_id>/<uuid>.(jpg|png|webp) (0022)
select id, caminho from public.prontuario_imagens
 where caminho !~ ('^' || prontuario_id::text
       || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$');

-- recebimento com taxa maior que o valor (0027)
select id from public.recebimentos where taxa_valor > valor;

-- venda sem recebimento (a 0023 fecha a porta por onde elas entraram)
select v.id from public.vendas v
 where not exists (select 1 from public.recebimentos r where r.venda_id = v.id);
```

Venda antiga com taxa incoerente e choque antigo de agenda não são
revalidados: só esbarram se alguém editar a linha.

### B7. Aplicar

```bash
npx supabase db diff --linked    # opcional: o que vai mudar
npx supabase db push --dry-run   # deve listar 0019 … 0032
npm run db:push                  # aplica 0019 → 0032, em ordem
```

### B8. Segredo da assinatura, imediatamente

Sem o hash no banco, toda função pública de assinatura e o balcão respondem
`nao_autorizado`. Siga [O segredo da assinatura](#o-segredo-da-assinatura).

### B9. Tipos e conferências

```bash
npm run db:tipos
git diff -- src/lib/supabase/tipos-banco.ts   # vazio, ou só a linha PostgrestVersion
```

O arquivo do repositório já inclui a 0032. Depois, rode as
[conferências SQL](#conferências-sql-depois-do-push).

### B10. Variáveis e deploy

1. Na Vercel, confira ou cadastre as [variáveis](#variáveis-de-ambiente):
   `ASSINATURA_SEGREDO_SERVIDOR`, `ORIGEM_PUBLICA` e, se houver, `SMTP_URL`
   com `SMTP_REMETENTE`.
2. Confira o [Auth](#auth-do-supabase) (cadastro público desligado, redirect de
   `/redefinir-senha`).
3. Publique o código (push ou merge no branch de produção) e religue o deploy
   automático, se o desligou no B0.

Se ainda não houver administradora ativa, veja [Primeiro usuário](#primeiro-usuário).

### B11. Backfill de novo, depois do deploy

Se o app antigo ficou no ar entre o `db push` e o deploy, ele gravou convite
e aniversário como `tarefa`. O UPDATE é o mesmo da 0025, idempotente, e não
mexe em `atualizado_em`:

```sql
begin;
alter table public.pendencias disable trigger pendencias_atualizado_em;
update public.pendencias
   set origem = private.pendencia_origem_pelo_texto(tipo, descricao, situacao, paciente_id, resolvida_em)
 where origem = 'tarefa'
   and private.pendencia_origem_pelo_texto(tipo, descricao, situacao, paciente_id, resolvida_em) <> 'tarefa';
alter table public.pendencias enable trigger pendencias_atualizado_em;
commit;
```

Se falhar com `23505`, nada muda: a consulta do B5 acha o par, a clínica
decide, e repita.

### B12. Validar na aplicação

Siga [Validar na aplicação](#validar-na-aplicação).

---

## O segredo da assinatura

**Gerar** o valor e o hash de uma vez (funciona no bash e no PowerShell):

```bash
node -e "const c=require('crypto');const s=c.randomBytes(32).toString('base64url');console.log('ASSINATURA_SEGREDO_SERVIDOR='+s);console.log('SHA256='+c.createHash('sha256').update(s,'utf8').digest('hex'))"
```

Já tem o segredo e só quer o hash? É o SHA-256 em hexadecimal do valor em
UTF-8, sem espaços nas pontas (o mesmo cálculo da aplicação e do banco):

```bash
node -e "console.log(require('crypto').createHash('sha256').update(process.argv[1].trim(),'utf8').digest('hex'))" "<segredo>"
```

**Gravar** o hash no banco (SQL editor). A CHECK só aceita 64 caracteres
hexadecimais minúsculos:

```sql
insert into private.segredo_do_servidor (id, hash)
values (1, '<sha256 hex>')
on conflict (id) do update set hash = excluded.hash, definido_em = now();
```

**Guardar** o valor na Vercel como `ASSINATURA_SEGREDO_SERVIDOR` (Production,
sem `NEXT_PUBLIC_`) e fazer um deploy.

Regras:

- Mínimo de 32 caracteres. A aplicação e o banco recusam menos.
- **Nunca** reutilize o segredo de desenvolvimento de
  `supabase/usuarios-locais.json`. Ele está no repositório.
- **Trocar** é mudar nos dois lugares na mesma janela: grave o hash novo,
  atualize a variável e faça o deploy.
- Não mande o segredo por mensagem nem o cole em issue. O banco só vê o hash.

---

## Auth do Supabase

| Onde, no painel | O que fazer | Por quê |
|---|---|---|
| Authentication → Sign In / Providers → Email → "Allow new users to sign up" | **Desligar** | Ninguém se cadastra sozinho. Mesmo assim, a 0004 garante que conta nova nasça inativa e como recepção |
| Authentication → Sign In / Providers → login anônimo | **Desligado** | O local também é assim (`config.toml`) |
| Authentication → Sign In / Providers → Email → tamanho mínimo da senha | **12** | É a regra da interface. Sem isso, o Auth aceita senha menor pela API |
| Authentication → URL Configuration → Site URL | A origem de produção (`https://seu-dominio.com.br`) | Equivale ao `site_url` do `supabase/config.toml` local |
| Authentication → URL Configuration → Redirect URLs | `https://seu-dominio.com.br/redefinir-senha` (e cada domínio que for usado) | A recuperação de senha manda `redirectTo = <origem>/redefinir-senha` |
| Authentication → Emails → SMTP Settings | Um SMTP de verdade | O SMTP padrão do Supabase não entrega fora da equipe do projeto |
| Authentication → Emails → modelo "Reset password" | Link abaixo | Funciona mesmo com o e-mail aberto em outro aparelho |
| Project Settings → Data API → schemas expostos | Só `public` e `graphql_public` | O schema `private` não pode virar endpoint |

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=recovery">Redefinir minha senha</a>
```

> [!NOTE]
> **Dois SMTPs, dois lugares.** O SMTP do **Auth** (painel do Supabase) envia a
> recuperação de senha. O SMTP da **aplicação** (`SMTP_URL` + `SMTP_REMETENTE`
> na Vercel, via `nodemailer`) envia o código de 6 dígitos da assinatura. Podem
> ser o mesmo provedor.

---

## Primeiro usuário

1. Supabase → Authentication → Users → **Add user** (e-mail e senha).
2. A pessoa aparece em `public.perfis` como **recepção, inativa** (0004).
3. Ative e promova no SQL editor:

```sql
update public.perfis
   set ativo = true, papel = 'administradora'
 where id = (select id from auth.users where email = 'pessoa@clinica.com.br');
```

Os perfis são `administradora`, `financeiro` e `recepcao`. Ainda não há tela
de gestão de acesso ("Acesso e permissões" aparece como "em breve"). Para
tirar o acesso de alguém, use `ativo = false`; não apague a conta.

---

## Vercel

1. Importe o repositório como projeto Next.js. O [`vercel.json`](../vercel.json)
   já fixa `framework: nextjs` e a região `gru1`.
2. Settings → Build and Deployment → Node.js Version: **22.x** (o que a CI usa).
   O `postinstall` ([`scripts/corrigir-ping-react.mjs`](../scripts/corrigir-ping-react.mjs))
   roda no build; é esperado.
3. Settings → Environment Variables (Production): `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ASSINATURA_SEGREDO_SERVIDOR`,
   `ORIGEM_PUBLICA` e, se houver, `SMTP_URL` + `SMTP_REMETENTE`.
4. Deploy. Se o projeto publica cada push no branch de produção, migração nova
   vai para o banco **antes** do push que leva o código dela.

Opcional: log drain (Settings → Drains, exige plano Pro). O formato do log
está no [`AGENTS.md`](../AGENTS.md) §3. O carimbo de tempo roda depois da
resposta (`after()`) e chama DigiCert → Sectigo → FreeTSA, com 6 s por
autoridade. Não precisa configurar nada para isso.

---

## Conferências SQL depois do push

Todas só de leitura, no SQL editor.

**0032**

```sql
-- 1. a migração está no histórico
select count(*) from supabase_migrations.schema_migrations where version = '0032';   -- 1

-- 2. toda assinatura antiga ganhou código de verificação
select count(*) from public.documento_assinaturas where codigo_verificacao is null;  -- 0

-- 3. anon executa exatamente as 7 funções públicas de assinatura
select p.proname
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')
 order by 1;
-- documento_assinar_por_link, documento_assinatura_carimbar, documento_link_codigo_enviar,
-- documento_link_estado, documento_para_assinatura, documento_responder_por_link, documento_verificar

-- 4. o hash gravado é o do segredo da Vercel
select hash from private.segredo_do_servidor;   -- igual ao SHA256 calculado na sua máquina
```

**0029 a 0031 (Captação)**

```sql
select count(*) from supabase_migrations.schema_migrations where version in ('0029','0030','0031');  -- 3
select bool_and(relrowsecurity) from pg_class
 where oid in ('public.leads'::regclass, 'public.lead_etapas'::regclass,
               'public.metas_comerciais'::regclass, 'public.lead_interacoes'::regclass);         -- t
select has_function_privilege('anon', 'public.lead_converter_em_paciente(uuid)', 'execute');      -- f
select count(*) from pg_constraint where conname = 'leads_encerrado_sem_retorno';                 -- 1
```

**0019 a 0028** (a lista completa, com o que fazer em cada resultado, está no
[`supabase/README.md`](../supabase/README.md#pendente-de-aplicação-em-produção), passo 6):

```sql
select proname, prosecdef from pg_proc where proname in ('venda_registrar','venda_alterar_pagamento');  -- os dois true
select privilege_type from information_schema.role_table_grants
 where grantee = 'authenticated' and table_name = 'vendas';                                          -- só SELECT
select indexname from pg_indexes where indexname in ('pendencias_contato_um_por_dia','vendas_chave_envio_unica');  -- 2 linhas
select pg_get_function_identity_arguments('public.venda_registrar'::regproc);                       -- termina em p_chave uuid
select conname, convalidated from pg_constraint
 where conname in ('prontuarios_titulo_maximo','documento_links_canal_formato','prontuario_versoes_limites',
                   'prontuario_imagens_caminho_forma','recebimentos_taxa_ate_o_valor');
-- true em todas; false = há linha antiga fora da regra (ver B6), decisão da clínica
```

---

## Validar na aplicação

| Quem | O quê |
|---|---|
| Recepção | Registra uma venda; busca uma paciente sem acento; dá um duplo clique no registro de venda e confere que nasceu **uma** venda |
| Financeiro | Confirma o recebimento |
| Administradora | Abre as fotos de um prontuário e Configurações → Fotos; envia uma foto nova (a 0028 lê tipo e tamanho do Storage hospedado) |
| Relacionamento | Os convites antigos aparecem na aba Avaliações |
| Assinatura | Gera um link (a ficha precisa de data de nascimento; para o código por e-mail, de e-mail válido), abre no celular, recebe o código, lê, assina com rubrica, abre `/verificar/<código>` e baixa o manifesto (`.txt`) e o carimbo (`.tsr`) na ficha do documento |

Conferência fora do sistema:

```bash
sha256sum manifesto.txt                    # deve dar o "Registro (SHA-256)" da via
openssl ts -reply -in carimbo.tsr -text    # autoridade, hora e o mesmo hash carimbado
```

As assinaturas feitas antes da 0032 ficam sem carimbo. Na ficha do documento,
"Carimbar agora" pede o carimbo.

---

## C. O que no repositório aponta para outro projeto

O código em `src/` não tem domínio nem ref fixo: a CSP sai de
`NEXT_PUBLIC_SUPABASE_URL` e a prévia de link, de `ORIGEM_PUBLICA`. O que aponta
para a infraestrutura de outro projeto está na configuração e na documentação:

| Onde | O que aponta | O que fazer |
|---|---|---|
| [`.mcp.json`](../.mcp.json) | Servidor MCP do Supabase com `project_ref=pghmzbtfsaupwezglddo` e as features `database`, `development`, `functions` e `branching` | Troque pelo seu ref ou **apague o arquivo**. Com ele, uma ferramenta de IA ganha acesso de gerenciamento ao projeto indicado |
| [`AGENTS.md`](../AGENTS.md) §3 (tabela de hospedagem, l.369–384) | Projeto Vercel `cockpit-consultorio` e a URL `cockpit-consultorio.vercel.app`, o GitHub `felipemenezes25000-spec/cockpit-repo`, o Supabase `pghmzbtfsaupwezglddo` em `us-west-2` e a "exceção de região" | Reescreva com o seu repositório, o seu ref, a sua região e o seu projeto Vercel |
| [`AGENTS.md`](../AGENTS.md) §1 (l.35–36), §4 (l.511–537) e §12 (l.3002–3011) | Registros de aplicação em produção (23/09 e 25/09/2026) e o projeto Vercel `cockpit-consultorio` | Deixe claro que são do outro projeto, ou troque pelos seus |
| [`supabase/README.md`](../supabase/README.md) l.3–4, "Projeto" (l.43–56), l.112 e l.146 | Região `us-west-2`, ref `pghmzbtfsaupwezglddo` e os registros "Aplicado em 23/09" e "Aplicado em 25/09" | Idem |

> [!NOTE]
> Se o seu projeto é o `Cockpit-Consultorio2` (`khoaluytzzagtwmpaukx`,
> `sa-east-1`), o `supabase/README.md` diz que ele "deixou de ser o de
> produção" em 23/09/2026. É o registro do outro projeto, não uma instrução
> para o seu.

O que **não** precisa trocar:

- `supabase/config.toml` → `project_id = "cockpit-consultorio"` é só o nome dos
  contêineres locais (`scripts/testes-banco.mjs` usa `supabase_db_<project_id>`).
- `supabase/usuarios-locais.json`: contas e segredo que só existem no banco local.

Só se for **outra clínica**: o nome está em `src/app/layout.tsx` (título),
`src/lib/nav.ts` (`CLINICA`), `src/lib/relacionamento.ts` (mensagens de WhatsApp
e `LINK_AVALIACAO_GOOGLE`) e `src/app/opengraph-image.alt.txt`. O favicon, o
ícone do iPhone e a prévia do link saem de `npm run marca:gerar`.

---

## D. CI: custo em repositório privado e os mesmos gates na sua máquina

### O que roda

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml): quatro jobs em
paralelo em `ubuntu-latest`, disparados em pull request, em push no `main` e à
mão (`workflow_dispatch`). Um push novo no mesmo ref cancela a execução
anterior. Nenhum job usa banco real nem segredo da clínica.

| Job | Limite | Medido em 26/09/2026 (commit `1764905`) |
|---|---|---|
| Qualidade (lint, tipos, Vitest) | 15 min | 55 s |
| Build de produção | 15 min | 1 min 25 s |
| Banco (migrações, seed, `test:banco`, tipos) | 20 min | 2 min 38 s |
| E2E (Chromium, WebKit e iPhone) | 45 min | 20 min 33 s |
| **Total por execução** | | **~25 min** (27 contando cada job arredondado para cima). Na execução anterior, de `70052f4`: ~19 min (21 arredondados) |

O E2E consome de 75% a 80% do tempo.

### Quanto custa

Os valores abaixo são da documentação de cobrança do GitHub, não do
repositório. **Confira a página atual antes de decidir:** preços e franquias
mudam.

| Situação | Minutos inclusos por mês | Execuções completas (~21 a 27 min) |
|---|---|---|
| Repositório **público** | ilimitados nos runners padrão | sem custo |
| Privado, plano **Free** | 2.000 | ~75 a ~95 |
| Privado, **Pro** ou **Team** | 3.000 | ~110 a ~140 |
| Acima da franquia | Linux 2-core a US$ 0,006/min | ~US$ 0,13 a 0,16 por execução |

Cada push no `main` e cada atualização de PR conta, e uma execução cancelada
também gasta o que já rodou.

**Para economizar** sem perder a rede de segurança, deixe o E2E só para pull
request e disparo manual:

```yaml
  e2e:
    name: E2E (Chromium e WebKit)
    if: github.event_name != 'push'
```

e rode o E2E na sua máquina antes do push (abaixo). Para disparar a CI inteira à
mão: `gh workflow run ci.yml --ref main`. Empurrar mudança em
`.github/workflows/` exige token com o escopo `workflow`.

### Os mesmos gates, na sua máquina

Precisa de Docker (Supabase local, Postgres 17) e da primeira instalação dos
navegadores: `npx playwright install chromium webkit`.

| Job da CI | Na sua máquina |
|---|---|
| Qualidade | `npm run lint` · `npm run typecheck` · `npm test` |
| Banco | `npx supabase start` · `npm run local:usuarios` · `npm run test:banco` · `npm run db:tipos:local` e `git diff --exit-code -- src/lib/supabase/tipos-banco.ts` |
| Build | `npm run build` (**nunca** com o `npm run dev` no ar: os dois escrevem em `.next`) |
| E2E | `.env.local` local com as quatro variáveis abaixo · `npm run build` · E2E sobre o build (abaixo) |

`.env.local` para o E2E (o mesmo que a CI gera):

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<chave anônima local impressa pelo supabase start>
ASSINATURA_SEGREDO_SERVIDOR=<segredoDoServidor de supabase/usuarios-locais.json>
EMAIL_PASTA=e2e/.emails
```

O E2E recusa rodar se o `.env.local` não apontar para `127.0.0.1` ou
`localhost`. Sem `CI`, o Playwright sobe o `npm run dev` (ou reaproveita o que
estiver na porta 3000). Para reproduzir a CI, sobre o build (com `CI` definido,
o Playwright sobe o `npm run start` e a porta 3000 precisa estar livre):

```bash
# bash
CI=1 npx playwright test
```

```powershell
# PowerShell
$env:CI = "1"; npx playwright test; Remove-Item Env:CI
```

Em sequência, tudo de uma vez (bash):

```bash
npm run lint && npm run typecheck && npm test \
  && npx supabase start && npm run local:usuarios && npm run test:banco \
  && npm run db:tipos:local && git diff --exit-code -- src/lib/supabase/tipos-banco.ts \
  && npm run build && CI=1 npx playwright test
```

Para um banco local do zero: `npx supabase db reset` e, de novo,
`npm run local:usuarios` (o reset apaga as contas e o hash do segredo).

---

## Problemas comuns

| Sintoma | Causa provável | Conserto |
|---|---|---|
| Toda venda nova falha (`PGRST202`) | App novo contra banco sem a 0028 | `npm run db:push` |
| Busca de pacientes ou Relacionamento quebram | Banco anterior à 0025 | `npm run db:push` |
| O link mostra "não foi possível abrir agora"; o balcão avisa que a assinatura não está configurada | `ASSINATURA_SEGREDO_SERVIDOR` ausente na Vercel, ou hash diferente no banco | [O segredo da assinatura](#o-segredo-da-assinatura), e um deploy novo |
| "O endereço público do sistema não está configurado corretamente" | `ORIGEM_PUBLICA` vazia ou inválida em produção | Preencha na Vercel e faça deploy |
| O painel do link não oferece o código por e-mail | Sem `SMTP_URL` | `SMTP_URL` + `SMTP_REMETENTE` |
| O envio do código falha; o log diz "SMTP_REMETENTE não configurado" | `SMTP_URL` sem remetente | Preencha `SMTP_REMETENTE` |
| O link não é criado | A paciente não tem data de nascimento na ficha (e, para o código, e-mail válido) | Complete a ficha |
| "Venda no cartão precisa da taxa da tabela padrão." | Não há taxa ativa do mesmo tipo e parcelamento | Financeiro → Taxas |
| "Quem atende" vazio; a agenda não marca | Nenhuma profissional ativa | `insert` em `public.profissionais` (A8) |
| A pessoa entra e cai em `/sem-acesso` | Perfil inativo | [Primeiro usuário](#primeiro-usuário), passo 3 |
| O login falha para todos com "Database error querying schema" | Usuário inserido direto em `auth.users` | Remova essa linha e crie a conta por Add user |
| O e-mail de recuperação não chega | SMTP padrão do Supabase | SMTP do Auth |
| O link de recuperação abre inválido | Domínio fora das Redirect URLs, ou modelo padrão aberto em outro navegador | URL Configuration e o modelo "Reset password" |
| O `db push` parou na 0025 | Contato repetido no dia ou título acima de 160 no histórico | B5: a clínica decide, depois `db push` de novo |

---

Referências: [`supabase/README.md`](../supabase/README.md) (migrações, roteiros
de aplicação, criação de usuário, recuperação de senha),
[`AGENTS.md`](../AGENTS.md) §2 (comandos e CI), §3 (hospedagem e variáveis),
§4 (banco) e §8.7 (assinatura com prova), [`.env.local.example`](../.env.local.example).
