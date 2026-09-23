import "server-only";

import { falhaDeConsulta, registrarFalha } from "@/lib/registro";

import { cache } from "react";
import { ehAdministradora } from "@/lib/auth";
import type {
  CampoDoModelo,
  CampoRespondido,
  SituacaoDocumento,
  TipoCampo,
  TipoDocumento,
} from "@/lib/documento";
import { termoDeBusca } from "@/lib/busca";
import { tokenPlausivel } from "@/lib/documento";
import { estruturaAusente } from "@/lib/erros-banco";
import { uuidValido } from "@/lib/formulario";
import { nomeExibido } from "@/lib/paciente";
import { clienteServidor } from "@/lib/supabase/server";
import { paginaAlemDoFim } from "./todas-as-linhas";

export const POR_PAGINA_DOCUMENTOS = 20;

export class EstruturaDocumentoPendenteError extends Error {
  constructor() {
    super("A migração de documentos ainda não foi aplicada.");
    this.name = "EstruturaDocumentoPendenteError";
  }
}

// A regra é a de `lib/erros-banco.ts`. A antiga checagem pelo nome da tabela
// na mensagem sobrava: tabela ausente chega como PGRST205 ou 42P01, que a
// regra comum já reconhece — e um texto qualquer que citasse a tabela virava
// "migração pendente" por engano.
const estruturaPendente = estruturaAusente;

function aoFalhar(
  error: { code?: string; message?: string } | null,
  assunto: string,
): never {
  if (estruturaPendente(error)) throw new EstruturaDocumentoPendenteError();
  falhaDeConsulta(`consulta documentos: ${assunto}`, error, `Não foi possível carregar ${assunto}.`);
}

/**
 * O `jsonb` do banco chega como `Json`, que é "qualquer coisa". Estas duas
 * funções são a fronteira: depois delas o resto do código trabalha com tipos
 * do domínio, e nada de `as` espalhado por aí.
 */
function listaDeTextos(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((item): item is string => typeof item === "string");
}

function camposDoModelo(valor: unknown): CampoDoModelo[] {
  if (!Array.isArray(valor)) return [];

  return valor.flatMap((bruto) => {
    if (!bruto || typeof bruto !== "object") return [];
    const campo = bruto as Record<string, unknown>;
    if (typeof campo.chave !== "string" || typeof campo.rotulo !== "string") return [];

    return [
      {
        chave: campo.chave,
        rotulo: campo.rotulo,
        tipo: String(campo.tipo ?? "texto") as TipoCampo,
        obrigatorio: campo.obrigatorio === true,
        ajuda: typeof campo.ajuda === "string" ? campo.ajuda : "",
        opcoes: listaDeTextos(campo.opcoes),
      },
    ];
  });
}

// ---------------------------------------------------------------------
// Modelos
// ---------------------------------------------------------------------

export type VersaoDoModelo = {
  id: number;
  numero: number;
  corpo: string;
  campos: CampoDoModelo[];
  motivo: string;
  criadoEm: Date;
  criadoPor: string | null;
};

export type ModeloDaLista = {
  id: string;
  tipo: TipoDocumento;
  nome: string;
  descricao: string;
  ativo: boolean;
  atualizadoEm: Date;
  exemplo: boolean;
  versaoAtual: number;
  /**
   * Quantos documentos já saíram deste modelo. Zero permite despreocupação.
   *
   * `null` é "não visível para este perfil", nunca zero: a RLS de `documentos`
   * esconde a anamnese de quem não é administradora, e contar o que sobra
   * mostraria "nenhum documento emitido" num modelo já usado (AGENTS.md §5).
   */
  emitidos: number | null;
};

export type ModeloCompleto = {
  id: string;
  tipo: TipoDocumento;
  nome: string;
  descricao: string;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
  exemplo: boolean;
  versoes: VersaoDoModelo[];
  versaoAtual: VersaoDoModelo | null;
};

