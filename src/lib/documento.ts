/**
 * Regras de documento e modelo, válidas no formulário e no servidor.
 *
 * O que está aqui não é a validação que protege o banco — essa mora nas
 * funções da migração 0013, que recusam texto vazio, motivo curto e CPF
 * malformado mesmo que ninguém passe por esta tela. O que está aqui existe
 * para responder rápido a quem digita, com as mesmas fronteiras.
 */

export type TipoDocumento = "contrato" | "termo" | "orientacao" | "anamnese";

export type SituacaoDocumento =
  | "emitido"
  | "assinado"
  | "cancelado"
  | "substituido";

/**
 * Os quatro tipos estão em uso desde a 0017, que trouxe a anamnese com campos
 * de formulário. Contrato, termo e orientação se assinam; anamnese se
 * preenche e se corrige.
 */
export const TIPOS_EM_USO: TipoDocumento[] = [
  "contrato",
  "termo",
  "orientacao",
  "anamnese",
];

/** Anamnese não tem passo de confirmação — ela é conteúdo que evolui. */
export function seAssina(tipo: TipoDocumento): boolean {
  return tipo !== "anamnese";
}

export function rotuloDaSituacao(
  situacao: SituacaoDocumento,
  tipo: TipoDocumento,
): string {
  if (tipo === "anamnese" && situacao === "emitido") return "Em preenchimento";
  return ROTULO_SITUACAO[situacao];
}

export const ROTULO_TIPO: Record<TipoDocumento, string> = {
  contrato: "Contrato",
  termo: "Termo de consentimento",
  orientacao: "Orientação",
  anamnese: "Anamnese",
};

/**
 * Para anamnese use `rotuloDaSituacao`: "aguardando assinatura" seria mentira
 * num documento que não se assina.
 */
export const ROTULO_SITUACAO: Record<SituacaoDocumento, string> = {
  emitido: "Aguardando assinatura",
  assinado: "Assinado",
  cancelado: "Cancelado",
  substituido: "Substituído",
};

/**
 * O tom de cada situação, na convenção do projeto: vermelho é o que deu
 * errado, laranja é o que falta fazer. Documento aguardando assinatura não é
 * erro — é tarefa. Cancelado também não é erro do sistema, e por isso fica em
 * neutro, não em vermelho.
 */
export const TOM_SITUACAO: Record<
  SituacaoDocumento,
  "positivo" | "atencao" | "neutro"
> = {
  emitido: "atencao",
  assinado: "positivo",
  cancelado: "neutro",
  substituido: "neutro",
};

export const LIMITE = {
  nome: 160,
  descricao: 400,
  titulo: 160,
  corpo: 100000,
  motivo: 240,
  verificacao: 240,
  cancelamento: 400,
} as const;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function uuidValido(valor: string): boolean {
  return UUID.test(valor);
}

export function tipoValido(valor: string): valor is TipoDocumento {
  return (TIPOS_EM_USO as string[]).includes(valor);
}

// ---------------------------------------------------------------------
// Modelo
// ---------------------------------------------------------------------

export type ValoresModelo = {
  tipo: string;
  nome: string;
  descricao: string;
  corpo: string;
  motivo: string;
};

export type ErrosModelo = Partial<Record<keyof ValoresModelo | "geral", string>>;

export const MODELO_EM_BRANCO: ValoresModelo = {
  tipo: "contrato",
  nome: "",
  descricao: "",
  corpo: "",
  motivo: "",
};

export function normalizarModelo(valores: ValoresModelo): ValoresModelo {
  return {
    tipo: valores.tipo.trim(),
    nome: valores.nome.trim().slice(0, LIMITE.nome),
    descricao: valores.descricao.trim().slice(0, LIMITE.descricao),
    // O corpo NÃO passa por normalização de espaço: é texto de contrato, e
    // parágrafo, recuo e linha em branco fazem parte do que a paciente lê.
    corpo: valores.corpo.slice(0, LIMITE.corpo),
    motivo: valores.motivo.trim().slice(0, LIMITE.motivo),
  };
}

export function validarModelo(
  valores: ValoresModelo,
  opcoes: { exigirMotivo?: boolean } = {},
): ErrosModelo {
  const erros: ErrosModelo = {};

  if (!tipoValido(valores.tipo)) {
    erros.tipo = "Escolha o tipo do modelo.";
  }

  if (valores.nome.length < 3) {
    erros.nome = "Informe um nome com pelo menos 3 caracteres.";
  }

  if (valores.corpo.trim().length === 0) {
    erros.corpo = "Escreva o texto do modelo.";
  }

  if (opcoes.exigirMotivo && valores.motivo.length < 3) {
    erros.motivo = "Informe o motivo da nova versão.";
  }

  return erros;
}

// ---------------------------------------------------------------------
// Assinatura
// ---------------------------------------------------------------------

export type ValoresAssinatura = {
  nome: string;
  cpf: string;
  verificacao: string;
};

