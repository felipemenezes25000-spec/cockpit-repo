/**
 * Erro do banco vira frase em português — e nada do Postgres chega à tela.
 *
 * Regra da casa (AGENTS.md §6, regra 11): a mensagem crua do Postgres fala de
 * tabela, constraint e às vezes do valor digitado ("Key (cpf)=(…) already
 * exists"). Ela não ajuda quem está no balcão e ainda vaza detalhe interno.
 * Por isso toda ação e toda consulta passam o erro por aqui.
 *
 * Três fontes, três tratamentos:
 *
 * - `P0001` é `raise exception` das NOSSAS funções e gatilhos (0008 em
 *   diante). O texto foi escrito em português, para gente ler — repassá-lo é
 *   o contrário de vazar. Mesmo assim, só passa o que parece frase nossa.
 * - `42501` pode ser nosso (gatilho com `errcode = '42501'` e mensagem em
 *   português) ou do Postgres ("permission denied", "row-level security").
 *   O do Postgres vira a frase neutra de permissão — sem dizer qual tabela.
 * - Todo o resto vira frase por código, ou a mensagem padrão do contexto.
 *
 * Este arquivo não é `server-only`: não tem segredo e é usado pelos testes.
 * O registro técnico (log) mora em `registro.ts`, que é do servidor.
 */

export type ErroDoBanco =
  | {
      code?: string | null;
      message?: string | null;
      details?: string | null;
      hint?: string | null;
    }
  | null
  | undefined;

/** Códigos com frase própria quando o contexto quer ser mais específico. */
export type CodigoConhecido =
  | "23505"
  | "23503"
  | "23514"
  | "23P01"
  | "42501"
  | "PGRST116";

export const MENSAGEM_PERMISSAO = "Seu perfil não tem permissão para esta ação.";
export const MENSAGEM_ESTRUTURA =
  "O banco ainda não tem a estrutura desta tela. A migração pendente precisa ser aplicada.";
export const MENSAGEM_CONEXAO =
  "Não foi possível falar com o banco agora. Confira a conexão e tente de novo.";

const PADRAO_POR_CODIGO: Record<string, string> = {
  "23505": "Já existe um registro igual a este.",
  "23503": "Um registro relacionado não existe mais ou ainda está em uso.",
  "23514": "O banco recusou os valores. Revise os campos e tente de novo.",
  "23P01": "Este horário acabou de ser ocupado por outro atendimento. Escolha outro horário.",
  "23502": "Falta preencher uma informação obrigatória.",
  "22P02": "Algum valor está em formato inválido.",
  "22007": "Alguma data está em formato inválido.",
  "22008": "Alguma data não existe no calendário.",
  "22003": "Algum valor está fora do limite aceito.",
  "22001": "Algum texto passou do tamanho aceito.",
  "40001": "Outra pessoa alterou este registro ao mesmo tempo. Tente de novo.",
  "40P01": "Outra pessoa alterou este registro ao mesmo tempo. Tente de novo.",
  "55P03": "O registro está sendo alterado por outra pessoa. Tente de novo em instantes.",
  "57014": "O banco demorou demais para responder. Tente de novo.",
  PGRST116: "Registro não encontrado.",
};

/** Estrutura ausente: migração não aplicada, ou cache do PostgREST antigo. */
export function estruturaAusente(erro: ErroDoBanco): boolean {
  if (!erro) return false;
  return (
    erro.code === "PGRST202" ||
    erro.code === "PGRST205" ||
    erro.code === "42P01" ||
    erro.code === "42883" ||
    (erro.message ?? "").includes("schema cache")
  );
}

/** O erro é do Postgres ou do PostgREST, não uma frase escrita por nós. */
function mensagemTecnica(texto: string): boolean {
  return /permission denied|row-level security|violates|constraint|relation "|column "|function |syntax|duplicate key|null value|invalid input|schema cache|PGRST|JWT/i.test(
    texto,
  );
}

/** Frase nossa, vinda de `raise exception` em português. */
function fraseNossa(texto: string | null | undefined): string | null {
  const limpo = (texto ?? "").trim();
  if (!limpo || limpo.length > 240) return null;
  if (mensagemTecnica(limpo)) return null;
  return limpo;
}