/** Modelos em condição de emitir: ativos e com texto. */
export type ModeloParaEmissao = {
  id: string;
  tipo: TipoDocumento;
  nome: string;
  descricao: string;
  versao: number;
  corpo: string;
  campos: CampoDoModelo[];
};

export const listarModelos = cache(
  async (opcoes: { incluirInativos?: boolean } = {}): Promise<ModeloDaLista[]> => {
    const supabase = await clienteServidor();

    let consulta = supabase
      .from("modelos_documento")
      .select("id, tipo, nome, descricao, ativo, atualizado_em, exemplo");

    if (!opcoes.incluirInativos) consulta = consulta.eq("ativo", true);

    const { data, error } = await consulta
      .order("tipo", { ascending: true })
      .order("nome", { ascending: true });

    if (error) aoFalhar(error, "os modelos");

    const modelos = data ?? [];
    const ids = modelos.map((modelo) => modelo.id);
    if (ids.length === 0) return [];

    // Versão vigente de cada modelo: uma consulta para todos, ordenada, e a
    // primeira ocorrência de cada id é a maior versão.
    const { data: versoes, error: erroVersoes } = await supabase
      .from("modelo_documento_versoes")
      .select("modelo_id, versao")
      .in("modelo_id", ids)
      .order("versao", { ascending: false });

    if (erroVersoes) aoFalhar(erroVersoes, "as versões dos modelos");

    const vigente = new Map<string, number>();
    for (const versao of versoes ?? []) {
      if (!vigente.has(versao.modelo_id)) vigente.set(versao.modelo_id, versao.versao);
    }

    // A tela é aberta à recepção, e a RLS de `documentos` esconde dela as
    // anamneses em silêncio. Para quem não é administradora, a contagem de um
    // modelo de anamnese é `null` — e nem se pergunta ao banco.
    const administradora = await ehAdministradora();

    // Conta no banco, um `count` por modelo, sem trazer linha nenhuma: baixar
    // as linhas e contar aqui travava no `max_rows` do PostgREST (1000), que
    // corta sem erro. Os modelos são poucos; os documentos crescem sem teto.
    const contagem = new Map<string, number | null>(
      await Promise.all(
        modelos.map(async (modelo): Promise<[string, number | null]> => {
          if (modelo.tipo === "anamnese" && !administradora) return [modelo.id, null];

          const { count, error: erroContagem } = await supabase
            .from("documentos")
            .select("id", { count: "exact", head: true })
            .eq("modelo_id", modelo.id);

          if (erroContagem) aoFalhar(erroContagem, "a contagem de documentos");
          return [modelo.id, count ?? 0];
        }),
      ),
    );

    return modelos.map((modelo) => ({
      id: modelo.id,
      tipo: modelo.tipo,
      nome: modelo.nome,
      descricao: modelo.descricao,
      ativo: modelo.ativo,
      atualizadoEm: new Date(modelo.atualizado_em),
      exemplo: modelo.exemplo,
      versaoAtual: vigente.get(modelo.id) ?? 0,
      emitidos: contagem.get(modelo.id) ?? null,
    }));
  },
);

export const modeloPorId = cache(
  async (id: string): Promise<ModeloCompleto | null> => {
    // Id malformado não é "falha de consulta": o Postgres recusaria o cast
    // para uuid (22P02) e a tela viraria erro em vez de 404.
    if (!uuidValido(id)) return null;
    const supabase = await clienteServidor();

    const { data, error } = await supabase
      .from("modelos_documento")
      .select("id, tipo, nome, descricao, ativo, criado_em, atualizado_em, exemplo")
      .eq("id", id)
      .maybeSingle();

    if (error) aoFalhar(error, "o modelo");
    if (!data) return null;

    const { data: versoes, error: erroVersoes } = await supabase
      .from("modelo_documento_versoes")
      .select("id, versao, corpo, campos, motivo, criado_em, perfis ( nome )")
      .eq("modelo_id", id)
      .order("versao", { ascending: false });

    if (erroVersoes) aoFalhar(erroVersoes, "as versões do modelo");

    const lista: VersaoDoModelo[] = (versoes ?? []).map((versao) => ({
      id: versao.id,
      numero: versao.versao,
      corpo: versao.corpo,
      campos: camposDoModelo(versao.campos),
      motivo: versao.motivo,
      criadoEm: new Date(versao.criado_em),
      criadoPor: versao.perfis?.nome ?? null,
    }));

    return {
      id: data.id,
      tipo: data.tipo,
      nome: data.nome,
      descricao: data.descricao,
      ativo: data.ativo,
      criadoEm: new Date(data.criado_em),
      atualizadoEm: new Date(data.atualizado_em),
      exemplo: data.exemplo,
      versoes: lista,
      versaoAtual: lista[0] ?? null,
    };
  },
);

