"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { falha, sucesso, type ResultadoAcao } from "@/lib/acao";
import { usuarioAtual } from "@/lib/auth";
import { clienteServidor } from "@/lib/supabase/server";
import { chaveDoDia, dataValida, horaValida, instanteNaClinica } from "@/lib/dates";
import { mensagemDoBanco } from "@/lib/erros-banco";
import { formatarHora } from "@/lib/format";
import { campoTexto, uuidValido, valoresDigitados } from "@/lib/formulario";
import { registrarFalha } from "@/lib/registro";
import { enderecoDaAgenda } from "@/components/agenda/parametros-agenda";
import {
  lerDuracao,
  lerValorEmReais,
  situacaoValida,
} from "@/lib/atendimento";

/**
 * Marcar, remarcar e mudar a situação do atendimento.
 *
 * A RLS já barra quem não tem acesso; as checagens aqui devolvem mensagem em
 * vez de erro cru. A trilha de situações é gravada por gatilho no banco, com
 * autor e hora — a ação só atualiza a coluna.
 *
 * O choque de horário é conferido duas vezes, e as duas são necessárias. A
 * ação confere antes, para dizer COM QUEM choca; o gatilho da 0021 confere de
 * novo com o profissional travado, e é ele que impede duas marcações no mesmo
 * segundo de passarem juntas.
 */

export type ErrosAtendimento = Partial<
  Record<
    | "paciente_id"
    | "profissional_id"
    | "procedimento_id"
    | "data"
    | "hora"
    | "duracao_min"
    | "valor"
    | "geral",
    string
  >
>;

export type EstadoAtendimento = {
  erros: ErrosAtendimento;
  valores?: Record<string, string>;
};

const CHOQUE_NO_BANCO =
  "Este horário acabou de ser ocupado para este profissional. Atualize a agenda e escolha outro horário.";

/**
 * Situações que liberam a vaga — as mesmas que o gatilho da 0021 deixa passar
 * sem comparar intervalo. Uma lista só, para a conferência da ação e a do
 * banco não divergirem.
 */
const NAO_OCUPAM_A_VAGA: readonly string[] = ["cancelado", "ausente"];

type Campos = {
  paciente_id: string;
  profissional_id: string;
  procedimento_id: string;
  inicio: Date;
  duracao_min: number;
  valor: number;
  observacoes: string | null;
};

function validar(
  dados: FormData,
): { erros: ErrosAtendimento; valores: Record<string, string> } | { campos: Campos } {
  const erros: ErrosAtendimento = {};

  const pacienteId = campoTexto(dados, "paciente_id", 36);
  const profissionalId = campoTexto(dados, "profissional_id", 36);
  const procedimentoId = campoTexto(dados, "procedimento_id", 36);
  const data = campoTexto(dados, "data", 10);
  const hora = campoTexto(dados, "hora", 5);
  const duracao = lerDuracao(campoTexto(dados, "duracao_min", 10));
  const valor = lerValorEmReais(campoTexto(dados, "valor", 30));
  const observacoes = campoTexto(dados, "observacoes", 2000);

  if (!uuidValido(pacienteId)) erros.paciente_id = "Escolha a paciente.";
  if (!uuidValido(profissionalId)) erros.profissional_id = "Escolha quem atende.";
  if (!uuidValido(procedimentoId)) erros.procedimento_id = "Escolha o procedimento.";

  if (!data) erros.data = "Informe a data.";
  else if (!dataValida(data)) erros.data = "Data inválida.";
  if (!hora) erros.hora = "Informe a hora.";
  else if (!horaValida(hora)) erros.hora = "Hora inválida. Use o formato 14:30.";

  if (duracao === null) erros.duracao_min = "Duração em minutos, de 5 a 480.";
  if (valor === null) erros.valor = "Valor inválido. Use 150 ou 150,00.";

  if (Object.keys(erros).length > 0) {
    return { erros, valores: valoresDigitados(dados) };
  }

  const [ano, mes, dia] = data.split("-").map(Number);
  const [h, m] = hora.split(":").map(Number);

  return {
    campos: {
      paciente_id: pacienteId,
      profissional_id: profissionalId,
      procedimento_id: procedimentoId,
      // Hora de parede da clínica, não do servidor.
      inicio: instanteNaClinica(ano, mes, dia, h, m),
      duracao_min: duracao!,
      valor: valor!,
      observacoes: observacoes || null,
    },
  };
}

/**
 * Choque de horário com outro atendimento do mesmo profissional, para dizer
 * com quem choca.
 *
 * A janela de 8 horas para trás é a duração máxima (`lerDuracao`): um
 * atendimento que começou antes dela não alcança o novo horário. Não é mais a
 * garantia — é o gatilho `atendimentos_sem_choque` (0021) —, então aumentar o
 * teto de duração sem mexer aqui só troca a mensagem, não cria overbooking.
 */
