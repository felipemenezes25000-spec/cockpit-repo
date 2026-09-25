/**
 * O aviso que aparece na tela seguinte depois de salvar ("Venda registrada").
 *
 * A ação de servidor redireciona e a tela nova não sabe de onde veio. Antes
 * do redirect, a ação grava um cookie curto só com a CHAVE do aviso — nunca
 * nome de paciente, valor ou qualquer dado — e o navegador troca a chave pela
 * frase daqui, mostra e apaga o cookie. Chave desconhecida é ignorada.
 */

export const COOKIE_DO_AVISO = "cockpit_aviso";

/** Tempo de vida do cookie: só o bastante para o redirect chegar. */
export const VIDA_DO_AVISO_S = 20;

export type Aviso = { titulo: string; texto: string };

export const AVISOS = {
  "paciente-cadastrada": { titulo: "Cadastro criado", texto: "A ficha já está aberta, com o histórico começando agora." },
  "paciente-atualizada": { titulo: "Cadastro atualizado", texto: "As alterações já valem em todo o sistema." },
  "atendimento-marcado": { titulo: "Horário marcado", texto: "O atendimento já está na agenda do dia." },
  "atendimento-alterado": { titulo: "Atendimento alterado", texto: "A agenda do dia já mostra a mudança." },
  "despesa-lancada": { titulo: "Despesa lançada", texto: "Ela já entra nas contas do período." },
  "despesa-alterada": { titulo: "Despesa alterada", texto: "As contas do período foram refeitas." },
  "procedimento-criado": { titulo: "Procedimento criado", texto: "Ele já pode ser escolhido na agenda e na venda." },
  "procedimento-alterado": { titulo: "Procedimento alterado", texto: "O que já foi registrado continua como estava." },
  "prontuario-registrado": { titulo: "Registro salvo", texto: "O prontuário guarda esta versão com data e autora." },
  "prontuario-nova-versao": { titulo: "Nova versão salva", texto: "A versão anterior continua no histórico." },
  "tarefa-criada": { titulo: "Tarefa criada", texto: "Ela já está na fila do Relacionamento." },
  "retorno-marcado": { titulo: "Retorno marcado", texto: "Ele entra na fila na data combinada." },
  "taxa-criada": { titulo: "Taxa cadastrada", texto: "As próximas vendas no cartão já usam esta taxa." },
  "taxa-alterada": { titulo: "Taxa alterada", texto: "Vendas já registradas não mudam." },
  "venda-registrada": { titulo: "Venda registrada", texto: "Os recebimentos já estão no financeiro." },
  "venda-alterada": { titulo: "Venda alterada", texto: "A mudança ficou registrada com o motivo." },
  "recebimento-confirmado": { titulo: "Recebimento confirmado", texto: "O valor já conta como recebido no mês." },
  "modelo-criado": { titulo: "Modelo criado", texto: "Ele já pode ser usado para emitir documentos." },
  "modelo-nova-versao": { titulo: "Nova versão do modelo", texto: "Documentos já emitidos continuam com o texto de antes." },
  "documento-emitido": { titulo: "Documento emitido", texto: "O texto foi congelado e já pode ser assinado." },
} as const satisfies Record<string, Aviso>;

export type ChaveDoAviso = keyof typeof AVISOS;

/** A frase do aviso, ou `null` para chave vazia ou que não existe. */
export function lerAviso(chave: string | null | undefined): Aviso | null {
  if (!chave || !Object.hasOwn(AVISOS, chave)) return null;
  return AVISOS[chave as ChaveDoAviso];
}
