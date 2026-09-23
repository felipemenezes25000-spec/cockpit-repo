import { partesDoDia } from "./dates";
import { formatoNaoSuportado, lerCsv, type PlanilhaLida } from "./csv";
import {
  normalizarPaciente,
  validarPaciente,
  PACIENTE_EM_BRANCO,
  type ValoresPaciente,
} from "./paciente";

/**
 * Leitura de uma planilha de pacientes.
 *
 * A planilha da clínica não vai ter os nomes de coluna que o sistema usa
 * internamente, nem na mesma ordem. Em vez de exigir um formato exato, o
 * importador reconhece os nomes que uma clínica escreveria — "Celular",
 * "Data de Nascimento", "E-mail" — comparando sem acento, sem maiúscula e sem
 * pontuação.
 *
 * Nada aqui grava. A função devolve o que entendeu, linha a linha, para a tela
 * mostrar antes de confirmar. Importar às cegas é como se perde a base.
 */

export type CampoDaPlanilha = keyof ValoresPaciente;

/**
 * Nomes aceitos para cada campo, do mais específico para o mais genérico.
 *
 * A ordem importa: "nome social" precisa ser testado antes de "nome", senão a
 * coluna do nome social seria capturada pelo campo `nome`.
 */
const SINONIMOS: [CampoDaPlanilha, string[]][] = [
  ["nome_social", ["nome social", "nomesocial", "social"]],
  ["data_nascimento", [
    "data de nascimento", "data nascimento", "datanascimento", "nascimento",
    "dt nascimento", "dtnascimento", "aniversario", "data de aniversario",
  ]],
  ["nome", ["nome completo", "nome da paciente", "nome do paciente", "nome", "paciente", "cliente"]],
  ["cpf", ["cpf", "documento", "n do cpf"]],
  ["telefone", ["telefone", "celular", "fone", "whatsapp", "zap", "contato", "tel"]],
  ["email", ["email", "e mail", "correio eletronico"]],
  ["cep", ["cep", "codigo postal"]],
  ["logradouro", ["logradouro", "endereco", "rua", "avenida"]],
  ["numero", ["numero", "n", "no", "num"]],
  ["complemento", ["complemento", "compl", "apartamento", "apto"]],
  ["bairro", ["bairro"]],
  ["cidade", ["cidade", "municipio", "localidade"]],
  ["uf", ["uf", "estado", "sigla do estado"]],
  ["origem", ["origem", "como conheceu", "como nos conheceu", "indicacao", "fonte"]],
  ["observacoes", ["observacoes", "observacao", "obs", "anotacoes", "notas", "comentarios"]],
];