async function conflitoDeHorario(
  campos: Campos,
  ignorarId: string | null,
): Promise<string | null> {
  const supabase = await clienteServidor();

  const fim = new Date(campos.inicio.getTime() + campos.duracao_min * 60_000);
  const { data, error } = await supabase
    .from("atendimentos")
    .select("id, inicio, duracao_min, pacientes ( nome, nome_social )")
    .eq("profissional_id", campos.profissional_id)
    .not("situacao", "in", `(${NAO_OCUPAM_A_VAGA.join(",")})`)
    .gte("inicio", new Date(campos.inicio.getTime() - 8 * 3_600_000).toISOString())
    .lt("inicio", fim.toISOString());

  // Sem conseguir ler a agenda, não dá para prometer que o horário está livre.
  if (error) {
    registrarFalha("agenda: conferir choque de horário", error);
    return "Não foi possível conferir a agenda agora. Tente de novo.";
  }

  for (const outro of data ?? []) {
    if (outro.id === ignorarId) continue;
    const outroInicio = new Date(outro.inicio).getTime();
    const outroFim = outroInicio + outro.duracao_min * 60_000;
    if (outroInicio < fim.getTime() && outroFim > campos.inicio.getTime()) {
      const nome = outro.pacientes?.nome_social || outro.pacientes?.nome || "outra paciente";
      return `Choca com o atendimento de ${nome} às ${formatarHora(new Date(outro.inicio))}.`;
    }
  }

  return null;
}

function revalidarAgenda(id?: string) {
  revalidatePath("/agenda");
  revalidatePath("/relacionamento");
  revalidatePath("/");
  if (id) revalidatePath(`/agenda/${id}/editar`);
}

/**
 * Depois de salvar, a agenda do dia do atendimento, com o filtro de
 * profissional que estava na tela de onde se veio (campo oculto
 * `filtro_profissional`). Filtro que não é id cai fora, e a agenda abre com
 * todas.
 */
function destinoDepoisDeSalvar(dados: FormData, inicio: Date): string {
  const filtro = campoTexto(dados, "filtro_profissional", 36);
  return enderecoDaAgenda(chaveDoDia(inicio), uuidValido(filtro) ? filtro : null);
}

export async function marcarAtendimento(
  _anterior: EstadoAtendimento,
  dados: FormData,
): Promise<EstadoAtendimento> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erros: { geral: "Sessão expirada. Entre novamente." } };

  const resultado = validar(dados);
  if ("erros" in resultado) return resultado;

  const choque = await conflitoDeHorario(resultado.campos, null);
  if (choque) return { erros: { hora: choque }, valores: valoresDigitados(dados) };

  const supabase = await clienteServidor();
  const { error } = await supabase.from("atendimentos").insert({
    ...resultado.campos,
    inicio: resultado.campos.inicio.toISOString(),
    criado_por: usuario.id,
  });

  if (error) {
    registrarFalha("agenda: marcar atendimento", error);
    const mensagem = mensagemDoBanco(error, "Não foi possível marcar o atendimento. Tente de novo.", {
      "23P01": CHOQUE_NO_BANCO,
      "23503": "Paciente, profissional ou procedimento não existe mais. Recarregue a página.",
    });
    return {
      erros: error.code === "23P01" ? { hora: mensagem } : { geral: mensagem },
      valores: valoresDigitados(dados),
    };
  }

  revalidarAgenda();
  redirect(destinoDepoisDeSalvar(dados, resultado.campos.inicio));
}