/**
 * Modelos que a tela de emissão oferece, já com o texto da versão vigente
 * para a prévia.
 *
 * A prévia é só para os olhos de quem emite. O que congela no documento é o
 * texto que `documento_emitir` lê do banco — nunca este, que veio pela tela.
 *
 * Anamnese só a administradora emite (§8.7). A RLS deixa todo perfil LER os
 * modelos — a recepção consulta o catálogo —, então o filtro de quem pode
 * EMITIR é daqui: oferecer "Anamnese · …" à recepção era oferecer uma porta
 * que o banco sempre fecha ("Apenas a administradora emite anamnese").
 */
export const modelosParaEmissao = cache(
  async (): Promise<ModeloParaEmissao[]> => {
    const supabase = await clienteServidor();
    const administradora = await ehAdministradora();

    let consulta = supabase
      .from("modelos_documento")
      .select("id, tipo, nome, descricao")
      .eq("ativo", true);

    if (!administradora) consulta = consulta.neq("tipo", "anamnese");

    const { data, error } = await consulta
      .order("tipo", { ascending: true })
      .order("nome", { ascending: true });

    if (error) aoFalhar(error, "os modelos");

    const modelos = data ?? [];
    if (modelos.length === 0) return [];

    const { data: versoes, error: erroVersoes } = await supabase
      .from("modelo_documento_versoes")
      .select("modelo_id, versao, corpo, campos")
      .in(
        "modelo_id",
        modelos.map((modelo) => modelo.id),
      )
      .order("versao", { ascending: false });

    if (erroVersoes) aoFalhar(erroVersoes, "o texto dos modelos");

    const vigente = new Map<
      string,
      { versao: number; corpo: string; campos: CampoDoModelo[] }
    >();
    for (const versao of versoes ?? []) {
      if (!vigente.has(versao.modelo_id)) {
        vigente.set(versao.modelo_id, {
          versao: versao.versao,
          corpo: versao.corpo,
          campos: camposDoModelo(versao.campos),
        });
      }
    }

    // Modelo sem nenhuma versão não aparece: emitir a partir dele falharia no
    // banco, e é melhor não oferecer do que oferecer e recusar.
    return modelos.flatMap((modelo) => {
      const atual = vigente.get(modelo.id);
      if (!atual) return [];

      return [
        {
          id: modelo.id,
          tipo: modelo.tipo,
          nome: modelo.nome,
          descricao: modelo.descricao,
          versao: atual.versao,
          corpo: atual.corpo,
          campos: atual.campos,
        },
      ];
    });
  },
);

// ---------------------------------------------------------------------
// Documentos
// ---------------------------------------------------------------------

export type AssinaturaDoDocumento = {
  nome: string;
  cpf: string | null;
  assinadoEm: Date;
  hashAssinado: string;
  ip: string | null;
  dispositivo: string | null;
  verificacao: string;
  operador: string | null;
  /** `balcao` ou `link` — a força da prova não é a mesma. */
  canal: string;
  provedor: string;
  referenciaExterna: string | null;
  urlComprovante: string | null;
};