export type ErrosAssinatura = Partial<
  Record<keyof ValoresAssinatura | "geral" | "confirmacao", string>
>;

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function normalizarAssinatura(
  valores: ValoresAssinatura,
): ValoresAssinatura {
  return {
    nome: valores.nome.trim().replace(/\s+/g, " ").slice(0, LIMITE.nome),
    cpf: somenteDigitos(valores.cpf).slice(0, 11),
    verificacao: valores.verificacao.trim().slice(0, LIMITE.verificacao),
  };
}

export function validarAssinatura(valores: ValoresAssinatura): ErrosAssinatura {
  const erros: ErrosAssinatura = {};

  if (valores.nome.length < 3) {
    erros.nome = "Informe o nome completo de quem está assinando.";
  }

  // CPF é opcional — nem toda paciente traz documento, e a assinatura vale
  // pelo conjunto de evidências. Informado, precisa estar completo.
  if (valores.cpf && valores.cpf.length !== 11) {
    erros.cpf = "CPF incompleto. Deixe em branco ou informe os 11 dígitos.";
  }

  if (valores.verificacao.length < 3) {
    erros.verificacao = "Registre como a identidade foi conferida.";
  }

  return erros;
}

/**
 * As formas de conferência que a recepção costuma usar. É uma lista de
 * sugestões, não um enum: a caixa aceita texto livre, porque a realidade do
 * balcão inventa casos que nenhuma lista prevê.
 */
export const VERIFICACOES_SUGERIDAS = [
  "Documento com foto conferido presencialmente",
  "Paciente conhecida da clínica, reconhecida pela recepção",
  "CNH apresentada presencialmente",
  "RG apresentado presencialmente",
];

/**
 * O hash é longo demais para caber na tela inteira e curto demais para ser
 * resumido sem perder utilidade. Oito na frente e oito atrás é o suficiente
 * para conferir de olho contra outro registro.
 */
export function hashCurto(hash: string): string {
  if (hash.length <= 20) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}

// ---------------------------------------------------------------------
// Envio pelo WhatsApp
// ---------------------------------------------------------------------

/**
 * Número no formato que o `wa.me` espera: só dígitos, com código do país.
 *
 * O cadastro guarda 10 ou 11 dígitos (DDD + número), sem o 55. Número com
 * outro tamanho não é telefone brasileiro válido e devolve `null` — melhor
 * não oferecer o botão do que abrir o WhatsApp numa conversa errada.
 */
export function numeroWhatsapp(telefone: string | null): string | null {
  if (!telefone) return null;

  const digitos = somenteDigitos(telefone);
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;

  // Já veio com código do país.
  if (digitos.length === 12 || digitos.length === 13) {
    return digitos.startsWith("55") ? digitos : null;
  }

  return null;
}

/**
 * A conversa já aberta, com a mensagem escrita.
 *
 * `wa.me` é o endereço oficial de atalho do WhatsApp: no celular abre o
 * aplicativo, no computador abre o WhatsApp Web. Quem envia confere e aperta
 * enviar — o sistema não manda mensagem em nome de ninguém.
 */