export async function atualizarAtendimento(
  _anterior: EstadoAtendimento,
  dados: FormData,
): Promise<EstadoAtendimento> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erros: { geral: "Sessão expirada. Entre novamente." } };

  const id = campoTexto(dados, "id", 36);
  if (!uuidValido(id)) return { erros: { geral: "Atendimento não identificado." } };

  const resultado = validar(dados);
  if ("erros" in resultado) return resultado;

  const supabase = await clienteServidor();

  // A ação confere choque só quando o gatilho da 0021 conferiria — senão
  // recusaria o que o banco aceita:
  // - cancelado e ausente não ocupam a vaga. Editar um atendimento que
  //   CONTINUA cancelado (anotar o motivo, corrigir o valor) não pode ser
  //   barrado porque a vaga foi reaproveitada. Este formulário não muda a
  //   situação; reabrir é `mudarSituacao`, que o gatilho confere;
  // - sem mudar horário, duração nem profissional, o intervalo ocupado é o
  //   mesmo. Um choque antigo (de antes da 0021) não pode travar a edição de
  //   uma observação.
  // Se alguém reabrir ou remarcar entre esta leitura e o UPDATE, o gatilho
  // confere a linha nova e o choque volta como 23P01, tratado abaixo.
  const { data: atual, error: erroAtual } = await supabase
    .from("atendimentos")
    .select("situacao, inicio, duracao_min, profissional_id")
    .eq("id", id)
    .maybeSingle();

  if (erroAtual) {
    registrarFalha("agenda: ler atendimento para editar", erroAtual);
    return {
      erros: {
        geral: mensagemDoBanco(erroAtual, "Não foi possível salvar as alterações. Tente de novo."),
      },
      valores: valoresDigitados(dados),
    };
  }
  if (!atual) {
    return { erros: { geral: "Atendimento não encontrado." }, valores: valoresDigitados(dados) };
  }

  const mesmoIntervalo =
    new Date(atual.inicio).getTime() === resultado.campos.inicio.getTime() &&
    atual.duracao_min === resultado.campos.duracao_min &&
    atual.profissional_id === resultado.campos.profissional_id;

  if (!NAO_OCUPAM_A_VAGA.includes(atual.situacao) && !mesmoIntervalo) {
    const choque = await conflitoDeHorario(resultado.campos, id);
    if (choque) return { erros: { hora: choque }, valores: valoresDigitados(dados) };
  }

  const { data, error } = await supabase
    .from("atendimentos")
    .update({
      ...resultado.campos,
      inicio: resultado.campos.inicio.toISOString(),
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    registrarFalha("agenda: remarcar atendimento", error);
    const mensagem = mensagemDoBanco(error, "Não foi possível salvar as alterações. Tente de novo.", {
      "23P01": CHOQUE_NO_BANCO,
    });
    return {
      erros: error.code === "23P01" ? { hora: mensagem } : { geral: mensagem },
      valores: valoresDigitados(dados),
    };
  }

  // Sem linha devolvida: o atendimento não existe, ou a RLS não deixou ver.
  if (!data) {
    return { erros: { geral: "Atendimento não encontrado." }, valores: valoresDigitados(dados) };
  }

  revalidarAgenda(id);
  redirect(destinoDepoisDeSalvar(dados, resultado.campos.inicio));
}

export type PacienteParaSelecao = { id: string; nome: string; detalhe: string; telefone?: string | null };

/**
 * Busca de paciente para o seletor do formulário.
 *
 * É uma ação de servidor porque o seletor é componente de cliente: ele chama
 * esta função direto, sem rota de API. Reusa a mesma consulta da listagem —
 * mesmo escape de termo, mesma RLS.
 */
export async function buscarPacientesParaSelecao(
  termo: string,
): Promise<PacienteParaSelecao[]> {
  const usuario = await usuarioAtual();
  if (!usuario) return [];

  const { listarPacientes } = await import("@/server/consultas/pacientes");
  const resultado = await listarPacientes({ busca: String(termo ?? "").slice(0, 80) });

  return resultado.itens.slice(0, 8).map((p) => ({
    id: p.id,
    nome: p.exibicao,
    detalhe:
      [p.telefone, p.email].filter(Boolean).join(" · ") || "sem contato cadastrado",
    telefone: p.telefone,
  }));
}

/**
 * Muda a situação. Aceita qualquer situação válida e diferente da atual —
 * engano precisa ter volta — e a interface é quem oferece só os caminhos que
 * fazem sentido. O gatilho no banco grava quem mudou e quando.
 *
 * Reabrir um cancelado passa pela conferência de choque (0021): se o horário
 * foi ocupado nesse meio-tempo, a pessoa é avisada e remarca.
 */
export async function mudarSituacao(
  _anterior: ResultadoAcao,
  dados: FormData,
): Promise<ResultadoAcao> {
  const usuario = await usuarioAtual();
  if (!usuario) return falha("Sessão expirada. Entre novamente.");

  const id = campoTexto(dados, "id", 36);
  const para = campoTexto(dados, "para", 40);
  if (!uuidValido(id) || !situacaoValida(para)) {
    return falha("Atendimento ou situação inválida.");
  }

  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("atendimentos")
    .update({ situacao: para })
    .eq("id", id)
    .neq("situacao", para)
    .select("id")
    .maybeSingle();

  if (error) {
    registrarFalha("agenda: mudar situação", error);
    return falha(
      mensagemDoBanco(error, "Não foi possível mudar a situação. Tente de novo.", {
        "23P01":
          "O horário deste atendimento já foi ocupado por outro. Para reabrir, remarque para um horário livre.",
      }),
    );
  }

  if (!data) {
    return falha("A situação já tinha mudado. A agenda foi atualizada.");
  }

  revalidarAgenda();
  return sucesso();
}
