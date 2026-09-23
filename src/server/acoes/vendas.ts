"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { falha, sucesso, type ResultadoAcao } from "@/lib/acao";
import { ehFinanceira, usuarioAtual } from "@/lib/auth";
import { chaveDoDia, dataValida } from "@/lib/dates";
import { mensagemDoBanco } from "@/lib/erros-banco";
import { campoTexto, uuidValido, valoresDigitados } from "@/lib/formulario";
import { registrarFalha } from "@/lib/registro";
import { clienteServidor } from "@/lib/supabase/server";
import {
  bpDoBanco,
  bpParaBanco,
  centavosDoBanco,
  centavosParaBanco,
  lerPercentual,
  paraCentavos,
  percentualInformado,
} from "@/lib/moeda";
import {
  calcularVenda,
  formaUsaCartao,
  FORMAS_EM_ORDEM,
  parcelasValidas,
  recebimentoEmAberto,
  SITUACOES_EM_ABERTO,
  situacaoDaConfirmacao,
  type FormaPagamento,
} from "@/lib/venda";

/**
 * Ações do módulo de vendas.
 *
 * Toda gravação composta passa pelas funções do banco (`venda_registrar`,
 * `venda_alterar_pagamento`): tudo ou nada, com a RLS de quem chama. O
 * dinheiro é calculado em centavos inteiros e o gatilho da 0020 confere a
 * origem da taxa na chegada — se a tela e o banco divergirem, a gravação
 * falha em vez de guardar um número que ninguém viu.
 */

export type ErrosVenda = Partial<
  Record<
    | "paciente_id"
    | "procedimento_id"
    | "data_venda"
    | "valor_original"
    | "desconto"
    | "forma"
    | "parcelas"
    | "taxa"
    | "taxa_percentual"
    | "taxa_justificativa"
    | "situacao_inicial"
    | "vencimento"
    | "recebido_em"
    | "valor_recebido"
    | "motivo"
    | "geral",
    string
  >
>;

export type EstadoVenda = {
  erros: ErrosVenda;
  valores?: Record<string, string>;
};

function lerForma(valor: string): FormaPagamento | null {
  return (FORMAS_EM_ORDEM as string[]).includes(valor) ? (valor as FormaPagamento) : null;
}

/**
 * Resolve a taxa da venda a partir do formulário.
 *
 * Cartão exige uma linha da tabela padrão — é ela que preenche o percentual.
 * Taxa manual só entra para quem pode, com justificativa; a tabela padrão
 * nunca é tocada por aqui. Formas sem cartão têm taxa zero, sempre.
 */
async function resolverTaxa(
  dados: FormData,
  forma: FormaPagamento,
  parcelas: number,
  podeManual: boolean,
): Promise<
  | { taxaBp: number; taxaCartaoId: string | null; manual: boolean; justificativa: string | null }
  | { erroTaxa: string; campo?: "taxa_percentual" | "taxa_justificativa" }