/** Sem acento, sem maiúscula, sem pontuação — só letras, números e espaço. */
export function normalizarRotulo(texto: string): string {
  return texto
    .normalize("NFD")
    // Separa a letra do acento e descarta o acento, para "endereço" e
    // "endereco" chegarem ao mesmo lugar.
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export type MapaDeColunas = {
  /** Campo do sistema → índice da coluna na planilha. */
  indices: Partial<Record<CampoDaPlanilha, number>>;
  /** Campo do sistema → nome como veio escrito, para mostrar na tela. */
  rotulos: Partial<Record<CampoDaPlanilha, string>>;
  /** Colunas que o sistema não soube usar. Não impedem a importação. */
  ignoradas: string[];
};

/**
 * Descobre qual coluna da planilha alimenta qual campo.
 *
 * Uma coluna só serve a um campo, e um campo é preenchido por uma coluna só —
 * a primeira que corresponder. Planilha com "Telefone" e "Celular" usa o
 * "Telefone" e informa que ignorou a outra, em vez de escolher em silêncio.
 */
export function mapearColunas(cabecalho: string[]): MapaDeColunas {
  const normalizados = cabecalho.map(normalizarRotulo);
  const indices: Partial<Record<CampoDaPlanilha, number>> = {};
  const rotulos: Partial<Record<CampoDaPlanilha, string>> = {};
  const usadas = new Set<number>();

  for (const [campo, nomes] of SINONIMOS) {
    for (const nome of nomes) {
      const posicao = normalizados.findIndex(
        (rotulo, i) => !usadas.has(i) && rotulo === nome,
      );
      if (posicao !== -1) {
        indices[campo] = posicao;
        rotulos[campo] = cabecalho[posicao].trim();
        usadas.add(posicao);
        break;
      }
    }
  }

  const ignoradas = cabecalho
    .map((rotulo, i) => (usadas.has(i) || rotulo.trim() === "" ? null : rotulo.trim()))
    .filter((rotulo): rotulo is string => rotulo !== null);

  return { indices, rotulos, ignoradas };
}

// ---------------------------------------------------------------------
// Datas
// ---------------------------------------------------------------------

function ehDataReal(ano: number, mes: number, dia: number): boolean {
  if (mes < 1 || mes > 12 || dia < 1) return false;
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return dia <= ultimoDia;
}

export type DataInterpretada = {
  /** "AAAA-MM-DD", pronto para o banco. */
  iso: string;
  aviso?: string;
};

/**
 * Converte a data como a planilha escreveu.
 *
 * Aceita dd/mm/aaaa (o que o Excel em pt-BR produz), dd-mm-aaaa, dd.mm.aaaa e
 * aaaa-mm-dd. Ano de dois dígitos é aceito com aviso: "65" só pode virar 1965
 * por convenção, e a tela mostra o que foi entendido para conferência.
 */
export function interpretarDataBr(bruto: string): DataInterpretada | null {
  const texto = bruto.trim();
  if (!texto) return null;

  // Já veio no formato do banco.
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [, a, m, d] = iso;
    return ehDataReal(+a, +m, +d) ? { iso: `${a}-${m}-${d}` } : null;
  }

  const br = texto.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|\d{4})$/);
  if (!br) return null;

  const dia = Number(br[1]);
  const mes = Number(br[2]);
  let ano = Number(br[3]);
  let aviso: string | undefined;

  if (br[3].length === 2) {
    // Data de nascimento: ano à frente do atual só pode ser do século passado.
    const anoAtual = partesDoDia().ano;
    const doisUltimos = anoAtual % 100;
    ano = ano > doisUltimos ? 1900 + ano : 2000 + ano;
    aviso = `Ano com dois dígitos ("${br[3]}") foi lido como ${ano}. Confira.`;
  }

  if (!ehDataReal(ano, mes, dia)) return null;

  const pad = (n: number) => String(n).padStart(2, "0");
  return { iso: `${ano}-${pad(mes)}-${pad(dia)}`, aviso };
}

// ---------------------------------------------------------------------
// Linhas
// ---------------------------------------------------------------------

export type LinhaImportada = {
  /** Linha no arquivo, contando o cabeçalho como 1 — é o que a pessoa vê no Excel. */
  numero: number;
  valores: ValoresPaciente;
  /** Impedem a importação da linha. */
  erros: string[];
  /** Não impedem, mas merecem conferência. */
  avisos: string[];
};

export type AnaliseDaPlanilha = {
  mapa: MapaDeColunas;
  linhas: LinhaImportada[];
  separador: string;
  codificacao: PlanilhaLida["codificacao"];
  /** Erro que impede analisar o arquivo inteiro. */
  falha: string | null;
};

export const LIMITE_DE_LINHAS = 2000;

const ROTULO_DO_CAMPO: Record<string, string> = {
  nome: "Nome",
  nome_social: "Nome social",
  cpf: "CPF",
  data_nascimento: "Data de nascimento",
  telefone: "Telefone",
  email: "E-mail",
  cep: "CEP",
  uf: "UF",
};

/**
 * Lê o arquivo inteiro e devolve o que entendeu, sem gravar nada.
 *
 * As regras de validação são as mesmas do cadastro manual — `validarPaciente`.
 * Um CPF recusado no formulário precisa ser recusado aqui também, senão a
 * importação vira a porta dos fundos das regras.
 */
