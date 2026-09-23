/**
 * Leitor de CSV escrito à mão.
 *
 * Não entra biblioteca para isto. O que uma planilha brasileira produz tem três
 * particularidades, e todas cabem em um arquivo:
 *
 * - **Separador ponto-e-vírgula.** O Excel em pt-BR usa `;`, porque a vírgula
 *   já é o separador decimal. Detectamos em vez de exigir.
 * - **Acento em Latin-1.** "Salvar como CSV" no Excel grava em Windows-1252,
 *   não em UTF-8. Sem tratar, "Conceição" chega como "Concei??o".
 * - **BOM.** O "CSV UTF-8" do Excel começa com uma marca invisível que, se não
 *   for removida, gruda no nome da primeira coluna.
 *
 * O resto é RFC 4180: aspas protegem separador e quebra de linha, e aspas
 * duplicadas dentro do campo representam uma aspa literal.
 */

export type PlanilhaLida = {
  cabecalho: string[];
  linhas: string[][];
  separador: string;
  /** Codificação usada na leitura, para avisar quando não foi UTF-8. */
  codificacao: "utf-8" | "windows-1252";
  /**
   * Linha do arquivo (contando de 1) onde abriu uma aspa que nunca fechou.
   *
   * Sem isso, uma aspa solta engole o resto do arquivo numa célula só e a
   * prévia mostraria "uma linha" onde havia centenas — em silêncio.
   */
  aspaSemFechar: number | null;
};

const SEPARADORES = [";", ",", "\t"] as const;

/**
 * Texto a partir dos bytes do arquivo.
 *
 * Tenta UTF-8 em modo estrito: se os bytes não formarem UTF-8 válido, o
 * decodificador falha e caímos em Windows-1252, que aceita qualquer byte. A
 * ordem importa — Windows-1252 nunca falha, então testá-lo primeiro leria todo
 * arquivo UTF-8 com acento errado.
 */
export function decodificar(bytes: Uint8Array): {
  texto: string;
  codificacao: "utf-8" | "windows-1252";
} {
  try {
    const texto = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { texto, codificacao: "utf-8" };
  } catch {
    return {
      texto: new TextDecoder("windows-1252").decode(bytes),
      codificacao: "windows-1252",
    };
  }
}

/**
 * Qual separador a planilha usa.
 *
 * Conta cada candidato apenas fora das aspas, na primeira linha — um endereço
 * como "Rua X, 100" não deve fazer a vírgula ganhar de um arquivo `;`.
 */
export function detectarSeparador(texto: string): string {
  const contagem = new Map<string, number>(SEPARADORES.map((s) => [s, 0]));
  let dentroDeAspas = false;

  for (let i = 0; i < texto.length; i += 1) {
    const caractere = texto[i];

    if (caractere === '"') {
      // Aspas duplicadas são conteúdo, não fim de campo.
      if (dentroDeAspas && texto[i + 1] === '"') {
        i += 1;
        continue;
      }
      dentroDeAspas = !dentroDeAspas;
      continue;
    }

    if (dentroDeAspas) continue;
    if (caractere === "\n" || caractere === "\r") break;

    const atual = contagem.get(caractere);
    if (atual !== undefined) contagem.set(caractere, atual + 1);
  }

  let melhor = ";";
  let maior = 0;
  for (const separador of SEPARADORES) {
    const total = contagem.get(separador) ?? 0;
    if (total > maior) {
      maior = total;
      melhor = separador;
    }
  }

  // Uma coluna só: o separador não muda o resultado.
  return maior === 0 ? ";" : melhor;
}

/**
 * Arquivo que não é texto CSV: planilha do Excel (.xlsx é um ZIP, .xls é um
 * documento OLE), texto em UTF-16 ou binário qualquer.
 *
 * Lido como texto, qualquer um deles vira lixo e a tela diria "não encontrei
 * a coluna do nome" — verdade, mas sem dizer o que fazer. Aqui a frase já
 * traz a saída.
 */
