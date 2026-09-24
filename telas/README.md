# Cockpit — todas as telas

As **70 telas** do Cockpit, o sistema de gestão do consultório da Dra. Érika Passos, uma a uma e organizadas por módulo.

- **Altíssima resolução:** os prints foram capturados em 3x — **4320 px de largura** no computador e **1170 px** no celular — e entram inteiros, sem redução, em cada cartaz.
- **Versão:** capturadas da versão atual do sistema (commit `649dfe6`), rodando localmente.
- **Dados fictícios:** pacientes, valores e agendamentos são de demonstração.
- **Como ver:** clique na miniatura para abrir o cartaz em resolução máxima (no GitHub, use *View raw* ou *Download* para dar zoom).

[![Mapa de todas as telas](00-mapa-das-telas.jpg)](00-mapa-das-telas.jpg)

## Módulos

- [01 · Acesso](#01--acesso) — 4 telas
- [02 · Visão Geral](#02--visão-geral) — 2 telas
- [03 · Agenda](#03--agenda) — 4 telas
- [04 · Pacientes](#04--pacientes) — 8 telas
- [05 · Prontuários](#05--prontuários) — 5 telas
- [06 · Financeiro](#06--financeiro) — 15 telas
- [07 · Documentos e Contratos](#07--documentos-e-contratos) — 6 telas
- [08 · Assinatura pelo celular](#08--assinatura-pelo-celular) — 6 telas
- [09 · Relacionamento](#09--relacionamento) — 8 telas
- [10 · Busca e Configurações](#10--busca-e-configurações) — 7 telas
- [11 · No celular](#11--no-celular) — 5 telas

## 01 · Acesso

<table>
<tr>
<td width="50%" valign="top"><a href="01-acesso/01-entrar.png"><img src="miniaturas/01-entrar.jpg" alt="Entrar no sistema"></a><br><b>01 · Entrar no sistema</b><br><sub>Login com o e-mail de cada pessoa da equipe; cada perfil só vê o que precisa.</sub><br><sub>👤 Equipe · <code>/entrar</code></sub></td>
<td width="50%" valign="top"><a href="01-acesso/02-entrar-erro.png"><img src="miniaturas/02-entrar-erro.jpg" alt="Senha incorreta"></a><br><b>02 · Senha incorreta</b><br><sub>O erro aparece em português claro, sem revelar se o e-mail existe.</sub><br><sub>👤 Equipe · <code>/entrar</code></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="01-acesso/03-recuperar-senha.png"><img src="miniaturas/03-recuperar-senha.jpg" alt="Esqueci minha senha"></a><br><b>03 · Esqueci minha senha</b><br><sub>Pedido de link seguro para criar uma senha nova, com a mesma resposta para qualquer e-mail.</sub><br><sub>👤 Equipe · <code>/recuperar-senha</code></sub></td>
<td width="50%" valign="top"><a href="01-acesso/04-redefinir-senha.png"><img src="miniaturas/04-redefinir-senha.jpg" alt="Redefinir senha"></a><br><b>04 · Redefinir senha</b><br><sub>Tela aberta pelo link do e-mail; sem um link válido, explica o que fazer.</sub><br><sub>👤 Equipe · <code>/redefinir-senha</code></sub></td>
</tr>
</table>

## 02 · Visão Geral

<table>
<tr>
<td width="50%" valign="top"><a href="02-visao-geral/05-visao-geral.png"><img src="miniaturas/05-visao-geral.jpg" alt="Visão Geral"></a><br><b>05 · Visão Geral</b><br><sub>O painel do dia: números de hoje e do mês, agenda com o marcador de agora, pendências, retornos e aniversariantes.</sub><br><sub>👤 Administradora · <code>/</code></sub></td>
<td width="50%" valign="top"><a href="02-visao-geral/06-visao-geral-recepcao.png"><img src="miniaturas/06-visao-geral-recepcao.jpg" alt="Visão Geral da recepção"></a><br><b>06 · Visão Geral da recepção</b><br><sub>Cada perfil vê o seu painel: despesas e resultado ficam restritos ao financeiro.</sub><br><sub>👤 Recepção · <code>/</code></sub></td>
</tr>
</table>

## 03 · Agenda

<table>
<tr>
<td width="50%" valign="top"><a href="03-agenda/07-agenda.png"><img src="miniaturas/07-agenda.jpg" alt="Agenda do dia"></a><br><b>07 · Agenda do dia</b><br><sub>Atendimentos em ordem, com situação por cor, ícone e texto, e as ações de cada um: confirmar, iniciar, concluir.</sub><br><sub>👤 Administradora · <code>/agenda?dia=2026-09-24</code></sub></td>
<td width="50%" valign="top"><a href="03-agenda/08-agenda-novo.png"><img src="miniaturas/08-agenda-novo.jpg" alt="Marcar atendimento"></a><br><b>08 · Marcar atendimento</b><br><sub>Paciente, procedimento, profissional e horário; a duração e o valor vêm da tabela de procedimentos.</sub><br><sub>👤 Administradora · <code>/agenda/novo?dia=2026-09-24</code></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="03-agenda/09-agenda-choque.png"><img src="miniaturas/09-agenda-choque.jpg" alt="Horário ocupado"></a><br><b>09 · Horário ocupado</b><br><sub>Dois atendimentos no mesmo horário não entram: o sistema avisa no próprio campo, e o banco de dados também recusa.</sub><br><sub>👤 Administradora · <code>/agenda/novo?dia=2026-09-24</code></sub></td>
<td width="50%" valign="top"><a href="03-agenda/10-agenda-editar.png"><img src="miniaturas/10-agenda-editar.jpg" alt="Remarcar ou editar"></a><br><b>10 · Remarcar ou editar</b><br><sub>Mudar horário, profissional ou procedimento de um atendimento, com o histórico de quem mudou e quando.</sub><br><sub>👤 Administradora · <code>/agenda/203eca32-8b5a-462a-80bc-60a14c259c6a/editar</code></sub></td>
</tr>
</table>

## 04 · Pacientes

<table>
<tr>
<td width="50%" valign="top"><a href="04-pacientes/11-pacientes.png"><img src="miniaturas/11-pacientes.jpg" alt="Pacientes"></a><br><b>11 · Pacientes</b><br><sub>Lista com busca por nome (com ou sem acento), telefone, e-mail ou CPF, e filtro de ativas e arquivadas.</sub><br><sub>👤 Administradora · <code>/pacientes</code></sub></td>
<td width="50%" valign="top"><a href="04-pacientes/12-pacientes-busca.png"><img src="miniaturas/12-pacientes-busca.jpg" alt="Busca de pacientes"></a><br><b>12 · Busca de pacientes</b><br><sub>A busca fica no endereço da página: dá para voltar, compartilhar e recarregar sem perder o filtro.</sub><br><sub>👤 Administradora · <code>/pacientes?busca=beatriz</code></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="04-pacientes/13-paciente-ficha.png"><img src="miniaturas/13-paciente-ficha.jpg" alt="Ficha da paciente"></a><br><b>13 · Ficha da paciente</b><br><sub>Dados, histórico de atendimentos, resumo, pendências e atalhos para marcar atendimento e registrar prontuário.</sub><br><sub>👤 Administradora · <code>/pacientes/c0000000-0000-4000-8000-000000000002</code></sub></td>
<td width="50%" valign="top"><a href="04-pacientes/14-paciente-editar.png"><img src="miniaturas/14-paciente-editar.jpg" alt="Editar cadastro"></a><br><b>14 · Editar cadastro</b><br><sub>Cadastro completo com validação de CPF, telefone e CEP feita no servidor.</sub><br><sub>👤 Administradora · <code>/pacientes/c0000000-0000-4000-8000-000000000002/editar</code></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="04-pacientes/15-paciente-nova.png"><img src="miniaturas/15-paciente-nova.jpg" alt="Nova paciente"></a><br><b>15 · Nova paciente</b><br><sub>Só o nome é obrigatório; o resto pode ser completado depois.</sub><br><sub>👤 Administradora · <code>/pacientes/novo</code></sub></td>
<td width="50%" valign="top"><a href="04-pacientes/16-paciente-nova-erro.png"><img src="miniaturas/16-paciente-nova-erro.jpg" alt="Erro no próprio campo"></a><br><b>16 · Erro no próprio campo</b><br><sub>CPF inválido: o erro aparece junto do campo, o foco vai até ele e o resto do que foi digitado fica.</sub><br><sub>👤 Administradora · <code>/pacientes/novo</code></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="04-pacientes/17-importar.png"><img src="miniaturas/17-importar.jpg" alt="Importar planilha"></a><br><b>17 · Importar planilha</b><br><sub>Traz a base de pacientes de uma planilha CSV em quatro etapas: arquivo, análise, conferência e importação.</sub><br><sub>👤 Administradora · <code>/pacientes/importar</code></sub></td>
<td width="50%" valign="top"><a href="04-pacientes/18-importar-previa.png"><img src="miniaturas/18-importar-previa.jpg" alt="Prévia da importação"></a><br><b>18 · Prévia da importação</b><br><sub>Cada linha conferida antes de gravar: erros, avisos e duplicidades; só entra o que você confirmar.</sub><br><sub>👤 Administradora · <code>/pacientes/importar</code></sub></td>
</tr>
</table>

## 05 · Prontuários

<table>
<tr>
<td width="50%" valign="top"><a href="05-prontuarios/19-prontuarios.png"><img src="miniaturas/19-prontuarios.jpg" alt="Prontuários"></a><br><b>19 · Prontuários</b><br><sub>Registros clínicos com a versão atual de cada um; exclusivo da administradora.</sub><br><sub>👤 Administradora · <code>/prontuarios</code></sub></td>
<td width="50%" valign="top"><a href="05-prontuarios/20-prontuario.png"><img src="miniaturas/20-prontuario.jpg" alt="Prontuário"></a><br><b>20 · Prontuário</b><br><sub>Registro atual, histórico de versões (editar nunca apaga) e fotos de evolução em armazenamento privado.</sub><br><sub>👤 Administradora · <code>/prontuarios/1961e61a-ce17-44dc-9ee4-cd1d03e01fa7</code></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="05-prontuarios/21-prontuario-versao.png"><img src="miniaturas/21-prontuario-versao.jpg" alt="Nova versão do prontuário"></a><br><b>21 · Nova versão do prontuário</b><br><sub>Toda edição vira uma versão nova, com o motivo; as anteriores continuam guardadas.</sub><br><sub>👤 Administradora · <code>/prontuarios/1961e61a-ce17-44dc-9ee4-cd1d03e01fa7/editar</code></sub></td>
<td width="50%" valign="top"><a href="05-prontuarios/22-prontuario-novo.png"><img src="miniaturas/22-prontuario-novo.jpg" alt="Novo prontuário"></a><br><b>22 · Novo prontuário</b><br><sub>Queixa e anamnese, avaliação, conduta, evolução, orientações e observações clínicas.</sub><br><sub>👤 Administradora · <code>/prontuarios/novo</code></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="05-prontuarios/23-prontuario-restrito.png"><img src="miniaturas/23-prontuario-restrito.jpg" alt="Prontuário restrito"></a><br><b>23 · Prontuário restrito</b><br><sub>A recepção não abre prontuário: a regra vale na tela, no servidor e no banco.</sub><br><sub>👤 Recepção · <code>/prontuarios</code></sub></td>
<td width="50%"></td>
</tr>
</table>

## 06 · Financeiro

<table>
<tr>
<td width="50%" valign="top"><a href="06-financeiro/24-financeiro.png"><img src="miniaturas/24-financeiro.jpg" alt="Visão financeira"></a><br><b>24 · Visão financeira</b><br><sub>Indicadores do mês — vendido, recebido, taxas, líquido, a receber, despesas e resultado — e as últimas movimentações.</sub><br><sub>👤 Administradora · <code>/financeiro</code></sub></td>
<td width="50%" valign="top"><a href="06-financeiro/25-vendas.png"><img src="miniaturas/25-vendas.jpg" alt="Vendas"></a><br><b>25 · Vendas</b><br><sub>Operações do período com filtro por situação e forma de pagamento.</sub><br><sub>👤 Administradora · <code>/financeiro/vendas</code></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="06-financeiro/26-venda-nova.png"><img src="miniaturas/26-venda-nova.jpg" alt="Registrar venda"></a><br><b>26 · Registrar venda</b><br><sub>Procedimento, valor, desconto e forma de pagamento; tudo nasce da venda.</sub><br><sub>👤 Administradora · <code>/financeiro/vendas/nova</code></sub></td>
<td width="50%" valign="top"><a href="06-financeiro/27-venda-nova-previa.png"><img src="miniaturas/27-venda-nova-previa.jpg" alt="Prévia do líquido"></a><br><b>27 · Prévia do líquido</b><br><sub>No cartão, a taxa da operadora entra sozinha e a prévia mostra quanto a clínica realmente recebe.</sub><br><sub>👤 Administradora · <code>/financeiro/vendas/nova</code></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="06-financeiro/28-venda-detalhe.png"><img src="miniaturas/28-venda-detalhe.jpg" alt="Detalhe da venda"></a><br><b>28 · Detalhe da venda</b><br><sub>Composição do valor ao líquido e o recebimento, com divergência marcada quando entra valor diferente.</sub><br><sub>👤 Administradora · <code>/financeiro/vendas/76b71432-1273-4a96-b5b1-a18deb850ac2</code></sub></td>
<td width="50%" valign="top"><a href="06-financeiro/29-venda-alterar-pagamento.png"><img src="miniaturas/29-venda-alterar-pagamento.jpg" alt="Alterar forma de pagamento"></a><br><b>29 · Alterar forma de pagamento</b><br><sub>Mudança depois de registrada, só para o financeiro, com o antes e o depois lado a lado.</sub><br><sub>👤 Administradora · <code>/financeiro/vendas/76b71432-1273-4a96-b5b1-a18deb850ac2/alterar-pagamento</code></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="06-financeiro/30-venda-alterar-taxa.png"><img src="miniaturas/30-venda-alterar-taxa.jpg" alt="Alterar taxa da venda"></a><br><b>30 · Alterar taxa da venda</b><br><sub>Taxa diferente da tabela só entra com justificativa; a tabela padrão não muda.</sub><br><sub>👤 Administradora · <code>/financeiro/vendas/76b71432-1273-4a96-b5b1-a18deb850ac2/alterar-taxa</code></sub></td>
<td width="50%" valign="top"><a href="06-financeiro/31-movimentacoes.png"><img src="miniaturas/31-movimentacoes.jpg" alt="Movimentações"></a><br><b>31 · Movimentações</b><br><sub>Tudo o que entrou e saiu no mês, com filtro por tipo guardado no endereço da página.</sub><br><sub>👤 Administradora · <code>/financeiro/movimentacoes</code></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="06-financeiro/32-despesas.png"><img src="miniaturas/32-despesas.jpg" alt="Despesas"></a><br><b>32 · Despesas</b><br><sub>Contas do período com vencimento, categoria e o que já venceu; pagar pede a data do pagamento.</sub><br><sub>👤 Administradora · <code>/financeiro/despesas</code></sub></td>
<td width="50%" valign="top"><a href="06-financeiro/33-despesa-nova.png"><img src="miniaturas/33-despesa-nova.jpg" alt="Registrar despesa"></a><br><b>33 · Registrar despesa</b><br><sub>Descrição, categoria, valor e vencimento.</sub><br><sub>👤 Administradora · <code>/financeiro/despesas/nova</code></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="06-financeiro/34-despesa-editar.png"><img src="miniaturas/34-despesa-editar.jpg" alt="Editar despesa"></a><br><b>34 · Editar despesa</b><br><sub>Correções com confirmação; nada se apaga pela interface.</sub><br><sub>👤 Administradora · <code>/financeiro/despesas/435bd8e4-1f20-4eb2-90c8-cb24fdc2f526/editar</code></sub></td>
<td width="50%" valign="top"><a href="06-financeiro/35-taxas.png"><img src="miniaturas/35-taxas.jpg" alt="Taxas de cartão"></a><br><b>35 · Taxas de cartão</b><br><sub>Tabela por operadora e parcelas; cada venda guarda uma cópia da taxa do dia.</sub><br><sub>👤 Administradora · <code>/financeiro/taxas</code></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="06-financeiro/36-taxa-nova.png"><img src="miniaturas/36-taxa-nova.jpg" alt="Nova taxa de cartão"></a><br><b>36 · Nova taxa de cartão</b><br><sub>Operadora, tipo (crédito ou débito), parcelas e percentual.</sub><br><sub>👤 Administradora · <code>/financeiro/taxas/nova</code></sub></td>
<td width="50%" valign="top"><a href="06-financeiro/37-taxa-editar.png"><img src="miniaturas/37-taxa-editar.jpg" alt="Editar taxa"></a><br><b>37 · Editar taxa</b><br><sub>Ajuste da tabela sem reescrever as vendas já feitas.</sub><br><sub>👤 Administradora · <code>/financeiro/taxas/aee23b5d-fb63-4d18-a38d-bb6a214ae117/editar</code></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="06-financeiro/38-fluxo.png"><img src="miniaturas/38-fluxo.jpg" alt="Fluxo mensal"></a><br><b>38 · Fluxo mensal</b><br><sub>Recebido líquido, despesas pagas, resultado e acumulado, mês a mês.</sub><br><sub>👤 Administradora · <code>/financeiro/fluxo</code></sub></td>
<td width="50%"></td>
</tr>
</table>

## 07 · Documentos e Contratos

<table>
<tr>
<td width="50%" valign="top"><a href="07-documentos/39-documentos.png"><img src="miniaturas/39-documentos.jpg" alt="Documentos e contratos"></a><br><b>39 · Documentos e contratos</b><br><sub>Documentos emitidos para as pacientes, com a situação de cada um.</sub><br><sub>👤 Administradora · <code>/formularios</code></sub></td>
<td width="50%" valign="top"><a href="07-documentos/40-documento.png"><img src="miniaturas/40-documento.jpg" alt="Documento assinado"></a><br><b>40 · Documento assinado</b><br><sub>Texto congelado com impressão digital (SHA-256), evidências da assinatura e a via da paciente pelo link.</sub><br><sub>👤 Administradora · <code>/formularios/875b66a5-6d17-4409-a987-be7e7e3b853f</code></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="07-documentos/41-documento-novo.png"><img src="miniaturas/41-documento-novo.jpg" alt="Emitir documento"></a><br><b>41 · Emitir documento</b><br><sub>Escolhe o modelo, confere a prévia e emite: o texto é congelado na hora.</sub><br><sub>👤 Administradora · <code>/formularios/novo?paciente=c0000000-0000-4000-8000-000000000002</code></sub></td>
<td width="50%" valign="top"><a href="07-documentos/42-modelos.png"><img src="miniaturas/42-modelos.jpg" alt="Modelos de documento"></a><br><b>42 · Modelos de documento</b><br><sub>Contratos, termos de consentimento, orientações e anamnese, com versões.</sub><br><sub>👤 Administradora · <code>/formularios/modelos</code></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="07-documentos/43-modelo-novo.png"><img src="miniaturas/43-modelo-novo.jpg" alt="Criar modelo"></a><br><b>43 · Criar modelo</b><br><sub>Tipo, nome, texto do documento e perguntas; versões novas não mudam o que já foi emitido.</sub><br><sub>👤 Administradora · <code>/formularios/modelos/novo</code></sub></td>
<td width="50%" valign="top"><a href="07-documentos/44-modelo-editar.png"><img src="miniaturas/44-modelo-editar.jpg" alt="Nova versão do modelo"></a><br><b>44 · Nova versão do modelo</b><br><sub>Editar um modelo cria a versão seguinte; os documentos antigos continuam com o texto deles.</sub><br><sub>👤 Administradora · <code>/formularios/modelos/1d816d89-381e-45e0-ad17-36a2cd5cf032/editar</code></sub></td>
</tr>
</table>

## 08 · Assinatura pelo celular

<table>
<tr>
<td width="50%" valign="top"><a href="08-assinatura-pelo-celular/45-assinar-invalido.png"><img src="miniaturas/45-assinar-invalido.jpg" alt="Link inválido"></a><br><b>45 · Link inválido</b><br><sub>Link de assinatura errado ou vencido: a página não mostra nada do documento.</sub><br><sub>👤 Paciente · <code>/assinar/…</code></sub></td>
<td width="50%" valign="top"><a href="08-assinatura-pelo-celular/46-documento-link.png"><img src="miniaturas/46-documento-link.jpg" alt="Link seguro para assinar"></a><br><b>46 · Link seguro para assinar</b><br><sub>A clínica gera o link com validade e envia pelo WhatsApp com a mensagem pronta.</sub><br><sub>👤 Administradora · <code>/formularios/9c2805d1-4778-42bc-b964-1bc7c9c32a3b</code></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="08-assinatura-pelo-celular/47-assinar-1.png"><img src="miniaturas/47-assinar-1.jpg" alt="Confirmar a data de nascimento"></a><br><b>47 · Confirmar a data de nascimento</b><br><sub>A paciente abre o link no celular e confirma a data de nascimento antes de ver o documento.</sub><br><sub>👤 Paciente · <code>/assinar/…</code></sub></td>
<td width="50%" valign="top"><a href="08-assinatura-pelo-celular/48-assinar-2.png"><img src="miniaturas/48-assinar-2.jpg" alt="Ler o documento"></a><br><b>48 · Ler o documento</b><br><sub>O texto completo, com a identificação que prova que ele não muda depois de assinado.</sub><br><sub>👤 Paciente · <code>/assinar/…</code></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="08-assinatura-pelo-celular/49-assinar-3.png"><img src="miniaturas/49-assinar-3.jpg" alt="Assinar"></a><br><b>49 · Assinar</b><br><sub>Nome completo, CPF opcional e a confirmação de leitura.</sub><br><sub>👤 Paciente · <code>/assinar/…</code></sub></td>
<td width="50%" valign="top"><a href="08-assinatura-pelo-celular/50-assinar-4.png"><img src="miniaturas/50-assinar-4.jpg" alt="Assinado"></a><br><b>50 · Assinado</b><br><sub>Assinatura registrada e a via da paciente para salvar em PDF.</sub><br><sub>👤 Paciente · <code>/assinar/…</code></sub></td>
</tr>
</table>

## 09 · Relacionamento

<table>
<tr>
<td width="50%" valign="top"><a href="09-relacionamento/51-relacionamento.png"><img src="miniaturas/51-relacionamento.jpg" alt="Relacionamento"></a><br><b>51 · Relacionamento</b><br><sub>A fila da equipe: confirmações, retornos, tarefas e convites de avaliação.</sub><br><sub>👤 Administradora · <code>/relacionamento</code></sub></td>
<td width="50%" valign="top"><a href="09-relacionamento/52-rel-confirmacoes.png"><img src="miniaturas/52-rel-confirmacoes.jpg" alt="Confirmações"></a><br><b>52 · Confirmações</b><br><sub>Atendimentos dos próximos 15 dias sem confirmação, com o WhatsApp da paciente a um clique.</sub><br><sub>👤 Administradora · <code>/relacionamento?aba=confirmacoes</code></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="09-relacionamento/53-rel-retornos.png"><img src="miniaturas/53-rel-retornos.jpg" alt="Retornos"></a><br><b>53 · Retornos</b><br><sub>Quem está no período de voltar, com a situação de cada contato.</sub><br><sub>👤 Administradora · <code>/relacionamento?aba=retornos</code></sub></td>
<td width="50%" valign="top"><a href="09-relacionamento/54-rel-aniversarios.png"><img src="miniaturas/54-rel-aniversarios.jpg" alt="Aniversários"></a><br><b>54 · Aniversários</b><br><sub>Aniversariantes do mês com a mensagem pronta para enviar.</sub><br><sub>👤 Administradora · <code>/relacionamento?aba=aniversarios</code></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="09-relacionamento/55-rel-avaliacoes.png"><img src="miniaturas/55-rel-avaliacoes.jpg" alt="Avaliações no Google"></a><br><b>55 · Avaliações no Google</b><br><sub>Convite para avaliar a clínica depois de um bom atendimento, com um toque.</sub><br><sub>👤 Administradora · <code>/relacionamento?aba=avaliacoes</code></sub></td>
<td width="50%" valign="top"><a href="09-relacionamento/56-rel-tarefas.png"><img src="miniaturas/56-rel-tarefas.jpg" alt="Tarefas"></a><br><b>56 · Tarefas</b><br><sub>O que a equipe precisa fazer, com prazo e prioridade.</sub><br><sub>👤 Administradora · <code>/relacionamento?aba=tarefas</code></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="09-relacionamento/57-retorno-novo.png"><img src="miniaturas/57-retorno-novo.jpg" alt="Novo retorno"></a><br><b>57 · Novo retorno</b><br><sub>Agenda um contato futuro com a paciente.</sub><br><sub>👤 Administradora · <code>/relacionamento/retornos/novo</code></sub></td>
<td width="50%" valign="top"><a href="09-relacionamento/58-tarefa-nova.png"><img src="miniaturas/58-tarefa-nova.jpg" alt="Nova tarefa"></a><br><b>58 · Nova tarefa</b><br><sub>Tipo, paciente, prazo e prioridade.</sub><br><sub>👤 Administradora · <code>/relacionamento/tarefas/nova</code></sub></td>
</tr>
</table>

## 10 · Busca e Configurações

<table>
<tr>
<td width="50%" valign="top"><a href="10-busca-e-configuracoes/59-busca.png"><img src="miniaturas/59-busca.jpg" alt="Busca global"></a><br><b>59 · Busca global</b><br><sub>Pacientes, atendimentos, documentos e prontuários de qualquer tela (Ctrl K).</sub><br><sub>👤 Administradora · <code>/busca?q=bea</code></sub></td>
<td width="50%" valign="top"><a href="10-busca-e-configuracoes/60-configuracoes.png"><img src="miniaturas/60-configuracoes.jpg" alt="Configurações"></a><br><b>60 · Configurações</b><br><sub>Áreas do sistema; o que ainda está a caminho aparece marcado.</sub><br><sub>👤 Administradora · <code>/configuracoes</code></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="10-busca-e-configuracoes/61-procedimentos.png"><img src="miniaturas/61-procedimentos.jpg" alt="Procedimentos"></a><br><b>61 · Procedimentos</b><br><sub>Tabela da clínica com duração, valor e retorno sugerido de cada procedimento.</sub><br><sub>👤 Administradora · <code>/configuracoes/procedimentos</code></sub></td>
<td width="50%" valign="top"><a href="10-busca-e-configuracoes/62-procedimento-novo.png"><img src="miniaturas/62-procedimento-novo.jpg" alt="Novo procedimento"></a><br><b>62 · Novo procedimento</b><br><sub>Nome, duração, valor e retorno sugerido.</sub><br><sub>👤 Administradora · <code>/configuracoes/procedimentos/novo</code></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="10-busca-e-configuracoes/63-procedimento-editar.png"><img src="miniaturas/63-procedimento-editar.jpg" alt="Editar procedimento"></a><br><b>63 · Editar procedimento</b><br><sub>Mudanças valem para os próximos atendimentos.</sub><br><sub>👤 Administradora · <code>/configuracoes/procedimentos/b0000000-0000-4000-8000-000000000008/editar</code></sub></td>
<td width="50%" valign="top"><a href="10-busca-e-configuracoes/64-config-fotos.png"><img src="miniaturas/64-config-fotos.jpg" alt="Conferência das fotos"></a><br><b>64 · Conferência das fotos</b><br><sub>Reconcilia os arquivos do armazenamento com o prontuário.</sub><br><sub>👤 Administradora · <code>/configuracoes/fotos</code></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="10-busca-e-configuracoes/65-relatorios.png"><img src="miniaturas/65-relatorios.jpg" alt="Relatórios"></a><br><b>65 · Relatórios</b><br><sub>Módulo em preparação: a tela avisa o que está a caminho.</sub><br><sub>👤 Administradora · <code>/relatorios</code></sub></td>
<td width="50%"></td>
</tr>
</table>

## 11 · No celular

<table>
<tr>
<td width="50%" valign="top"><a href="11-no-celular/66-cel-visao-geral.png"><img src="miniaturas/66-cel-visao-geral.jpg" alt="Visão Geral no celular"></a><br><b>66 · Visão Geral no celular</b><br><sub>O painel inteiro se reorganiza para a tela pequena.</sub><br><sub>👤 Administradora · <code>/</code></sub></td>
<td width="50%" valign="top"><a href="11-no-celular/67-cel-agenda.png"><img src="miniaturas/67-cel-agenda.jpg" alt="Agenda no celular"></a><br><b>67 · Agenda no celular</b><br><sub>Confirmar, iniciar e concluir atendimentos pelo celular.</sub><br><sub>👤 Administradora · <code>/agenda?dia=2026-09-24</code></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="11-no-celular/68-cel-pacientes.png"><img src="miniaturas/68-cel-pacientes.jpg" alt="Pacientes no celular"></a><br><b>68 · Pacientes no celular</b><br><sub>Busca e lista pensadas para o toque.</sub><br><sub>👤 Administradora · <code>/pacientes</code></sub></td>
<td width="50%" valign="top"><a href="11-no-celular/69-cel-ficha.png"><img src="miniaturas/69-cel-ficha.jpg" alt="Ficha no celular"></a><br><b>69 · Ficha no celular</b><br><sub>A ficha completa da paciente, com WhatsApp a um toque.</sub><br><sub>👤 Administradora · <code>/pacientes/c0000000-0000-4000-8000-000000000002</code></sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="11-no-celular/70-cel-relacionamento.png"><img src="miniaturas/70-cel-relacionamento.jpg" alt="Confirmações no celular"></a><br><b>70 · Confirmações no celular</b><br><sub>A recepção confirma a agenda do dia sem sair do celular.</sub><br><sub>👤 Administradora · <code>/relacionamento?aba=confirmacoes</code></sub></td>
<td width="50%"></td>
</tr>
</table>