export function enderecoWhatsapp(numero: string, mensagem: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

export function mensagemDoConvite(entrada: {
  primeiroNome: string;
  clinica: string;
  tipo: TipoDocumento;
  endereco: string;
  validade: string;
}): string {
  const artigo = entrada.tipo === "orientacao" || entrada.tipo === "anamnese" ? "a" : "o";
  const nome = ROTULO_TIPO[entrada.tipo].toLowerCase();
  const verbo = seAssina(entrada.tipo) ? "ler e assinar" : "preencher";

  // Template literal com quebras de verdade: a mensagem é lida por gente, no
  // WhatsApp, e os parágrafos precisam chegar como parágrafos.
  return `Olá, ${entrada.primeiroNome}! Aqui é ${entrada.clinica}.

Segue ${artigo} ${nome} para você ${verbo}:
${entrada.endereco}

Para abrir, vamos pedir sua data de nascimento — é só para garantir que ninguém além de você acesse o documento.

O link vale até ${entrada.validade}.`;
}

// ---------------------------------------------------------------------
// Campos da anamnese
// ---------------------------------------------------------------------

export type TipoCampo =
  | "texto"
  | "texto_longo"
  | "sim_nao"
  | "escolha_unica"
  | "escolha_multipla"
  | "data"
  | "numero";

export const TIPOS_CAMPO: TipoCampo[] = [
  "texto",
  "texto_longo",
  "sim_nao",
  "escolha_unica",
  "escolha_multipla",
  "data",
  "numero",
];

export const ROTULO_TIPO_CAMPO: Record<TipoCampo, string> = {
  texto: "Texto curto",
  texto_longo: "Texto longo",
  sim_nao: "Sim ou não",
  escolha_unica: "Escolha uma opção",
  escolha_multipla: "Escolha várias opções",
  data: "Data",
  numero: "Número",
};

export function precisaDeOpcoes(tipo: TipoCampo): boolean {
  return tipo === "escolha_unica" || tipo === "escolha_multipla";
}

/** A pergunta, como o modelo a define. */
export type CampoDoModelo = {
  chave: string;
  rotulo: string;
  tipo: TipoCampo;
  obrigatorio: boolean;
  ajuda: string;
  opcoes: string[];
};

/** A pergunta congelada no documento, com o que já foi respondido. */
export type CampoRespondido = CampoDoModelo & {
  resposta: string | null;
  respostas: string[] | null;
};

/**
 * Identificador estável da pergunta.
 *
 * É por ele que a resposta encontra a pergunta — não pela posição. Reordenar
 * o formulário não pode trocar as respostas de lugar.
 */
export function novaChaveDeCampo(): string {
  return `c${crypto.randomUUID().slice(0, 8)}`;
}

export function campoEmBranco(): CampoDoModelo {
  return {
    chave: novaChaveDeCampo(),
    rotulo: "",
    tipo: "texto",
    obrigatorio: false,
    ajuda: "",
    opcoes: [],
  };
}

/**
 * As mesmas regras que `private.campos_validos` aplica no banco. Aqui elas
 * existem para responder rápido a quem monta o formulário; lá, para valer.
 */
export function validarCampos(campos: CampoDoModelo[]): string | null {
  if (campos.length > 120) return "No máximo 120 perguntas por formulário.";

  const chaves = new Set<string>();

  for (const [indice, campo] of campos.entries()) {
    const posicao = indice + 1;

    if (!campo.rotulo.trim()) return `A pergunta ${posicao} está sem enunciado.`;
    if (campo.rotulo.length > 300) return `O enunciado da pergunta ${posicao} é longo demais.`;
    if (chaves.has(campo.chave)) return `A pergunta ${posicao} está duplicada.`;
    chaves.add(campo.chave);

    if (precisaDeOpcoes(campo.tipo)) {
      const validas = campo.opcoes.map((o) => o.trim()).filter(Boolean);
      if (validas.length < 1) {
        return `A pergunta ${posicao} é de escolha e não tem alternativa nenhuma.`;
      }
      if (new Set(validas).size !== validas.length) {
        return `A pergunta ${posicao} tem alternativas repetidas.`;
      }
    }
  }

  return null;
}

export function normalizarCampos(campos: CampoDoModelo[]): CampoDoModelo[] {
  return campos.map((campo) => ({
    chave: campo.chave,
    rotulo: campo.rotulo.trim().slice(0, 300),
    tipo: campo.tipo,
    obrigatorio: campo.obrigatorio,
    ajuda: campo.ajuda.trim().slice(0, 300),
    opcoes: precisaDeOpcoes(campo.tipo)
      ? [...new Set(campo.opcoes.map((o) => o.trim()).filter(Boolean))].slice(0, 40)
      : [],
  }));
}

/** Respondida em branco não existe: ou tem valor, ou não foi respondida. */
export function semResposta(campo: CampoRespondido): boolean {
  if (campo.tipo === "escolha_multipla") {
    return !campo.respostas || campo.respostas.length === 0;
  }
  return campo.resposta === null || campo.resposta.trim() === "";
}

export function obrigatoriasPendentes(campos: CampoRespondido[]): number {
  return campos.filter((campo) => campo.obrigatorio && semResposta(campo)).length;
}

export function respondidas(campos: CampoRespondido[]): number {
  return campos.filter((campo) => !semResposta(campo)).length;
}

/**
 * Situação da anamnese, derivada das respostas.
 *
 * Não é gravada de propósito: estado gravado envelhece, e "respondida" só
 * quer dizer alguma coisa em relação às perguntas que existem agora.
 */
export function situacaoDaAnamnese(
  campos: CampoRespondido[],
): "vazia" | "parcial" | "completa" {
  if (campos.length === 0) return "vazia";
  const feitas = respondidas(campos);
  if (feitas === 0) return "vazia";
  return obrigatoriasPendentes(campos) === 0 ? "completa" : "parcial";
}

export const ROTULO_ANAMNESE = {
  vazia: "Sem respostas",
  parcial: "Respondida em parte",
  completa: "Respondida",
} as const;

/** O que o banco recusaria, dito em português antes de tentar. */
export function validarResposta(
  campo: CampoDoModelo,
  valor: string,
): string | null {
  const texto = valor.trim();
  if (!texto) return null;

  if (campo.tipo === "data" && !/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return "Data inválida.";
  }

  if (campo.tipo === "numero" && !/^-?[0-9]+([.,][0-9]{1,4})?$/.test(texto)) {
    return "Informe um número.";
  }

  if (campo.tipo === "escolha_unica" && !campo.opcoes.includes(texto)) {
    return "Escolha uma das alternativas.";
  }

  if ((campo.tipo === "texto" || campo.tipo === "texto_longo") && texto.length > 4000) {
    return "Resposta longa demais.";
  }

  return null;
}