export function formatoNaoSuportado(bytes: Uint8Array): string | null {
  const comeca = (...assinatura: number[]) => assinatura.every((b, i) => bytes[i] === b);

  if (comeca(0x50, 0x4b, 0x03, 0x04) || comeca(0xd0, 0xcf, 0x11, 0xe0)) {
    return (
      "Este arquivo é uma planilha do Excel, não um CSV. No Excel, use " +
      '"Salvar como" e escolha "CSV UTF-8 (delimitado por vírgulas)".'
    );
  }

  if (comeca(0xff, 0xfe) || comeca(0xfe, 0xff)) {
    return (
      'O arquivo foi salvo como "Texto Unicode" (UTF-16). Salve de novo como ' +
      '"CSV UTF-8 (delimitado por vírgulas)".'
    );
  }

  // Texto de planilha não tem byte zero; binário quase sempre tem logo no início.
  if (bytes.subarray(0, 4096).includes(0)) {
    return "O arquivo não parece ser um CSV. Exporte a planilha como CSV e tente de novo.";
  }

  return null;
}

/** Percorre o texto uma vez, caractere a caractere, montando as células. */
function separarCelulas(
  texto: string,
  separador: string,
): { linhas: string[][]; aspaSemFechar: number | null } {
  const linhas: string[][] = [];
  let linha: string[] = [];
  let celula = "";
  let dentroDeAspas = false;
  let aberturaDaAspa = 0;

  const fecharCelula = () => {
    linha.push(celula.trim());
    celula = "";
  };

  const fecharLinha = () => {
    fecharCelula();
    linhas.push(linha);
    linha = [];
  };

  for (let i = 0; i < texto.length; i += 1) {
    const caractere = texto[i];

    if (dentroDeAspas) {
      if (caractere === '"') {
        if (texto[i + 1] === '"') {
          celula += '"';
          i += 1;
        } else {
          dentroDeAspas = false;
        }
      } else {
        celula += caractere;
      }
      continue;
    }

    if (caractere === '"') {
      dentroDeAspas = true;
      aberturaDaAspa = i;
      continue;
    }

    if (caractere === separador) {
      fecharCelula();
      continue;
    }

    if (caractere === "\r") {
      // CRLF conta como uma quebra só.
      if (texto[i + 1] === "\n") i += 1;
      fecharLinha();
      continue;
    }

    if (caractere === "\n") {
      fecharLinha();
      continue;
    }

    celula += caractere;
  }

  // Última linha sem quebra no fim do arquivo.
  if (celula !== "" || linha.length > 0) fecharLinha();

  const aspaSemFechar = dentroDeAspas
    ? texto.slice(0, aberturaDaAspa).split(/\r\n|\r|\n/).length
    : null;

  return { linhas, aspaSemFechar };
}

function linhaVazia(linha: string[]): boolean {
  return linha.every((celula) => celula === "");
}

/**
 * Lê a planilha inteira.
 *
 * A primeira linha não vazia é o cabeçalho. Linhas totalmente vazias são
 * descartadas — planilha exportada costuma terminar com várias.
 */
export function lerCsv(bytes: Uint8Array): PlanilhaLida {
  const { texto, codificacao } = decodificar(bytes);
  const separador = detectarSeparador(texto);
  const { linhas, aspaSemFechar } = separarCelulas(texto, separador);
  const todas = linhas.filter((l) => !linhaVazia(l));

  if (todas.length === 0) {
    return { cabecalho: [], linhas: [], separador, codificacao, aspaSemFechar };
  }

  return {
    cabecalho: todas[0],
    linhas: todas.slice(1),
    separador,
    codificacao,
    aspaSemFechar,
  };
}

/** Escapa uma célula para gerar o arquivo-modelo. */
export function escaparCelula(valor: string, separador: string): string {
  const precisa =
    valor.includes(separador) ||
    valor.includes('"') ||
    valor.includes("\n") ||
    valor.includes("\r");

  return precisa ? `"${valor.replace(/"/g, '""')}"` : valor;
}

export function gerarCsv(linhas: string[][], separador = ";"): string {
  return linhas
    .map((linha) => linha.map((c) => escaparCelula(c, separador)).join(separador))
    .join("\r\n");
}