> {
  if (!formaUsaCartao(forma)) {
    return { taxaBp: 0, taxaCartaoId: null, manual: false, justificativa: null };
  }

  const taxaCartaoId = campoTexto(dados, "taxa_cartao_id", 36);
  const querManual = dados.get("taxa_manual") === "sim";

  if (!uuidValido(taxaCartaoId)) {
    return {
      erroTaxa:
        "Escolha a operadora e o parcelamento. Se a combinação não existir, a administradora cadastra em Financeiro → Taxas de cartão.",
    };
  }

  const supabase = await clienteServidor();
  const { data: taxa, error } = await supabase
    .from("taxas_cartao")
    .select("id, tipo, parcelas, percentual, ativa")
    .eq("id", taxaCartaoId)
    .maybeSingle();

  // Falha de leitura não é "taxa inativa": dizer isso mandaria a pessoa
  // escolher outra taxa por um problema que não é dela.
  if (error) {
    registrarFalha("vendas: ler taxa de cartão", error);
    return { erroTaxa: mensagemDoBanco(error, "Não foi possível conferir a taxa agora. Tente de novo.") };
  }
  if (!taxa || !taxa.ativa) {
    return { erroTaxa: "Esta taxa não está mais ativa. Escolha outra." };
  }
  if (taxa.tipo !== forma) {
    return { erroTaxa: "A taxa escolhida é de outro tipo de cartão." };
  }
  if (taxa.parcelas !== parcelas) {
    return { erroTaxa: "A taxa escolhida é de outro parcelamento." };
  }

  if (!querManual) {
    return {
      taxaBp: bpDoBanco(Number(taxa.percentual)),
      taxaCartaoId,
      manual: false,
      justificativa: null,
    };
  }

  // Daqui para baixo é alteração manual: restrita e justificada.
  if (!podeManual) {
    return { erroTaxa: "Alterar a taxa é restrito ao financeiro e à administradora." };
  }

  // Vazio não é 0%: esquecer o campo não pode gravar uma taxa que ninguém
  // escolheu. Quem quer taxa zero digita 0.
  const textoPercentual = campoTexto(dados, "taxa_percentual", 10);
  if (!percentualInformado(textoPercentual)) {
    return { erroTaxa: "Informe a nova taxa. Para taxa zero, digite 0.", campo: "taxa_percentual" };
  }
  const bp = lerPercentual(textoPercentual);
  if (bp === null) {
    return { erroTaxa: "Percentual inválido. Use 6 ou 6,5.", campo: "taxa_percentual" };
  }

  const justificativa = campoTexto(dados, "taxa_justificativa", 500);
  if (justificativa.length < 5) {
    return { erroTaxa: "A taxa manual exige uma justificativa.", campo: "taxa_justificativa" };
  }

  return { taxaBp: bp, taxaCartaoId, manual: true, justificativa };
}

function revalidarVenda(vendaId?: string) {
  revalidatePath("/financeiro");
  revalidatePath("/financeiro/vendas");
  revalidatePath("/financeiro/movimentacoes");
  revalidatePath("/financeiro/fluxo");
  if (vendaId) revalidatePath(`/financeiro/vendas/${vendaId}`);
  revalidatePath("/");
}