export type DocumentoDaLista = {
  id: string;
  tipo: TipoDocumento;
  titulo: string;
  situacao: SituacaoDocumento;
  pacienteId: string;
  paciente: string;
  emitidoEm: Date;
  emitidoPor: string | null;
  exemplo: boolean;
  assinadoEm: Date | null;
};

export type PaginaDeDocumentos = {
  itens: DocumentoDaLista[];
  total: number;
  pagina: number;
  paginas: number;
};

export type DocumentoCompleto = {
  id: string;
  tipo: TipoDocumento;
  titulo: string;
  situacao: SituacaoDocumento;
  pacienteId: string;
  paciente: string;
  /** Só dígitos, como o cadastro guarda. Vira o número do WhatsApp. */
  pacienteTelefone: string | null;
  corpo: string;
  hash: string;
  modeloId: string | null;
  modeloNome: string | null;
  modeloVersao: number | null;
  documentoAnteriorId: string | null;
  motivoCancelamento: string;
  emitidoEm: Date;
  emitidoPor: string | null;
  exemplo: boolean;
  assinatura: AssinaturaDoDocumento | null;
  /** Vazio em tudo que não é anamnese. */
  campos: CampoRespondido[];
};

export const listarDocumentos = cache(
  async (
    opcoes: {
      busca?: string;
      situacao?: SituacaoDocumento | "todas";
      tipo?: TipoDocumento | "todos";
      pagina?: number;
    } = {},
  ): Promise<PaginaDeDocumentos> => {
    const supabase = await clienteServidor();
    const pagina = Math.max(1, Math.trunc(opcoes.pagina ?? 1));
    const termo = termoDeBusca(opcoes.busca ?? "");

    let pacientesEncontradas: string[] = [];

    if (termo) {
      const { data, error } = await supabase
        .from("pacientes")
        .select("id")
        .or(
          [
            `nome.ilike.%${termo}%`,
            `nome_social.ilike.%${termo}%`,
            `email.ilike.%${termo}%`,
            `telefone.ilike.%${termo}%`,
          ].join(","),
        )
        .limit(50);

      if (error) aoFalhar(error, "as pacientes");
      pacientesEncontradas = (data ?? []).map((paciente) => paciente.id);
    }

    // Uma função monta a consulta e aplica os filtros, para que a contagem de
    // socorro (abaixo) conte exatamente o que a lista mostraria.
    const filtrada = (somenteContagem: boolean) => {
      let consulta = supabase
        .from("documentos")
        .select(
          `id, tipo, titulo, situacao, paciente_id, emitido_em, exemplo,
           pacientes ( nome, nome_social ),
           perfis ( nome ),
           documento_assinaturas ( assinado_em )`,
          { count: "exact", head: somenteContagem },
        );

      if (opcoes.situacao && opcoes.situacao !== "todas") {
        consulta = consulta.eq("situacao", opcoes.situacao);
      }

      if (opcoes.tipo && opcoes.tipo !== "todos") {
        consulta = consulta.eq("tipo", opcoes.tipo);
      }

      if (termo) {
        const alvos = [`titulo.ilike.%${termo}%`];
        if (pacientesEncontradas.length > 0) {
          alvos.push(`paciente_id.in.(${pacientesEncontradas.join(",")})`);
        }
        consulta = consulta.or(alvos.join(","));
      }

      return consulta;
    };

    const de = (pagina - 1) * POR_PAGINA_DOCUMENTOS;
    const { data, count, error } = await filtrada(false)
      .order("emitido_em", { ascending: false })
      // Desempate único: documentos emitidos na mesma transação (o seed, uma
      // correção) têm o mesmo `emitido_em` e trocariam de página.
      .order("id", { ascending: false })
      .range(de, de + POR_PAGINA_DOCUMENTOS - 1);

    // Página além da última (link antigo, favorito, lista que encolheu): o
    // PostgREST responde 416 e não manda o total junto. Não é falha — a lista
    // responde vazia, com o total contado de novo, e a tela oferece o caminho
    // de volta em vez da tela de erro.
    if (error && paginaAlemDoFim(error)) {
      const { count: totalReal, error: erroContagem } = await filtrada(true);
      if (erroContagem) aoFalhar(erroContagem, "os documentos");

      const total = totalReal ?? 0;
      return {
        itens: [],
        total,
        pagina,
        paginas: Math.max(1, Math.ceil(total / POR_PAGINA_DOCUMENTOS)),
      };
    }

    if (error) aoFalhar(error, "os documentos");

    const total = count ?? 0;

    return {
      itens: (data ?? []).map((linha) => ({
        id: linha.id,
        tipo: linha.tipo,
        titulo: linha.titulo,
        situacao: linha.situacao,
        pacienteId: linha.paciente_id,
        paciente: linha.pacientes ? nomeExibido(linha.pacientes) : "Paciente",
        emitidoEm: new Date(linha.emitido_em),
        emitidoPor: linha.perfis?.nome ?? null,
        exemplo: linha.exemplo,
        assinadoEm: linha.documento_assinaturas?.assinado_em
          ? new Date(linha.documento_assinaturas.assinado_em)
          : null,
      })),
      total,
      pagina,
      paginas: Math.max(1, Math.ceil(total / POR_PAGINA_DOCUMENTOS)),
    };
  },
);

