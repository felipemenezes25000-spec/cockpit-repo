import "server-only";

import {
  erroParaRegistro,
  idDeCorrelacao,
  mensagemDoBanco,
  type ErroDoBanco,
} from "./erros-banco";

/**
 * Uma linha de log estruturada: um evento, um objeto JSON, uma linha.
 *
 * É o formato que o log drain da Vercel (e qualquer coletor atrás dele)
 * indexa sem expressão regular: cada chave vira campo filtrável. A ordem das
 * chaves é fixa para a linha também ser legível a olho em Logs da função.
 *
 * Nada aqui carrega dado de paciente: `contexto` é escrito por nós e passa
 * por `contextoDoRegistro`; `mensagem` já chega sanitizada por
 * `erroParaRegistro`; o resto é código, id aleatório, hora e ambiente.
 */
export type EventoDeRegistro = {
  /** Hora do evento, ISO 8601 em UTC (o coletor converte para o fuso de quem lê). */
  instante: string;
  nivel: "erro";
  /** Sempre "cockpit": separa estas linhas do ruído do Next no mesmo drain. */
  app: "cockpit";
  /** `VERCEL_ENV` (production, preview, development) ou, fora da Vercel, `NODE_ENV`. */
  ambiente: string;
  /** Onde aconteceu, no formato "módulo: operação". */
  contexto: string;
  /** SQLSTATE, código do PostgREST ou do serviço; "" quando não há. */
  codigo: string;
  mensagem: string;
  /** Id de correlação: liga a linha à frase que a pessoa viu. */
  id: string;
};

/**
 * Registro técnico de falha, só no servidor.
 *
 * A tela recebe a frase de `erros-banco.ts`; quem opera o sistema precisa do
 * resto — o código do Postgres e onde aconteceu — para investigar. O que vai
 * para o log é a versão sanitizada: nunca `details`, nunca valor digitado,
 * nunca conteúdo de prontuário, anamnese, documento ou token. Sai como UMA
 * linha JSON (`EventoDeRegistro`) em `console.error` — na Vercel, stderr da
 * função, que é o que Logs mostra e o log drain encaminha.
 *
 * Devolve o id de correlação da linha registrada (ou `null` quando nada foi
 * registrado), para quem quiser mostrá-lo junto da frase de falha.
 */
export function registrarFalha(contexto: string, erro: ErroDoBanco): string | null {
  // Recusa de regra de negócio (`raise exception` nosso) não é falha
  // técnica: é o banco dizendo "não pode", com frase para a tela. Logar cada
  // uma afogaria as falhas de verdade.
  if (!erro || erro.code === "P0001") return null;
  const { codigo, mensagem } = erroParaRegistro(erro);
  // O id liga a linha do log à frase que a pessoa viu, se a ação quiser
  // anexá-lo ("código X"). Não dá para usar o `x-id-requisicao` aqui:
  // `headers()` é assíncrono no Next 15 e esta função é síncrona.
  const id = idDeCorrelacao();
  emitir({
    instante: new Date().toISOString(),
    nivel: "erro",
    app: "cockpit",
    ambiente: ambienteDoRegistro(),
    contexto: contextoDoRegistro(contexto),
    codigo,
    mensagem,
    id,
  });
  return id;
}

/**
 * O único `console.*` do código da aplicação. Todo registro passa por aqui,
 * para o formato não se fragmentar — um teste garante que não há outro.
 */
function emitir(evento: EventoDeRegistro): void {
  console.error(JSON.stringify(evento));
}

/**
 * Onde a linha nasceu. A Vercel define `VERCEL_ENV`; localmente e nos testes
 * vale o `NODE_ENV`. Só letras, números e hífen: é um rótulo, não texto livre.
 */
function ambienteDoRegistro(): string {
  const bruto = process.env.VERCEL_ENV || process.env.NODE_ENV || "desconhecido";
  return bruto.replace(/[^\w-]/g, "").slice(0, 20) || "desconhecido";
}

/**
 * O contexto é escrito por nós e leva, de propósito, ids e caminhos — é com
 * eles que se acha a foto órfã ou a linha sem arquivo (`fotos: …`). Por isso
 * não passa inteiro pelo `sanitizarParaRegistro`, que trocaria um uuid por
 * "[token]" e o número de uma linha importada por "[número]". Sai o que
 * quebraria a linha do log (controle e quebra de linha) e o que nunca tem
 * por que estar num contexto, mesmo por descuido de quem o escreveu:
 * e-mail, CPF, JWT, cabeçalho de autorização e segredo longo sem hífen (um
 * uuid tem hífen a cada 12 caracteres no máximo, então continua inteiro).
 */
function contextoDoRegistro(contexto: string): string {
  return contexto
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\beyJ[\w-]*\.[\w-]*\.[\w-]*/g, "[token]")
    .replace(/\bBearer\s+\S+/gi, "Bearer [token]")
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "[e-mail]")
    .replace(/\b\w{32,}\b/g, "[token]")
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[cpf]")
    .replace(/\s{2,}/g, " ")
    .slice(0, 300)
    .trim();
}

/**
 * Consulta que falhou: registra e lança um erro com frase segura.
 *
 * Quem pega é o `error.tsx` da rota, que mostra a frase e oferece tentar de
 * novo. Em produção o Next esconde a mensagem de qualquer forma; aqui ela já
 * nasce sem nada do Postgres, para o ambiente de desenvolvimento e os logs
 * não mostrarem mais do que deveriam.
 */
export function falhaDeConsulta(contexto: string, erro: ErroDoBanco, frase: string): never {
  registrarFalha(contexto, erro);
  throw new Error(mensagemDoBanco(erro, frase));
}