export async function registrarVenda(
  _anterior: EstadoVenda,
  dados: FormData,
): Promise<EstadoVenda> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erros: { geral: "Sessão expirada. Entre novamente." } };

  const erros: ErrosVenda = {};

  const pacienteId = campoTexto(dados, "paciente_id", 36);
  const procedimentoId = campoTexto(dados, "procedimento_id", 36);
  const dataVenda = campoTexto(dados, "data_venda", 10);
  const forma = lerForma(campoTexto(dados, "forma", 20));
  const parcelas = Number(campoTexto(dados, "parcelas", 3) || "1");
  const textoOriginal = campoTexto(dados, "valor_original", 30);
  // Vazio não é R$ 0,00: o campo é obrigatório. Venda de valor zero existe
  // (desconto integral), mas só quando alguém digita 0.
  const originalCent = textoOriginal ? paraCentavos(textoOriginal) : null;
  const descontoCent = paraCentavos(campoTexto(dados, "desconto", 30) || "0");
  const situacaoInicial = campoTexto(dados, "situacao_inicial", 20);
  const vencimento = campoTexto(dados, "vencimento", 10);
  const recebidoEm = campoTexto(dados, "recebido_em", 10);
  const observacoes = campoTexto(dados, "observacoes", 2000);
  // A chave do envio (0028): gerada uma vez pelo formulário e repetida em
  // todo reenvio dele. Com ela, o duplo clique ou o POST reenviado devolve a
  // venda que já nasceu, em vez de criar a segunda. Sem chave válida (tela
  // aberta antes da mudança), a venda é registrada como sempre foi.
  const textoDaChave = campoTexto(dados, "chave_envio", 36);
  const chaveEnvio = uuidValido(textoDaChave) ? textoDaChave : null;

  if (!uuidValido(pacienteId)) erros.paciente_id = "Escolha a paciente.";
  if (!uuidValido(procedimentoId)) erros.procedimento_id = "Escolha o procedimento.";
  if (!dataValida(dataVenda)) erros.data_venda = "Informe uma data de venda válida.";
  if (!forma) erros.forma = "Escolha a forma de pagamento.";
  if (!textoOriginal) {
    erros.valor_original = "Informe o valor original.";
  } else if (originalCent === null) {
    erros.valor_original = "Valor inválido. Use 150 ou 150,00.";
  }
  if (descontoCent === null) erros.desconto = "Desconto inválido.";
  if (forma && !parcelasValidas(forma, parcelas)) {
    erros.parcelas = "Parcelamento inválido para esta forma.";
  }

  if (situacaoInicial !== "previsto" && situacaoInicial !== "recebido") {
    erros.situacao_inicial = "Escolha se o valor ainda vai entrar ou se já entrou.";
  }
  if (situacaoInicial === "previsto" && !dataValida(vencimento)) {
    erros.vencimento = "Informe a data prevista do recebimento.";
  }
  if (situacaoInicial === "recebido") {
    if (!dataValida(recebidoEm)) {
      erros.recebido_em = "Informe quando o valor entrou.";
    } else if (recebidoEm > chaveDoDia()) {
      erros.recebido_em = "O recebimento não pode estar no futuro. Use “A receber”.";
    }
  }

  if (Object.keys(erros).length > 0 || !forma) {
    return { erros, valores: valoresDigitados(dados) };
  }

  const taxa = await resolverTaxa(dados, forma, parcelas, await ehFinanceira());
  if ("erroTaxa" in taxa) {
    // O erro da taxa manual fica junto do campo que precisa de conserto.
    const errosDaTaxa: ErrosVenda = {};
    errosDaTaxa[taxa.campo ?? "taxa"] = taxa.erroTaxa;
    return { erros: errosDaTaxa, valores: valoresDigitados(dados) };
  }

  const conta = calcularVenda({
    originalCent: originalCent!,
    descontoCent: descontoCent!,
    taxaBp: taxa.taxaBp,
  });
  if ("erro" in conta) {
    return { erros: { desconto: conta.erro }, valores: valoresDigitados(dados) };
  }

  const supabase = await clienteServidor();

  // Nome do procedimento vira a descrição do recebimento.
  const { data: procedimento, error: erroProcedimento } = await supabase
    .from("procedimentos")
    .select("nome")
    .eq("id", procedimentoId)
    .maybeSingle();

  if (erroProcedimento) {
    registrarFalha("vendas: ler procedimento", erroProcedimento);
    return {
      erros: { geral: mensagemDoBanco(erroProcedimento, "Não foi possível conferir o procedimento.") },
      valores: valoresDigitados(dados),
    };
  }
  if (!procedimento) {
    return { erros: { procedimento_id: "Procedimento não encontrado." }, valores: valoresDigitados(dados) };
  }

  const { data: vendaId, error } = await supabase.rpc("venda_registrar", {
    p_paciente_id: pacienteId,
    p_procedimento_id: procedimentoId,
    p_data_venda: dataVenda,
    p_valor_original: centavosParaBanco(conta.originalCent),
    p_desconto: centavosParaBanco(conta.descontoCent),
    p_forma: forma,
    p_parcelas: parcelas,
    // O tipo gerado não marca os opcionais como nulos; o Postgres aceita.
    p_taxa_cartao_id: taxa.taxaCartaoId as unknown as string,
    p_taxa_percentual: bpParaBanco(conta.taxaBp),
    p_taxa_valor: centavosParaBanco(conta.taxaCent),
    p_taxa_manual: taxa.manual,
    p_taxa_justificativa: taxa.justificativa as unknown as string,
    p_observacoes: (observacoes || null) as unknown as string,
    p_situacao_inicial: situacaoInicial as "previsto" | "recebido",
    p_vencimento: situacaoInicial === "previsto" ? vencimento : dataVenda,
    p_recebido_em: (situacaoInicial === "recebido" ? recebidoEm : null) as unknown as string,
    p_descricao: procedimento.nome,
    // Opcional na função: sem chave, o parâmetro nem vai (default nulo).
    p_chave: chaveEnvio ?? undefined,
  });

  if (error || !vendaId) {
    registrarFalha("vendas: registrar", error);
    return {
      erros: {
        geral: mensagemDoBanco(error, "Não foi possível registrar a venda. Tente de novo.", {
          "23503": "Paciente ou procedimento não existe mais. Recarregue a página.",
        }),
      },
      valores: valoresDigitados(dados),
    };
  }

  revalidarVenda(vendaId);
  redirect(`/financeiro/vendas/${vendaId}`);
}