export function analisarPlanilha(bytes: Uint8Array): AnaliseDaPlanilha {
  const formato = formatoNaoSuportado(bytes);
  if (formato) {
    return {
      mapa: { indices: {}, rotulos: {}, ignoradas: [] },
      linhas: [],
      separador: ";",
      codificacao: "utf-8",
      falha: formato,
    };
  }

  const planilha = lerCsv(bytes);

  const vazia: AnaliseDaPlanilha = {
    mapa: { indices: {}, rotulos: {}, ignoradas: [] },
    linhas: [],
    separador: planilha.separador,
    codificacao: planilha.codificacao,
    falha: null,
  };

  if (planilha.aspaSemFechar !== null) {
    return {
      ...vazia,
      falha:
        `A linha ${planilha.aspaSemFechar} do arquivo abre aspas (") e elas não fecham. ` +
        "Corrija essa célula na planilha e exporte o CSV de novo.",
    };
  }

  if (planilha.cabecalho.length === 0) {
    return { ...vazia, falha: "O arquivo está vazio." };
  }

  const mapa = mapearColunas(planilha.cabecalho);

  if (mapa.indices.nome === undefined) {
    return {
      ...vazia,
      mapa,
      falha:
        "Não encontrei a coluna do nome. A primeira linha do arquivo precisa ser o " +
        'cabeçalho, com uma coluna chamada "Nome".',
    };
  }

  if (planilha.linhas.length > LIMITE_DE_LINHAS) {
    return {
      ...vazia,
      mapa,
      falha:
        `O arquivo tem ${planilha.linhas.length} linhas e o limite por importação é ` +
        `${LIMITE_DE_LINHAS}. Divida a planilha e importe em partes.`,
    };
  }

  // CPF repetido dentro do próprio arquivo: a primeira entra, as seguintes não.
  const cpfsVistos = new Map<string, number>();

  const linhas = planilha.linhas.map((celulas, i): LinhaImportada => {
    const numero = i + 2; // +1 pelo cabeçalho, +1 porque o Excel conta de 1
    const erros: string[] = [];
    const avisos: string[] = [];

    // Célula preenchida além do cabeçalho quase sempre é separador dentro de
    // um valor sem aspas ("Rua X, 100" num arquivo separado por vírgula): tudo
    // à direita dela escorregou uma coluna. Gravar isso poria o bairro no
    // campo da cidade. Célula vazia sobrando é só sobra do Excel.
    const sobras = celulas.slice(planilha.cabecalho.length).filter((c) => c !== "");
    if (sobras.length > 0) {
      erros.push(
        `A linha tem valores além das ${planilha.cabecalho.length} colunas do cabeçalho. ` +
          "Confira se algum valor tem o separador sem estar entre aspas.",
      );
    }

    const bruto = { ...PACIENTE_EM_BRANCO };
    for (const [campo, indice] of Object.entries(mapa.indices)) {
      bruto[campo as CampoDaPlanilha] = celulas[indice as number] ?? "";
    }

    // A data precisa virar ISO antes de a validação comum olhar para ela.
    if (bruto.data_nascimento) {
      const data = interpretarDataBr(bruto.data_nascimento);
      if (!data) {
        erros.push(
          `Data de nascimento "${bruto.data_nascimento}" não foi reconhecida. ` +
            "Use dd/mm/aaaa.",
        );
        bruto.data_nascimento = "";
      } else {
        bruto.data_nascimento = data.iso;
        if (data.aviso) avisos.push(data.aviso);
      }
    }

    // CEP fora dos 8 dígitos cai na regra de `validarPaciente` e recusa a
    // linha, como no cadastro manual. Completar o zero que o Excel come ou
    // importar sem CEP é decisão da clínica ainda em aberto (AGENTS.md §13,
    // item 12): completar com zero também inventaria CEP de outro estado
    // para quem só esqueceu um dígito.
    const valores = normalizarPaciente(bruto);

    for (const [campo, mensagem] of Object.entries(validarPaciente(valores))) {
      erros.push(`${ROTULO_DO_CAMPO[campo] ?? campo}: ${mensagem}`);
    }

    if (valores.cpf) {
      const anterior = cpfsVistos.get(valores.cpf);
      if (anterior !== undefined) {
        erros.push(`CPF repetido na linha ${anterior} deste mesmo arquivo.`);
      } else {
        cpfsVistos.set(valores.cpf, numero);
      }
    }

    // Não é erro: planilha antiga tem registro só com o primeiro nome, e
    // recusar isso impediria a clínica de trazer a base que ela já tem.
    if (valores.nome && !valores.nome.includes(" ")) {
      avisos.push(`Só um nome ("${valores.nome}") — confira se falta o sobrenome.`);
    }

    if (!valores.telefone && !valores.email) {
      avisos.push("Sem telefone e sem e-mail — não dá para confirmar atendimento.");
    }

    if (valores.origem) {
      avisos.push(
        `Origem "${valores.origem}" será gravada como texto livre; o cadastro ` +
          "manual usa uma lista fechada.",
      );
    }

    return { numero, valores, erros, avisos };
  });

  return {
    mapa,
    linhas,
    separador: planilha.separador,
    codificacao: planilha.codificacao,
    falha: null,
  };
}

/** Cabeçalho do arquivo-modelo, na ordem em que a clínica vai preencher. */
export const COLUNAS_DO_MODELO = [
  "Nome",
  "Nome social",
  "CPF",
  "Data de nascimento",
  "Telefone",
  "E-mail",
  "CEP",
  "Rua",
  "Número",
  "Complemento",
  "Bairro",
  "Cidade",
  "UF",
  "Origem",
  "Observações",
] as const;
