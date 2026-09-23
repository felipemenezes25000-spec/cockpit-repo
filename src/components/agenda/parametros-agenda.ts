import { dataDoBanco, dataValida, hoje } from "@/lib/dates";
import { uuidValido } from "@/lib/formulario";

/**
 * O estado da Agenda mora na URL (AGENTS.md §6, regra 5): `?dia=AAAA-MM-DD`
 * e, com mais de uma profissional, `&profissional=<uuid>`. Estas funções leem
 * o que veio, e o que não serve cai no padrão em vez de virar erro — um link
 * velho ou digitado à mão abre a agenda de hoje, não uma tela quebrada.
 */

type Parametro = string | string[] | undefined;

function primeiro(valor: Parametro): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

/**
 * "AAAA-MM-DD" que existe no calendário, ou `null`.
 *
 * Passa por `dataValida`, não só pelo formato: `31/02` normalizado viraria
 * `03/03` em silêncio, e a agenda abriria um dia que ninguém pediu.
 */
export function lerChaveDoDia(valor: Parametro): string | null {
  const texto = primeiro(valor);
  return dataValida(texto) ? texto : null;
}

/** O dia pedido na URL, ou hoje. */
export function lerDiaDaAgenda(valor: Parametro): Date {
  const chave = lerChaveDoDia(valor);
  return chave ? dataDoBanco(chave) : hoje();
}

/** O filtro de profissional, só se for um id de verdade. */
export function lerProfissional(valor: Parametro): string | null {
  const texto = primeiro(valor);
  return uuidValido(texto) ? texto : null;
}

/**
 * Endereço da agenda de um dia, mantendo o filtro de profissional. Uma função
 * só para as setas, o seletor de data, o "voltar" das telas de marcar e
 * editar e o redirect depois de salvar não montarem a URL cada um do seu jeito.
 */
export function enderecoDaAgenda(dia: string | null, profissional?: string | null): string {
  const busca = new URLSearchParams();
  if (dia) busca.set("dia", dia);
  if (profissional) busca.set("profissional", profissional);
  const texto = busca.toString();
  return texto ? `/agenda?${texto}` : "/agenda";
}