// ---------------------------------------------------------------------
// Alterar forma de pagamento ou taxa
// ---------------------------------------------------------------------

async function executarAlteracao(
  dados: FormData,
  tipo: "forma_pagamento" | "taxa_manual",
): Promise<EstadoVenda> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erros: { geral: "Sessão expirada. Entre novamente." } };

  if (!(await ehFinanceira())) {
    return {
      erros: { geral: "Alterar uma venda é restrito ao financeiro e à administradora." },
    };
  }

  const vendaId = campoTexto(dados, "venda_id", 36);
  if (!uuidValido(vendaId)) return { erros: { geral: "Venda não identificada." } };

  const motivo = campoTexto(dados, "motivo", 500);
  if (motivo.length < 5) {
    return { erros: { motivo: "Explique o motivo da alteração." }, valores: valoresDigitados(dados) };
  }

  const supabase = await clienteServidor();
  const { data: venda, error: erroVenda } = await supabase
    .from("vendas")
    .select("valor_original, desconto, valor_final, forma, parcelas, taxa_cartao_id")
    .eq("id", vendaId)
    .maybeSingle();

  if (erroVenda) {
    registrarFalha("vendas: ler venda para alterar", erroVenda);
    return { erros: { geral: mensagemDoBanco(erroVenda, "Não foi possível ler a venda.") } };
  }
  if (!venda) return { erros: { geral: "Venda não encontrada." } };

  let forma: FormaPagamento;
  let parcelas: number;
  let taxaBp: number;
  let taxaCartaoId: string | null;
  let manual: boolean;

  if (tipo === "forma_pagamento") {
    const escolhida = lerForma(campoTexto(dados, "forma", 20));
    parcelas = Number(campoTexto(dados, "parcelas", 3) || "1");

    if (!escolhida) {
      return { erros: { forma: "Escolha a forma de pagamento." }, valores: valoresDigitados(dados) };
    }
    forma = escolhida;
    if (!parcelasValidas(forma, parcelas)) {
      return { erros: { parcelas: "Parcelamento inválido." }, valores: valoresDigitados(dados) };
    }

    const taxa = await resolverTaxa(dados, forma, parcelas, true);
    if ("erroTaxa" in taxa) {
      return { erros: { taxa: taxa.erroTaxa }, valores: valoresDigitados(dados) };
    }
    taxaBp = taxa.taxaBp;
    taxaCartaoId = taxa.taxaCartaoId;
    manual = taxa.manual;
  } else {
    // Só a taxa muda; forma e parcelas ficam como estão. E só existe taxa
    // para alterar em venda no cartão (AGENTS.md §13, bug 1): PIX, dinheiro
    // e as demais formas não passam pela operadora.
    if (!formaUsaCartao(venda.forma)) {
      return { erros: { taxa: "Esta venda não é no cartão: não há taxa para alterar." } };
    }

    forma = venda.forma;
    parcelas = venda.parcelas;
    taxaCartaoId = venda.taxa_cartao_id;
    manual = true;

    const textoPercentual = campoTexto(dados, "taxa_percentual", 10);
    const bp = percentualInformado(textoPercentual) ? lerPercentual(textoPercentual) : null;
    if (bp === null) {
      return {
        erros: {
          taxa: percentualInformado(textoPercentual)
            ? "Percentual inválido. Use 6 ou 6,5."
            : "Informe a nova taxa. Para taxa zero, digite 0.",
        },
        valores: valoresDigitados(dados),
      };
    }
    taxaBp = bp;
  }

  const conta = calcularVenda({
    originalCent: centavosDoBanco(Number(venda.valor_original)),
    descontoCent: centavosDoBanco(Number(venda.desconto)),
    taxaBp,
  });
  if ("erro" in conta) {
    return { erros: { taxa: conta.erro }, valores: valoresDigitados(dados) };
  }

  const { error } = await supabase.rpc("venda_alterar_pagamento", {
    p_venda_id: vendaId,
    p_tipo: tipo,
    p_forma: forma,
    p_parcelas: parcelas,
    p_taxa_cartao_id: taxaCartaoId as unknown as string,
    p_taxa_percentual: bpParaBanco(conta.taxaBp),
    p_taxa_valor: centavosParaBanco(conta.taxaCent),
    p_taxa_manual: manual,
    p_motivo: motivo,
  });

  if (error) {
    registrarFalha("vendas: alterar pagamento", error);
    return {
      erros: { geral: mensagemDoBanco(error, "Não foi possível alterar a venda. Tente de novo.") },
      valores: valoresDigitados(dados),
    };
  }

  revalidarVenda(vendaId);
  redirect(`/financeiro/vendas/${vendaId}`);
}

