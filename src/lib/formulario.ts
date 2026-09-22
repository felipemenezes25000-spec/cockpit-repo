/**
 * Leitura do `FormData` nas ações de servidor.
 *
 * Cada arquivo de ação tinha a sua cópia de `texto()`, `digitados()` e do
 * regex de UUID — seis cópias que já começavam a divergir (uma aceitava
 * qualquer versão de UUID, outra só a 4). Uma regra escrita duas vezes vira
 * duas regras diferentes na terceira mudança.
 */

/** UUID em qualquer versão, no formato canônico que o Postgres devolve. */
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function uuidValido(valor: unknown): valor is string {
  return typeof valor === "string" && UUID.test(valor);
}

/**
 * Texto do campo, sem espaços nas pontas e cortado no limite.
 *
 * O corte é defesa, não validação: quem envia o formulário por fora não passa
 * pelo `maxLength` do navegador. O limite padrão é generoso de propósito — a
 * validação de cada entidade diz o limite real.
 */
export function campoTexto(dados: FormData, nome: string, limite = 5000): string {
  const valor = dados.get(nome);
  return typeof valor === "string" ? valor.trim().slice(0, limite) : "";
}

/**
 * O que a pessoa digitou, para o formulário reaparecer preenchido no erro.
 *
 * Arquivos ficam de fora, e também os campos internos que o Next acrescenta
 * a toda ação (`$ACTION_…`) — eles não são dado da pessoa.
 */
export function valoresDigitados(dados: FormData): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const [chave, valor] of dados.entries()) {
    if (typeof valor !== "string" || chave.startsWith("$ACTION")) continue;
    valores[chave] = valor.slice(0, 20000);
  }
  return valores;
}