export const documentoPorId = cache(
  async (id: string): Promise<DocumentoCompleto | null> => {
    if (!uuidValido(id)) return null;
    const supabase = await clienteServidor();

    const { data, error } = await supabase
      .from("documentos")
      .select(
        `id, tipo, titulo, situacao, paciente_id, corpo_congelado, corpo_hash,
         modelo_id, modelo_versao, documento_anterior_id, motivo_cancelamento,
         emitido_em, exemplo,
         pacientes ( nome, nome_social, telefone ),
         perfis ( nome ),
         modelos_documento ( nome ),
         documento_assinaturas (
           nome_informado, cpf_informado, assinado_em, hash_assinado, ip,
           dispositivo, verificacao_identidade, canal, provedor,
           referencia_externa, url_comprovante, perfis ( nome )
         )`,
      )
      .eq("id", id)
      .maybeSingle();

    if (error) aoFalhar(error, "o documento");
    if (!data) return null;

    const assinatura = data.documento_assinaturas;

    // As respostas vêm em consulta separada: `documento_campos` pode ter
    // dezenas de linhas e embutir isso na consulta principal faria o
    // PostgREST montar o documento inteiro de novo para cada pergunta.
    const { data: campos, error: erroCampos } = await supabase
      .from("documento_campos")
      .select("chave, rotulo, tipo, obrigatorio, ajuda, opcoes, resposta, respostas")
      .eq("documento_id", id)
      .order("ordem", { ascending: true });

    if (erroCampos) aoFalhar(erroCampos, "as perguntas do documento");

    return {
      id: data.id,
      tipo: data.tipo,
      titulo: data.titulo,
      situacao: data.situacao,
      pacienteId: data.paciente_id,
      paciente: data.pacientes ? nomeExibido(data.pacientes) : "Paciente",
      pacienteTelefone: data.pacientes?.telefone ?? null,
      corpo: data.corpo_congelado,
      hash: data.corpo_hash,
      modeloId: data.modelo_id,
      modeloNome: data.modelos_documento?.nome ?? null,
      modeloVersao: data.modelo_versao,
      documentoAnteriorId: data.documento_anterior_id,
      motivoCancelamento: data.motivo_cancelamento,
      emitidoEm: new Date(data.emitido_em),
      emitidoPor: data.perfis?.nome ?? null,
      exemplo: data.exemplo,
      assinatura: assinatura
        ? {
            nome: assinatura.nome_informado,
            cpf: assinatura.cpf_informado,
            assinadoEm: new Date(assinatura.assinado_em),
            hashAssinado: assinatura.hash_assinado,
            // O gerador não conhece `inet` e tipa como `unknown`. No JSON do
            // PostgREST vem string; a guarda registra isso em vez de fingir
            // com um cast.
            ip: typeof assinatura.ip === "string" ? assinatura.ip : null,
            dispositivo: assinatura.dispositivo,
            verificacao: assinatura.verificacao_identidade,
            operador: assinatura.perfis?.nome ?? null,
            canal: assinatura.canal,
            provedor: assinatura.provedor,
            referenciaExterna: assinatura.referencia_externa,
            urlComprovante: assinatura.url_comprovante,
          }
        : null,
      campos: (campos ?? []).map((campo) => ({
        chave: campo.chave,
        rotulo: campo.rotulo,
        tipo: campo.tipo as TipoCampo,
        obrigatorio: campo.obrigatorio,
        ajuda: campo.ajuda,
        opcoes: listaDeTextos(campo.opcoes),
        resposta: campo.resposta,
        respostas: campo.respostas,
      })),
    };
  },
);