export async function alterarFormaPagamento(
  _anterior: EstadoVenda,
  dados: FormData,
): Promise<EstadoVenda> {
  return executarAlteracao(dados, "forma_pagamento");
}

export async function alterarTaxaManual(
  _anterior: EstadoVenda,
  dados: FormData,
): Promise<EstadoVenda> {
  return executarAlteracao(dados, "taxa_manual");
}

// ---------------------------------------------------------------------
// Recebimento: confirmar e mudar situação
// ---------------------------------------------------------------------

export async function confirmarRecebimento(
  _anterior: EstadoVenda,
  dados: FormData,
): Promise<EstadoVenda> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erros: { geral: "Sessão expirada. Entre novamente." } };

  if (!(await ehFinanceira())) {
    return { erros: { geral: "Confirmar recebimento é do financeiro e da administradora." } };
  }

  const id = campoTexto(dados, "recebimento_id", 36);
  const vendaId = campoTexto(dados, "venda_id", 36);
  const recebidoEm = campoTexto(dados, "recebido_em", 10);
  const textoValor = campoTexto(dados, "valor_recebido", 30);
  const valorCent = textoValor ? paraCentavos(textoValor) : null;

  if (!uuidValido(id) || !uuidValido(vendaId)) {
    return { erros: { geral: "Recebimento não identificado." } };
  }
  if (!dataValida(recebidoEm)) {
    return { erros: { recebido_em: "Informe a data em que o valor entrou." }, valores: valoresDigitados(dados) };
  }
  if (recebidoEm > chaveDoDia()) {
    return {
      erros: { recebido_em: "A data do recebimento não pode estar no futuro." },
      valores: valoresDigitados(dados),
    };
  }
  // Campo vazio não é R$ 0,00. Confirmado é imutável e não tem desfazer
  // (AGENTS.md §8.4): um zero que ninguém digitou ficaria gravado para sempre
  // como divergência. Zero digitado continua aceito — é decisão em aberto.
  if (!textoValor) {
    return {
      erros: { valor_recebido: "Informe o valor que entrou. Se não entrou nada, não confirme." },
      valores: valoresDigitados(dados),
    };
  }
  if (valorCent === null) {
    return { erros: { valor_recebido: "Valor recebido inválido. Use 150 ou 150,00." }, valores: valoresDigitados(dados) };
  }

  const supabase = await clienteServidor();
  const { data: recebimento, error: erroLeitura } = await supabase
    .from("recebimentos")
    .select("situacao, valor, taxa_valor")
    .eq("id", id)
    .eq("venda_id", vendaId)
    .maybeSingle();

  if (erroLeitura) {
    registrarFalha("vendas: ler recebimento", erroLeitura);
    return { erros: { geral: mensagemDoBanco(erroLeitura, "Não foi possível ler o recebimento.") } };
  }
  if (!recebimento) return { erros: { geral: "Recebimento não encontrado." } };
  if (!recebimentoEmAberto(recebimento.situacao)) {
    return { erros: { geral: "Este recebimento já foi confirmado ou cancelado." } };
  }

  // Divergência é fato, não opinião: entrou diferente do líquido previsto.
  const liquidoCent =
    centavosDoBanco(Number(recebimento.valor)) -
    centavosDoBanco(Number(recebimento.taxa_valor));
  const situacao = situacaoDaConfirmacao(valorCent, liquidoCent);

  // A condição de situação vai no UPDATE: duas pessoas confirmando ao mesmo
  // tempo não gravam duas vezes — a segunda não encontra mais a linha aberta.
  const { data: confirmado, error } = await supabase
    .from("recebimentos")
    .update({
      situacao,
      recebido_em: recebidoEm,
      valor_recebido: centavosParaBanco(valorCent),
    })
    .eq("id", id)
    .in("situacao", [...SITUACOES_EM_ABERTO])
    .select("id")
    .maybeSingle();

  if (error) {
    registrarFalha("vendas: confirmar recebimento", error);
    return {
      erros: { geral: mensagemDoBanco(error, "Não foi possível confirmar o recebimento. Tente de novo.") },
      valores: valoresDigitados(dados),
    };
  }
  if (!confirmado) {
    return { erros: { geral: "Este recebimento acabou de ser confirmado ou cancelado por outra pessoa." } };
  }

  revalidarVenda(vendaId);
  redirect(`/financeiro/vendas/${vendaId}`);
}