/** Falha de rede entre o servidor e o Supabase: não há código do Postgres. */
function falhaDeConexao(erro: NonNullable<ErroDoBanco>): boolean {
  const texto = `${erro.message ?? ""} ${erro.details ?? ""}`;
  return !erro.code && /fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|network|socket/i.test(texto);
}

/**
 * A frase que a pessoa lê.
 *
 * `padrao` descreve o que falhou no contexto ("Não foi possível salvar o
 * cadastro."). `especificas` troca a frase de um código conhecido por uma do
 * domínio — `{ "23505": "Já existe uma paciente com este CPF." }`.
 */
export function mensagemDoBanco(
  erro: ErroDoBanco,
  padrao: string,
  especificas: Partial<Record<CodigoConhecido, string>> = {},
): string {
  if (!erro) return padrao;

  const codigo = erro.code ?? "";

  if (codigo in especificas) {
    return especificas[codigo as CodigoConhecido] as string;
  }

  if (estruturaAusente(erro)) return MENSAGEM_ESTRUTURA;
  if (falhaDeConexao(erro)) return MENSAGEM_CONEXAO;

  if (codigo === "P0001") {
    return fraseNossa(erro.message) ?? padrao;
  }

  if (codigo === "42501") {
    return fraseNossa(erro.message) ?? MENSAGEM_PERMISSAO;
  }

  return PADRAO_POR_CODIGO[codigo] ?? padrao;
}

/**
 * Versão do erro que pode ir para o log do servidor.
 *
 * Mensagem do Postgres pode carregar o valor que a pessoa digitou — CPF,
 * data de nascimento, trecho de prontuário ("invalid input syntax for type
 * date: \"1990-02-31\""; "Key (cpf)=(…)"). Tudo que estiver entre aspas ou
 * parênteses depois de `=` sai. `details` nunca entra: é onde o Postgres põe
 * a linha inteira.
 */
export function erroParaRegistro(erro: ErroDoBanco): { codigo: string; mensagem: string } {
  if (!erro) return { codigo: "", mensagem: "" };
  const mensagem = sanitizarParaRegistro(
    (erro.message ?? "")
      .replace(/"[^"]*"/g, '"…"')
      .replace(/'[^']*'/g, "'…'")
      .replace(/=\([^)]*\)/g, "=(…)"),
  ).slice(0, 300);
  return { codigo: (erro.code ?? "").slice(0, 16), mensagem };
}

/**
 * O que ainda pode sobrar de dado sensível num texto sem aspas.
 *
 * Mensagem de serviço (Auth, Storage, rede) não segue o formato do Postgres:
 * pode trazer e-mail, token, CPF, telefone ou data solta no meio da frase.
 * Nada disso ajuda a investigar — o código e o contexto bastam — e tudo isso
 * é dado de paciente ou credencial. Quebra de linha também sai: uma linha de
 * log é uma linha, e ninguém injeta entrada falsa no registro.
 */
export function sanitizarParaRegistro(texto: string): string {
  return (
    texto
      // Quebra de linha e controle: uma entrada, uma linha.
      .replace(/[\u0000-\u001f\u007f]+/g, " ")
      // JWT (três partes base64url) e cabeçalho de autorização.
      .replace(/\beyJ[\w-]*\.[\w-]*\.[\w-]*/g, "[token]")
      .replace(/\bBearer\s+\S+/gi, "Bearer [token]")
      // E-mail.
      .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "[e-mail]")
      // Segredo longo sem separador: token de link, chave, hash.
      .replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[token]")
      // Data solta (nascimento é dado pessoal), antes dos números.
      .replace(/\b\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}\b/g, "[data]")
      // CPF, telefone, cartão: seis dígitos ou mais, com ou sem pontuação.
      .replace(/\+?\(?\d[\d .()/-]{4,}\d/g, "[número]")
      .replace(/\s{2,}/g, " ")
      .trim()
  );
}

/**
 * Identificador curto de uma operação, para ligar a frase que a pessoa viu
 * à linha do log sem carregar dado nenhum. Aleatório, sem relação com id de
 * linha do banco.
 */
export function idDeCorrelacao(): string {
  return globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

/** Cabeçalho em que o middleware entrega o id da requisição ao servidor. */
export const CABECALHO_ID_REQUISICAO = "x-id-requisicao";