// ---------------------------------------------------------------------
// Links de assinatura
// ---------------------------------------------------------------------

export type LinkDeAssinatura = {
  id: string;
  criadoEm: Date;
  criadoPor: string | null;
  expiraEm: Date;
  revogadoEm: Date | null;
  canalEnvio: string;
  abertoEm: Date | null;
  aberturas: number;
  tentativas: number;
  /** Vivo: não revogado e dentro da validade. */
  ativo: boolean;
  /** Fechado por tentativas erradas de data de nascimento. */
  bloqueado: boolean;
};

/**
 * O histórico de links de um documento, do mais novo para o mais velho.
 *
 * O token não aparece — o banco guarda só o hash dele. Um link já enviado
 * não pode ser reexibido: se a clínica perdeu o endereço, gera outro, e o
 * anterior é revogado na mesma transação.
 */
export const linksDoDocumento = cache(
  async (documentoId: string): Promise<LinkDeAssinatura[]> => {
    if (!uuidValido(documentoId)) return [];
    const supabase = await clienteServidor();

    const { data, error } = await supabase
      .from("documento_links")
      .select(
        `id, criado_em, expira_em, revogado_em, canal_envio, aberto_em,
         aberturas, tentativas, perfis ( nome )`,
      )
      .eq("documento_id", documentoId)
      .order("criado_em", { ascending: false });

    // A 0014 pode não estar aplicada. O documento continua utilizável pelo
    // balcão; o que falta é o envio à distância.
    if (error) {
      if (estruturaPendente(error)) return [];
      aoFalhar(error, "os links de assinatura");
    }

    const agora = Date.now();

    return (data ?? []).map((linha) => {
      const expiraEm = new Date(linha.expira_em);
      const revogadoEm = linha.revogado_em ? new Date(linha.revogado_em) : null;

      return {
        id: linha.id,
        criadoEm: new Date(linha.criado_em),
        criadoPor: linha.perfis?.nome ?? null,
        expiraEm,
        revogadoEm,
        canalEnvio: linha.canal_envio,
        abertoEm: linha.aberto_em ? new Date(linha.aberto_em) : null,
        aberturas: linha.aberturas,
        tentativas: linha.tentativas,
        ativo: !revogadoEm && expiraEm.getTime() > agora,
        bloqueado: linha.tentativas >= 10,
      };
    });
  },
);

/**
 * O link público serve? Só a situação e o tipo — nada do conteúdo antes da
 * data de nascimento (0014).
 *
 * Falha de infraestrutura volta como `falhou`, e não como "link inválido": a
 * paciente precisa saber que pode tentar de novo.
 */
export async function estadoDoLinkPublico(
  token: string,
): Promise<{ situacao: string; tipo: string | null }> {
  if (!tokenPlausivel(token)) return { situacao: "nao_encontrado", tipo: null };

  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("documento_link_estado", { p_token: token });

  if (error) {
    registrarFalha("consulta documentos: estado do link", error);
    return { situacao: "falhou", tipo: null };
  }

  const linha = Array.isArray(data) ? data[0] : null;
  return { situacao: linha?.situacao ?? "nao_encontrado", tipo: linha?.tipo ?? null };
}
