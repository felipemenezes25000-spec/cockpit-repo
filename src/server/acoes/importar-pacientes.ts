"use server";

import { revalidatePath } from "next/cache";
import { ehAdministradora, usuarioAtual } from "@/lib/auth";
import { clienteServidor } from "@/lib/supabase/server";
import { analisarPlanilha, type LinhaImportada } from "@/lib/importacao";
import { paraOBanco } from "@/lib/paciente";

/**
 * Importação de pacientes a partir de uma planilha.
 *
 * O fluxo tem dois passos e **o mesmo arquivo é enviado nos dois**: o primeiro
 * só analisa e mostra, o segundo grava. Reenviar o arquivo em vez de devolver
 * as linhas já analisadas garante que o que entra no banco é o que o servidor
 * leu, não o que o navegador disse ter lido.
 *
 * Restrito à administradora. Isto é regra da aplicação, não do banco: a RLS
 * permite que a recepção cadastre paciente, porque cadastrar uma a uma é
 * trabalho dela. Trazer uma base inteira de uma vez é outra coisa.
 */

const TAMANHO_MAXIMO = 2 * 1024 * 1024; // 2 MB
const LOTE = 100;

export type SituacaoDaLinha = "pronta" | "erro" | "ja_cadastrada";

export type LinhaAnalisada = LinhaImportada & {
  situacao: SituacaoDaLinha;
  /** Preenchido quando o CPF já existe no banco. */
  jaCadastrada?: { id: string; nome: string };
};

export type ColunaReconhecida = { campo: string; rotulo: string };

export type EstadoImportacao = {
  etapa: "vazio" | "analisado" | "concluido";
  falha: string | null;
  arquivo: string | null;
  codificacao: "utf-8" | "windows-1252" | null;
  separador: string | null;
  colunas: ColunaReconhecida[];
  colunasIgnoradas: string[];
  linhas: LinhaAnalisada[];
  resumo: { total: number; prontas: number; comErro: number; jaCadastradas: number };
  /** Preenchido só na etapa "concluido". */
  gravadas: number;
  /** Linhas que a gravação recusou, com o motivo do banco. */
  recusadas: { numero: number; nome: string; motivo: string }[];
};

const VAZIO: EstadoImportacao = {
  etapa: "vazio",
  falha: null,
  arquivo: null,
  codificacao: null,
  separador: null,
  colunas: [],
  colunasIgnoradas: [],
  linhas: [],
  resumo: { total: 0, prontas: 0, comErro: 0, jaCadastradas: 0 },
  gravadas: 0,
  recusadas: [],
};

const ROTULO_DO_CAMPO: Record<string, string> = {
  nome: "Nome",
  nome_social: "Nome social",
  cpf: "CPF",
  data_nascimento: "Data de nascimento",
  telefone: "Telefone",
  email: "E-mail",
  cep: "CEP",
  logradouro: "Rua",
  numero: "Número",
  complemento: "Complemento",
  bairro: "Bairro",
  cidade: "Cidade",
  uf: "UF",
  origem: "Origem",
  observacoes: "Observações",
};

function comFalha(mensagem: string, arquivo: string | null = null): EstadoImportacao {
  return { ...VAZIO, falha: mensagem, arquivo };
}

/**
 * Lê o arquivo, valida linha a linha e confere quais CPFs já existem.
 *
 * Não grava nada — é o que alimenta a prévia.
 */