const TRANSICOES_RECEBIMENTO = ["previsto", "pendente", "cancelado"] as const;
type TransicaoRecebimento = (typeof TRANSICOES_RECEBIMENTO)[number];

/** Previsto ↔ pendente e cancelamento. Nada aqui apaga linha nenhuma. */
export async function mudarSituacaoRecebimento(
  _anterior: ResultadoAcao,
  dados: FormData,
): Promise<ResultadoAcao> {
  const usuario = await usuarioAtual();
  if (!usuario) return falha("Sessão expirada. Entre novamente.");

  if (!(await ehFinanceira())) {
    return falha("Mudar a situação do recebimento é do financeiro e da administradora.");
  }

  const id = campoTexto(dados, "recebimento_id", 36);
  const vendaId = campoTexto(dados, "venda_id", 36);
  const para = campoTexto(dados, "para", 20);

  if (!uuidValido(id) || !(TRANSICOES_RECEBIMENTO as readonly string[]).includes(para)) {
    return falha("Recebimento ou situação inválida.");
  }

  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("recebimentos")
    .update({ situacao: para as TransicaoRecebimento })
    .eq("id", id)
    .in("situacao", [...SITUACOES_EM_ABERTO])
    .neq("situacao", para as TransicaoRecebimento)
    .select("id")
    .maybeSingle();

  if (error) {
    registrarFalha("vendas: mudar situação do recebimento", error);
    return falha(mensagemDoBanco(error, "Não foi possível mudar a situação. Tente de novo."));
  }
  if (!data) {
    return falha("O recebimento já estava nessa situação ou foi confirmado. A tela foi atualizada.");
  }

  revalidarVenda(uuidValido(vendaId) ? vendaId : undefined);
  return sucesso();
}