async function analisar(arquivo: File): Promise<EstadoImportacao> {
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const analise = analisarPlanilha(bytes);

  if (analise.falha) return comFalha(analise.falha, arquivo.name);

  const supabase = await clienteServidor();

  // CPFs da planilha que já estão no banco. Sem CPF não dá para afirmar que é
  // a mesma pessoa — homônimo existe —, então só o CPF marca duplicata.
  const cpfs = [...new Set(analise.linhas.map((l) => l.valores.cpf).filter(Boolean))];
  const existentes = new Map<string, { id: string; nome: string }>();

  for (let i = 0; i < cpfs.length; i += LOTE) {
    const { data } = await supabase
      .from("pacientes")
      .select("id, nome, nome_social, cpf")
      .in("cpf", cpfs.slice(i, i + LOTE));

    for (const p of data ?? []) {
      if (p.cpf) existentes.set(p.cpf, { id: p.id, nome: p.nome_social?.trim() || p.nome });
    }
  }

  const linhas: LinhaAnalisada[] = analise.linhas.map((linha) => {
    if (linha.erros.length > 0) return { ...linha, situacao: "erro" };

    const jaCadastrada = linha.valores.cpf ? existentes.get(linha.valores.cpf) : undefined;
    if (jaCadastrada) return { ...linha, situacao: "ja_cadastrada", jaCadastrada };

    return { ...linha, situacao: "pronta" };
  });

  return {
    ...VAZIO,
    etapa: "analisado",
    arquivo: arquivo.name,
    codificacao: analise.codificacao,
    separador: analise.separador,
    colunas: Object.entries(analise.mapa.rotulos).map(([campo, rotulo]) => ({
      campo: ROTULO_DO_CAMPO[campo] ?? campo,
      rotulo: rotulo as string,
    })),
    colunasIgnoradas: analise.mapa.ignoradas,
    linhas,
    resumo: {
      total: linhas.length,
      prontas: linhas.filter((l) => l.situacao === "pronta").length,
      comErro: linhas.filter((l) => l.situacao === "erro").length,
      jaCadastradas: linhas.filter((l) => l.situacao === "ja_cadastrada").length,
    },
  };
}

export async function importarPacientes(
  _anterior: EstadoImportacao,
  dados: FormData,
): Promise<EstadoImportacao> {
  const usuario = await usuarioAtual();
  if (!usuario) return comFalha("Sessão expirada. Entre novamente.");

  if (!(await ehAdministradora())) {
    return comFalha("Só a administradora pode importar pacientes em massa.");
  }

  const arquivo = dados.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return comFalha("Escolha um arquivo CSV.");
  }

  if (arquivo.size > TAMANHO_MAXIMO) {
    return comFalha(
      `O arquivo tem ${(arquivo.size / 1024 / 1024).toFixed(1)} MB e o limite é 2 MB. ` +
        "Divida a planilha e importe em partes.",
    );
  }

  const estado = await analisar(arquivo);

  // Primeiro passo, ou análise que já falhou: só mostrar.
  if (dados.get("confirmar") !== "sim" || estado.falha) return estado;

  const prontas = estado.linhas.filter((l) => l.situacao === "pronta");
  if (prontas.length === 0) {
    return { ...estado, falha: "Nenhuma linha está pronta para importar." };
  }

  const supabase = await clienteServidor();
  const recusadas: EstadoImportacao["recusadas"] = [];
  let gravadas = 0;

  for (let i = 0; i < prontas.length; i += LOTE) {
    const lote = prontas.slice(i, i + LOTE);
    const registros = lote.map((l) => ({
      ...paraOBanco(l.valores),
      criado_por: usuario.id,
    }));

    const { error, count } = await supabase
      .from("pacientes")
      .insert(registros, { count: "exact" });

    if (!error) {
      gravadas += count ?? lote.length;
      continue;
    }

    // O lote inteiro caiu por causa de uma linha. Reenvia uma a uma para
    // gravar o que dá e dizer exatamente qual linha ficou de fora.
    for (const linha of lote) {
      const { error: erroDaLinha } = await supabase
        .from("pacientes")
        .insert({ ...paraOBanco(linha.valores), criado_por: usuario.id });

      if (erroDaLinha) {
        recusadas.push({
          numero: linha.numero,
          nome: linha.valores.nome,
          motivo:
            erroDaLinha.code === "23505"
              ? "CPF já cadastrado (alguém cadastrou durante a importação)."
              : erroDaLinha.message,
        });
      } else {
        gravadas += 1;
      }
    }
  }

  revalidatePath("/pacientes");
  revalidatePath("/");

  return { ...estado, etapa: "concluido", gravadas, recusadas };
}
