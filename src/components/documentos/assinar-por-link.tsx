"use client";

import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  Check,
  CircleAlert,
  Clock3,
  Fingerprint,
  LoaderCircle,
  Lock,
  MailCheck,
  MapPin,
  PenLine,
  Printer,
  QrCode,
  RotateCw,
  ShieldCheck,
  Smartphone,
  Stamp,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Campo, ENTRADA, ENTRADA_ERRO } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { aparelhoLegivel, rotuloDoFator } from "@/lib/assinatura/evidencia";
import {
  hashCurto,
  ROTULO_TIPO,
  seAssina,
  type TipoDocumento,
} from "@/lib/documento";
import { FormularioAnamnese } from "./formulario-anamnese";
import { QuadroDeRubrica } from "./quadro-de-rubrica";
import { RubricaDesenhada } from "./rubrica-desenhada";
import { MarcaDaClinica } from "@/components/ui/marca-da-clinica";
import { CLINICA } from "@/lib/nav";
import {
  abrirDocumentoParaAssinatura,
  assinarPorLink,
  carimboDaVia,
  enviarCodigoDeVerificacao,
  type DocumentoParaAssinar,
  type EstadoAssinaturaLink,
} from "@/server/acoes/assinatura-link";

/** Situações em que ainda há o que fazer nesta página. */
const ABERTAS = ["ok", "ja_assinado"];

/**
 * Falha de rede ou do servidor. Não é recusa do link — a pessoa pode tentar
 * de novo, e a tela diz isso em vez de afirmar que o link é inválido.
 */
const FALHA_DE_CONEXAO =
  "Não foi possível falar com a clínica agora. Confira sua internet e tente de novo.";

/**
 * Explica cada recusa sem ensinar nada a quem não deveria estar ali.
 *
 * "Data incorreta" é a única que diz o que houve depois da data, porque quem
 * errou a própria data precisa saber para corrigir. Inexistente, cancelado,
 * vencido e bloqueado têm respostas distintas de propósito (AGENTS.md §8.7):
 * isso só revela que um token existe a quem já o tem, e 256 bits não se
 * adivinham. Nenhuma delas diz de quem é o documento nem o que ele contém.
 */
const RECUSA: Record<string, { titulo: string; texto: string }> = {
  nao_encontrado: {
    titulo: "Link inválido",
    texto:
      "Este endereço não corresponde a nenhum documento. Confira se copiou o link inteiro, ou peça um novo à clínica.",
  },
  revogado: {
    titulo: "Link cancelado",
    texto: "A clínica cancelou este link. Peça um novo para acessar o documento.",
  },
  expirado: {
    titulo: "Link vencido",
    texto:
      "O prazo deste link terminou. Peça à clínica uma nova via do documento.",
  },
  bloqueado: {
    titulo: "Link bloqueado",
    texto:
      "Houve tentativas demais com data de nascimento ou código errados, e o link foi fechado por segurança. Peça um novo à clínica.",
  },
  indisponivel: {
    titulo: "Documento indisponível",
    texto: "Este documento não está mais disponível.",
  },
  // Só chega aqui se a via não pôde ser mostrada; o caminho normal de
  // `ja_assinado` é a própria via. Pedir "um novo link" seria errado duas
  // vezes: o link vale, e a clínica nem consegue gerar outro para documento
  // assinado.
  ja_assinado: {
    titulo: "Documento já assinado",
    texto:
      "Este documento já está assinado. Recarregue a página e confirme sua data de nascimento para ver e salvar a sua via.",
  },
  data_incorreta: {
    titulo: "Data de nascimento não confere",
    texto:
      "A data de nascimento não confere mais com o cadastro da clínica. Recarregue a página e confirme a data de novo.",
  },
  falhou: {
    titulo: "Não foi possível abrir agora",
    texto:
      // A página chegou, então a internet da paciente funciona: quem não
      // respondeu foi a clínica. E a situação do link é desconhecida — não dá
      // para prometer que ele continua valendo.
      "A clínica não respondeu agora. Recarregue a página em instantes; se continuar assim, ligue para a clínica.",
  },
};

/** Recusas que encerram a página (o link não serve mais). */
const FINAIS = ["nao_encontrado", "revogado", "expirado", "bloqueado", "indisponivel"];

function Recusa({ situacao }: { situacao: string }) {
  const aviso = RECUSA[situacao] ?? RECUSA.nao_encontrado;

  return (
    <div className="relative isolate overflow-hidden rounded-[calc(var(--radius-painel)+2px)] border border-card-border bg-[linear-gradient(155deg,#ffffff_0%,#f8fbff_58%,#eef6ff_100%)] px-5 py-9 text-center shadow-[0_26px_70px_-48px_rgba(8,52,99,.55)] sm:px-10 sm:py-11">
      <span aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 size-64 -translate-x-1/2 rounded-full bg-primary-fixed/55 blur-3xl" />
      <span className="relative mx-auto mb-5 flex size-14 items-center justify-center rounded-[var(--radius-painel)] border border-card-border bg-surface text-outline shadow-[0_16px_34px_-26px_rgba(8,41,76,.45)]">
        <CircleAlert aria-hidden="true" size={24} strokeWidth={1.6} />
      </span>
      <p className="rotulo relative text-primary">Acesso ao documento</p>
      <h1 className="t-headline relative mt-2 break-words text-on-surface">{aviso.titulo}</h1>
      <p className="relative mx-auto mt-2 max-w-lg break-words text-sm leading-6 text-on-surface-variant">{aviso.texto}</p>
    </div>
  );
}

function Linha({ rotulo, valor, icone: Icone }: { rotulo: string; valor: React.ReactNode; icone?: typeof Clock3 }) {
  return (
    <div className="grid min-w-0 gap-1 border-t border-card-border py-2.5 first:border-t-0 first:pt-0 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-4">
      <span className="flex items-center gap-1.5 text-[0.68rem] font-semibold tracking-[0.055em] text-outline uppercase">
        {Icone ? <Icone aria-hidden="true" size={12} strokeWidth={1.9} className="shrink-0" /> : null}
        {rotulo}
      </span>
      <span className="min-w-0 break-words text-sm text-on-surface">{valor}</span>
    </div>
  );
}

function Alerta({ children, tom = "negativo" }: { children: React.ReactNode; tom?: "negativo" | "atencao" | "positivo" }) {
  return (
    <p
      role={tom === "positivo" ? "status" : "alert"}
      className={cn(
        "flex max-w-xl items-start gap-2 rounded-[var(--radius-cartao)] border px-3.5 py-2.5 text-sm leading-5",
        tom === "negativo" && "border-negativo-borda bg-negativo-fundo text-negativo",
        tom === "atencao" && "border-atencao-borda bg-atencao-fundo text-atencao",
        tom === "positivo" && "border-positivo-borda bg-positivo-fundo text-positivo",
      )}
    >
      {tom === "positivo" ? (
        <MailCheck aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
      ) : (
        <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
      )}
      <span className="min-w-0 break-words">{children}</span>
    </p>
  );
}

const BOTAO_PRIMARIO =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-controle)] border border-primary-container bg-primary-container px-6 text-sm font-semibold text-on-primary shadow-[0_14px_28px_-18px_rgba(10,110,209,.7)] transition-[transform,background-color,box-shadow] duration-180 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-[0_18px_34px_-18px_rgba(8,60,115,.72)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 sm:w-auto";

const BOTAO_SECUNDARIO =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-controle)] border border-primary-fixed-dim bg-surface px-5 text-sm font-semibold text-primary transition-[transform,background-color] duration-180 hover:bg-selecao disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto";

/**
 * A forma impressa na via. O link também serve para a paciente guardar a cópia
 * do que assinou no balcão; dizer "à distância" ali seria falso. O canal vem
 * do banco (`documento_para_assinatura`, 0027) — sem ele, a via não afirma
 * por onde foi.
 */
export function formaDaAssinatura(canal: string | null): string {
  if (canal === "balcao") {
    return "Assinatura eletrônica simples, presencial, na clínica (Lei 14.063/2020)";
  }
  if (canal === "link") {
    return "Assinatura eletrônica simples, à distância (Lei 14.063/2020)";
  }
  return "Assinatura eletrônica simples (Lei 14.063/2020)";
}

function dataHora(valor: string | null, segundos = false): string | null {
  if (!valor) return null;
  return new Date(valor).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(segundos ? { second: "2-digit" } : {}),
  });
}

// ---------------------------------------------------------------------
// Etapas
// ---------------------------------------------------------------------

type Etapa = "identidade" | "codigo" | "leitura" | "assinatura" | "via";

function Etapas({ atual, comCodigo, anamnese }: { atual: Etapa; comCodigo: boolean; anamnese: boolean }) {
  const etapas: { chave: Etapa; rotulo: string }[] = [
    { chave: "identidade", rotulo: "Identidade" },
    ...(comCodigo ? [{ chave: "codigo" as const, rotulo: "Código" }] : []),
    { chave: "leitura", rotulo: anamnese ? "Preencher" : "Leitura" },
    ...(anamnese
      ? []
      : [
          { chave: "assinatura" as const, rotulo: "Assinatura" },
          { chave: "via" as const, rotulo: "Sua via" },
        ]),
  ];
  const indice = Math.max(0, etapas.findIndex((etapa) => etapa.chave === atual));

  return (
    <nav aria-label="Etapas" className="sem-impressao">
      <ol
        className="grid gap-1.5 sm:gap-2.5"
        style={{ gridTemplateColumns: `repeat(${etapas.length}, minmax(0, 1fr))` }}
      >
        {etapas.map((etapa, i) => {
          const feita = i < indice;
          const agora = i === indice;
          return (
            <li key={etapa.chave} aria-current={agora ? "step" : undefined} className="min-w-0">
              <span
                aria-hidden="true"
                className={cn(
                  "block h-1.5 rounded-full transition-colors duration-300",
                  feita ? "bg-positivo" : agora ? "bg-primary-container" : "bg-surface-container-high",
                )}
              />
              <span
                className={cn(
                  "mt-1.5 flex min-w-0 items-center gap-1 text-[0.68rem] leading-4 font-semibold sm:text-xs",
                  feita ? "text-positivo" : agora ? "text-primary" : "text-outline",
                )}
              >
                {feita ? <Check aria-hidden="true" size={12} strokeWidth={2.4} className="shrink-0" /> : <span aria-hidden="true" className="hidden tabular sm:inline">{i + 1}.</span>}
                <span className="truncate">{etapa.rotulo}</span>
                {feita ? <span className="sr-only"> (concluída)</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ---------------------------------------------------------------------
// A via
// ---------------------------------------------------------------------

/**
 * O que a via diz no topo quando se chega a ela assinando. `registrada`: a
 * assinatura desta página foi gravada. `ja_estava`: o banco respondeu
 * `ja_assinado` — outra aba, outro aparelho ou o balcão assinou antes. Em
 * nenhum dos dois há o que refazer, e a via é a mesma.
 */
type AvisoDaVia = "registrada" | "ja_estava" | null;

const AVISO_DA_VIA = {
  registrada: {
    titulo: "Assinatura registrada",
    texto:
      "Guarde a sua via: use o botão abaixo para salvar em PDF ou imprimir. O código e o QR da via permitem a qualquer pessoa conferir que ela é autêntica.",
  },
  ja_estava: {
    titulo: "Este documento já estava assinado",
    texto:
      "A assinatura já tinha sido registrada antes — em outra aba, em outro aparelho ou na clínica. Não é preciso assinar de novo: guarde a sua via com o botão abaixo.",
  },
} as const;

/**
 * A via da paciente: o documento assinado, pronto para salvar.
 *
 * O botão usa a impressão do navegador em vez de uma biblioteca de PDF. Não é
 * economia de esforço — é o caminho que funciona em todo aparelho, com o
 * "Salvar como PDF" que a pessoa já conhece, sem o sistema passar a manter
 * paginação de contrato longo.
 *
 * As classes `folha`, `folha-texto` e `sem-impressao` são lidas pelo bloco
 * `@media print` do `globals.css`.
 */
function ViaAssinada({
  documento,
  aviso,
}: {
  documento: DocumentoParaAssinar;
  aviso: AvisoDaVia;
}) {
  const [carimbo, setCarimbo] = useState({
    em: documento.carimboEm,
    autoridade: documento.carimboAutoridade,
  });

  // Assinar desmonta o formulário e leva junto o botão que tinha o foco: sem
  // isto, o foco caía no <body> e o leitor de tela não dizia que a
  // assinatura foi registrada. O aviso recebe o foco e é lido inteiro.
  const refAviso = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (aviso) refAviso.current?.focus();
  }, [aviso]);

  // O carimbo de tempo é pedido depois da resposta da assinatura, e chega
  // em um ou dois segundos. A via pergunta algumas vezes antes de desistir —
  // sem ele, ela continua válida e a clínica pode carimbar depois.
  const codigo = documento.codigoVerificacao;
  useEffect(() => {
    if (carimbo.em || !codigo) return;
    let vivo = true;
    const esperas = [1500, 3500, 7000, 12000];
    const temporizadores = esperas.map((espera) =>
      setTimeout(async () => {
        if (!vivo) return;
        try {
          const resposta = await carimboDaVia(codigo);
          if (vivo && resposta.carimboEm) {
            vivo = false;
            setCarimbo({ em: resposta.carimboEm, autoridade: resposta.carimboAutoridade });
          }
        } catch {
          // Sem rede agora: a próxima tentativa (ou recarregar) resolve.
        }
      }, espera),
    );
    return () => {
      vivo = false;
      temporizadores.forEach(clearTimeout);
    };
  }, [carimbo.em, codigo]);

  const quando = dataHora(documento.assinadoEm);
  const aparelho = aparelhoLegivel(documento.dispositivo);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {aviso ? (
        <div
          ref={refAviso}
          tabIndex={-1}
          role="status"
          className="sem-impressao flex min-w-0 items-start gap-3 rounded-[var(--radius-painel)] border border-positivo-borda bg-[linear-gradient(145deg,var(--color-positivo-fundo)_0%,#ffffff_100%)] px-4 py-4 shadow-[0_16px_36px_-30px_rgba(16,126,62,.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-5"
        >
          <span className="via-selo flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-positivo-borda bg-surface text-positivo">
            <CircleCheckAnimado />
          </span>
          <div className="min-w-0">
            <p className="break-words font-semibold text-positivo">{AVISO_DA_VIA[aviso].titulo}</p>
            <p className="mt-1 break-words text-sm leading-6 text-on-surface">{AVISO_DA_VIA[aviso].texto}</p>
          </div>
        </div>
      ) : null}

      <div className="sem-impressao grid gap-2.5 sm:flex sm:flex-wrap sm:items-center">
        <button type="button" onClick={() => window.print()} className={cn(BOTAO_PRIMARIO, "group")}>
          <Printer aria-hidden="true" size={18} strokeWidth={1.75} className="transition-transform duration-180 group-hover:-translate-y-0.5" />
          Salvar em PDF ou imprimir
        </button>
        {documento.enderecoVerificacao ? (
          <a href={documento.enderecoVerificacao} target="_blank" rel="noopener noreferrer" className={BOTAO_SECUNDARIO}>
            <ShieldCheck aria-hidden="true" size={17} strokeWidth={1.75} />
            Conferir autenticidade
          </a>
        ) : null}
        <span className="text-center text-xs leading-5 text-outline sm:text-left">
          Na janela que abrir, escolha &quot;Salvar como PDF&quot;.
        </span>
      </div>

      <div className="folha min-w-0 overflow-hidden rounded-[calc(var(--radius-painel)+2px)] border border-card-border bg-card shadow-[0_28px_78px_-52px_rgba(8,52,99,.6)]">
        <div className="border-b border-card-border bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] px-5 pt-5 pb-4 sm:px-8 sm:pt-7">
          {/* O timbre da via: a logo sem o quadro azul, porque fundo não sai
              no papel por padrão e a logo branca sumiria. */}
          <div className="flex min-w-0 items-center gap-3 border-b border-card-border pb-4">
            <MarcaDaClinica className="size-11 shrink-0 text-primary" />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate font-bold tracking-[-0.01em] text-primary">{CLINICA.nome}</p>
              <p className="mt-0.5 truncate text-xs text-outline">{CLINICA.descricao}</p>
            </div>
            {codigo ? (
              <span className="hidden shrink-0 rounded-full border border-positivo-borda bg-positivo-fundo px-3 py-1 text-[0.68rem] font-semibold tracking-[0.04em] text-positivo sm:inline-flex">
                Via assinada
              </span>
            ) : null}
          </div>
          <h1 className="t-headline mt-4 break-words text-primary">{documento.titulo}</h1>
          <p className="mt-1 break-words text-sm text-outline">{documento.paciente}</p>
        </div>

        <div className="px-4 py-5 sm:px-8 sm:py-7">
          <div className="folha-texto rounded-[var(--radius-cartao)] border border-card-border bg-[linear-gradient(180deg,#ffffff_0%,#fcfdff_100%)] px-4 py-5 shadow-[0_14px_30px_-28px_rgba(8,41,76,.3)] sm:px-7 sm:py-6">
            <p className="break-words whitespace-pre-wrap text-sm leading-7 text-on-surface">
              {documento.corpo}
            </p>
          </div>
        </div>

        <div className="folha-evidencias border-t border-card-border bg-[linear-gradient(180deg,#fbfdff_0%,#f7faff_100%)] px-5 py-5 sm:px-8 sm:py-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-[var(--radius-controle)] border border-primary-fixed bg-surface text-primary">
              <Fingerprint aria-hidden="true" size={16} strokeWidth={1.75} />
            </span>
            <div>
              <p className="rotulo text-primary">Assinatura eletrônica</p>
              <p className="mt-0.5 text-xs text-outline">Evidências preservadas com a via</p>
            </div>
          </div>

          <div className="grid min-w-0 gap-5 md:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="flex min-w-0 flex-col">
              {documento.assinadoPor ? <Linha rotulo="Assinado por" valor={documento.assinadoPor} /> : null}
              {quando ? <Linha icone={Clock3} rotulo="Data e hora" valor={`${quando} (horário de Brasília)`} /> : null}
              <Linha rotulo="Forma" valor={formaDaAssinatura(documento.assinadoCanal)} />
              {documento.localizacao ? (
                <Linha icone={MapPin} rotulo="Local aproximado" valor={`${documento.localizacao} (pela rede)`} />
              ) : null}
              {aparelho || documento.ip ? (
                <Linha
                  icone={Smartphone}
                  rotulo="Aparelho"
                  valor={[aparelho, documento.ip ? `rede ${documento.ip}` : null].filter(Boolean).join(" · ")}
                />
              ) : null}
              {documento.hash ? (
                <Linha rotulo="Texto (SHA-256)" valor={<code className="tabular break-all text-xs">{hashCurto(documento.hash)}</code>} />
              ) : null}
              {documento.manifestoHash ? (
                <Linha rotulo="Registro (SHA-256)" valor={<code className="tabular break-all text-xs">{hashCurto(documento.manifestoHash)}</code>} />
              ) : null}
              {codigo ? (
                <Linha
                  icone={Stamp}
                  rotulo="Carimbo de tempo"
                  valor={
                    carimbo.em ? (
                      <span className="inline-flex flex-wrap items-center gap-x-1.5">
                        <span className="font-medium text-positivo">{dataHora(carimbo.em, true)}</span>
                        <span className="text-outline">· {carimbo.autoridade} (RFC 3161)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-outline">
                        <LoaderCircle aria-hidden="true" size={13} className="sem-impressao animate-spin" />
                        Em emissão por autoridade independente
                      </span>
                    )
                  }
                />
              ) : null}
            </div>

            <div className="flex min-w-0 flex-col gap-3">
              <figure className="rounded-[var(--radius-cartao)] border border-card-border bg-surface px-4 pt-3 pb-3">
                {documento.rubrica ? (
                  <RubricaDesenhada caminho={documento.rubrica} className="h-20 w-full text-[#0b2a4a]" />
                ) : (
                  <p className="flex h-20 items-center justify-center text-center font-serif text-lg italic text-[#0b2a4a]">
                    {documento.assinadoPor}
                  </p>
                )}
                <figcaption className="mt-1 border-t border-outline-variant pt-1.5 text-center text-[0.68rem] leading-4 text-outline">
                  {documento.rubrica ? "Rubrica feita na assinatura" : documento.rubricaDispensada ? "Assinou pelo nome digitado" : "Assinatura pelo nome"}
                </figcaption>
              </figure>

              {codigo ? (
                <div className="flex items-center gap-3 rounded-[var(--radius-cartao)] border border-card-border bg-surface p-3">
                  {documento.qrVerificacao ? (
                    <span
                      aria-hidden="true"
                      className="block size-[4.75rem] shrink-0 [&_svg]:block [&_svg]:size-full"
                      // SVG gerado no servidor pela biblioteca de QR, a partir
                      // do endereço de verificação — nada vindo de fora.
                      dangerouslySetInnerHTML={{ __html: documento.qrVerificacao }}
                    />
                  ) : (
                    <QrCode aria-hidden="true" size={40} strokeWidth={1.4} className="shrink-0 text-outline" />
                  )}
                  <div className="min-w-0">
                    <p className="text-[0.66rem] font-semibold tracking-[0.05em] text-outline uppercase">Código de verificação</p>
                    <p className="tabular mt-0.5 font-mono text-[0.95rem] font-bold tracking-[0.04em] whitespace-nowrap text-primary">{codigo}</p>
                    {documento.enderecoVerificacao ? (
                      <p className="mt-0.5 break-all text-[0.64rem] leading-4 text-outline">{documento.enderecoVerificacao.replace(/^https?:\/\//, "")}</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {documento.fatores.length > 0 ? (
            <div className="mt-4 border-t border-card-border pt-4">
              <p className="text-[0.68rem] font-semibold tracking-[0.055em] text-outline uppercase">Conferido na assinatura</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {documento.fatores.map((fator) => (
                  <li key={fator} className="inline-flex items-center gap-1.5 rounded-full border border-positivo-borda bg-positivo-fundo px-2.5 py-1 text-xs font-medium text-positivo">
                    <BadgeCheck aria-hidden="true" size={13} strokeWidth={1.9} />
                    {rotuloDoFator(fator)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="mt-4 flex min-w-0 items-start gap-2 rounded-[var(--radius-controle)] border border-card-border bg-surface px-3 py-2.5 text-xs leading-5 text-outline">
            <ShieldCheck aria-hidden="true" size={14} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            <span className="min-w-0 break-words">
              As identificações SHA-256 são calculadas a partir do texto e do registro da assinatura: qualquer alteração produziria outro valor.
              {codigo ? " Leia o QR ou digite o código na página de verificação para conferir que esta via é autêntica." : ""}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function CircleCheckAnimado() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" className="via-selo-circulo" />
      <path d="m8.5 12.5 2.5 2.5 5-5.5" className="via-selo-check" />
    </svg>
  );
}

// ---------------------------------------------------------------------
// A página
// ---------------------------------------------------------------------

/** Frases das recusas da assinatura (as de campo têm lugar próprio). */
const RECUSA_AO_ASSINAR: Record<string, string> = {
  cpf_nao_confere:
    "O CPF não confere com o cadastro da clínica. Confira os números — ou deixe o campo em branco.",
  nome_invalido: "Confira o nome completo e tente de novo.",
  cpf_invalido: "Confira o CPF e tente de novo.",
};

export function AssinarPorLink({
  token,
  tipo,
  situacaoInicial,
  verificacao = null,
}: {
  token: string;
  tipo: TipoDocumento | null;
  /** Situação do link no carregamento da página, antes de qualquer digitação. */
  situacaoInicial: string;
  /** `nascimento_email` quando o link exige também o código por e-mail. */
  verificacao?: string | null;
}) {
  const comCodigo = verificacao === "nascimento_email";
  const anamnese = tipo !== null && !seAssina(tipo);

  const [etapa, setEtapa] = useState<Etapa>("identidade");
  const [recusa, setRecusa] = useState<string | null>(null);

  const [nascimento, setNascimento] = useState("");
  const [documento, setDocumento] = useState<DocumentoParaAssinar | null>(null);
  const [abrindo, setAbrindo] = useState(false);
  const [erroPorta, setErroPorta] = useState<string | null>(null);

  const [codigo, setCodigo] = useState("");
  const [emailMascarado, setEmailMascarado] = useState<string | null>(null);
  const [reenviarEm, setReenviarEm] = useState<number | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
  const [avisoCodigo, setAvisoCodigo] = useState<{ tom: "positivo" | "atencao" | "negativo"; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [confirmou, setConfirmou] = useState(false);
  const [rubrica, setRubrica] = useState<string | null>(null);
  const [rubricaDispensada, setRubricaDispensada] = useState(false);
  const [assinando, setAssinando] = useState(false);
  const [estado, setEstado] = useState<EstadoAssinaturaLink | null>(null);
  const [aviso, setAviso] = useState<AvisoDaVia>(null);

  // Leitura: quanto tempo com o texto aberto e até onde rolou.
  const abertoEm = useRef<number | null>(null);
  const [progresso, setProgresso] = useState(0);
  const [leuTudo, setLeuTudo] = useState(false);
  const refTexto = useRef<HTMLDivElement>(null);
  const refTitulo = useRef<HTMLHeadingElement>(null);

  const jaAssinado = situacaoInicial === "ja_assinado";

  // Relógio do "reenviar em N s" — só enquanto há espera.
  useEffect(() => {
    if (!reenviarEm || reenviarEm <= Date.now()) return;
    const intervalo = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(intervalo);
  }, [reenviarEm]);
  const faltam = reenviarEm ? Math.max(0, Math.ceil((reenviarEm - agora) / 1000)) : 0;

  // Troca de etapa leva o foco ao título dela (leitor de tela e teclado).
  useEffect(() => {
    if (etapa !== "identidade") refTitulo.current?.focus();
  }, [etapa]);

  const medirLeitura = useCallback(() => {
    const caixa = refTexto.current;
    if (!caixa) return;
    const rolavel = caixa.scrollHeight - caixa.clientHeight;
    const fracao = rolavel <= 4 ? 1 : Math.min(1, caixa.scrollTop / rolavel);
    setProgresso(Math.round(fracao * 100));
    if (fracao >= 0.98) setLeuTudo(true);
  }, []);

  useEffect(() => {
    if (etapa === "leitura") medirLeitura();
  }, [etapa, medirLeitura]);

  function mostrarDocumento(resposta: DocumentoParaAssinar) {
    setDocumento(resposta);
    if (resposta.situacao === "ja_assinado") {
      setEtapa("via");
      return;
    }
    abertoEm.current ??= Date.now();
    setEtapa("leitura");
  }

  function tratarRecusaDaPorta(situacao: string): boolean {
    if (FINAIS.includes(situacao)) {
      setRecusa(situacao);
      return true;
    }
    return false;
  }

  async function abrir(data: string, codigoDigitado: string) {
    const resposta = await abrirDocumentoParaAssinatura(token, data, codigoDigitado);
    switch (resposta.situacao) {
      case "ok":
      case "ja_assinado":
        if (resposta.corpo) mostrarDocumento(resposta);
        else setRecusa(resposta.situacao);
        return resposta;
      case "data_incorreta":
        setEtapa("identidade");
        setErroPorta("A data não confere com o cadastro. Confira e tente de novo — depois de dez erros o link se fecha.");
        return resposta;
      case "codigo_incorreto":
        setAvisoCodigo({ tom: "negativo", texto: "Código incorreto. Confira o e-mail mais recente — cada erro conta para o bloqueio do link." });
        return resposta;
      case "codigo_expirado":
        setAvisoCodigo({ tom: "atencao", texto: "Este código venceu. Peça um novo com o botão abaixo." });
        setReenviarEm(null);
        return resposta;
      case "codigo_necessario":
        setEtapa("codigo");
        return resposta;
      case "falhou":
        if (etapa === "codigo") setAvisoCodigo({ tom: "negativo", texto: FALHA_DE_CONEXAO });
        else setErroPorta(FALHA_DE_CONEXAO);
        return resposta;
      default:
        if (!tratarRecusaDaPorta(resposta.situacao)) setErroPorta(FALHA_DE_CONEXAO);
        return resposta;
    }
  }

  async function pedirCodigo(data: string, reenvio: boolean) {
    const resposta = await enviarCodigoDeVerificacao(token, data);
    switch (resposta.situacao) {
      case "ok":
        setEmailMascarado(resposta.emailMascarado);
        setReenviarEm(resposta.reenviarEm ? new Date(resposta.reenviarEm).getTime() : Date.now() + 45_000);
        setAgora(Date.now());
        // No primeiro envio o título já diz para onde foi; o aviso é só do reenvio.
        setAvisoCodigo(reenvio ? { tom: "positivo", texto: "Enviamos um novo código. Use sempre o mais recente." } : null);
        setCodigo("");
        setEtapa("codigo");
        return;
      case "aguarde":
        setEmailMascarado(resposta.emailMascarado);
        setReenviarEm(resposta.reenviarEm ? new Date(resposta.reenviarEm).getTime() : Date.now() + 45_000);
        setAgora(Date.now());
        setAvisoCodigo({ tom: "atencao", texto: "Enviamos um código há menos de um minuto. Confira sua caixa de entrada (e o spam) antes de pedir outro." });
        setEtapa("codigo");
        return;
      case "limite_de_envios":
        if (etapa === "codigo") setAvisoCodigo({ tom: "negativo", texto: "Foram pedidos códigos demais para este link. Peça um novo link à clínica." });
        else setErroPorta("Foram pedidos códigos demais para este link. Peça um novo link à clínica.");
        return;
      case "data_incorreta":
        setEtapa("identidade");
        setErroPorta("A data não confere com o cadastro. Confira e tente de novo — depois de dez erros o link se fecha.");
        return;
      case "email_falhou":
        if (etapa === "codigo") setAvisoCodigo({ tom: "negativo", texto: "Não conseguimos enviar o e-mail agora. Tente de novo em instantes." });
        else setErroPorta("Não conseguimos enviar o e-mail com o código agora. Tente de novo em instantes; se continuar, avise a clínica.");
        return;
      case "falhou":
        if (etapa === "codigo") setAvisoCodigo({ tom: "negativo", texto: FALHA_DE_CONEXAO });
        else setErroPorta(FALHA_DE_CONEXAO);
        return;
      default:
        if (!tratarRecusaDaPorta(resposta.situacao)) setErroPorta(FALHA_DE_CONEXAO);
    }
  }

  async function enviarPorta(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (abrindo) return;

    // A data vem do próprio campo, não só do estado: no Safari o
    // preenchimento automático (`bday`) e a digitação no seletor nativo de
    // data podem mudar o valor sem o React ouvir o evento — o botão ficava
    // desabilitado para sempre com a data à vista.
    const lida = String(new FormData(evento.currentTarget).get("nascimento") ?? "") || nascimento;
    if (!lida) {
      setErroPorta("Informe a sua data de nascimento.");
      return;
    }
    if (lida !== nascimento) setNascimento(lida);

    setAbrindo(true);
    setErroPorta(null);
    try {
      if (comCodigo) await pedirCodigo(lida, false);
      else await abrir(lida, "");
    } catch {
      setErroPorta(FALHA_DE_CONEXAO);
    } finally {
      setAbrindo(false);
    }
  }

  async function enviarCodigo(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (abrindo) return;
    const digitos = codigo.replace(/\D/g, "");
    if (digitos.length !== 6) {
      setAvisoCodigo({ tom: "negativo", texto: "O código tem 6 números." });
      return;
    }
    setAbrindo(true);
    setAvisoCodigo(null);
    try {
      await abrir(nascimento, digitos);
    } catch {
      setAvisoCodigo({ tom: "negativo", texto: FALHA_DE_CONEXAO });
    } finally {
      setAbrindo(false);
    }
  }

  async function reenviar() {
    if (enviando || faltam > 0) return;
    setEnviando(true);
    try {
      await pedirCodigo(nascimento, true);
    } catch {
      setAvisoCodigo({ tom: "negativo", texto: FALHA_DE_CONEXAO });
    } finally {
      setEnviando(false);
    }
  }

  async function assinar(evento: React.FormEvent) {
    evento.preventDefault();
    if (assinando) return;

    setAssinando(true);

    try {
      const segundos = abertoEm.current ? Math.round((Date.now() - abertoEm.current) / 1000) : null;
      const resposta = await assinarPorLink({
        token,
        nascimento,
        codigo,
        nome,
        cpf,
        confirmou,
        rubrica: rubricaDispensada ? null : rubrica,
        rubricaDispensada,
        leituraSegundos: segundos,
        leituraCompleta: leuTudo,
      });
      setEstado(resposta);

      // A verificação por código vale uma hora depois de conferida: passou
      // disso, volta para a etapa do código, com o que foi digitado guardado.
      if (resposta.situacao === "codigo_expirado" || resposta.situacao === "codigo_necessario" || resposta.situacao === "codigo_incorreto") {
        setEtapa("codigo");
        setCodigo("");
        setReenviarEm(null);
        setAvisoCodigo({ tom: "atencao", texto: "Por segurança, confirme um novo código para concluir a assinatura. O que você preencheu continua guardado." });
        return;
      }

      if (resposta.situacao && FINAIS.includes(resposta.situacao)) {
        setRecusa(resposta.situacao);
        return;
      }

      // `ja_assinado` numa tentativa de assinar não é recusa: o documento está
      // assinado (outra aba, outro aparelho, o balcão) e o link continua
      // valendo em modo leitura (0016). O destino é o mesmo do sucesso — a via
      // —, só o aviso muda.
      const jaEstava = resposta.situacao === "ja_assinado";

      if (resposta.situacao === "ok" || jaEstava) {
        // Recarrega do banco em vez de montar a via com o que está na tela: o
        // que ela vai guardar precisa ser o que ficou gravado, não o que foi
        // digitado aqui.
        setAviso(jaEstava ? "ja_estava" : "registrada");
        const via = await abrirDocumentoParaAssinatura(token, nascimento, codigo);
        if (via.situacao === "ja_assinado" && via.corpo) {
          setDocumento(via);
          setEtapa("via");
        } else {
          setEstado({
            situacao: null,
            erros: {
              geral: jaEstava
                ? "Este documento já está assinado. Não conseguimos carregar a via agora — recarregue a página para salvá-la."
                : "Sua assinatura foi registrada. Não conseguimos carregar a via agora — recarregue a página para salvá-la.",
            },
          });
        }
      }
    } catch {
      setEstado({ situacao: null, erros: { geral: FALHA_DE_CONEXAO } });
    } finally {
      setAssinando(false);
    }
  }

  // Link morto já no carregamento: não faz sentido pedir data de nascimento
  // para depois dizer que o link não serve.
  if (!ABERTAS.includes(situacaoInicial)) {
    return <Recusa situacao={situacaoInicial} />;
  }
  if (recusa) return <Recusa situacao={recusa} />;

  const etapas = <Etapas atual={etapa} comCodigo={comCodigo} anamnese={anamnese} />;

  // ----- porta: data de nascimento -----
  if (etapa === "identidade" || !documento && etapa !== "codigo") {
    return (
      <div className="flex min-w-0 flex-col gap-4">
        {jaAssinado ? null : etapas}
        <form
          onSubmit={enviarPorta}
          className="relative isolate overflow-hidden rounded-[calc(var(--radius-painel)+2px)] border border-card-border bg-[linear-gradient(155deg,#ffffff_0%,#f9fcff_58%,#edf6ff_100%)] px-5 py-7 shadow-[0_28px_72px_-50px_rgba(8,52,99,.58)] sm:px-9 sm:py-9"
        >
          <span aria-hidden="true" className="pointer-events-none absolute -top-28 -right-16 size-72 rounded-full bg-primary-fixed/55 blur-3xl" />
          <div className="relative">
            <span className="mb-5 flex size-13 items-center justify-center rounded-[var(--radius-painel)] border border-primary-fixed-dim bg-surface text-primary shadow-[0_14px_30px_-24px_rgba(8,84,160,.48)]">
              <Lock aria-hidden="true" size={22} strokeWidth={1.65} />
            </span>

            <p className="rotulo text-primary">Acesso protegido</p>
            <h1 className="t-headline mt-2 max-w-2xl break-words text-primary">
              {jaAssinado
                ? "Sua via do documento assinado"
                : `${tipo ? ROTULO_TIPO[tipo] : "Documento"} para ${anamnese ? "preencher" : "assinar"}`}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-on-surface-variant">
              {comCodigo
                ? "Para proteger seus dados, confirme sua data de nascimento. Em seguida enviamos um código para o seu e-mail."
                : "Para proteger seus dados, confirme sua data de nascimento antes de abrir o documento."}
            </p>

            <div className="mt-6 max-w-sm rounded-[var(--radius-painel)] border border-card-border bg-surface p-4 shadow-[0_16px_34px_-30px_rgba(8,41,76,.35)] sm:p-5">
              <Campo id="nascimento" rotulo="Sua data de nascimento" obrigatorio>
                <input
                  id="nascimento"
                  name="nascimento"
                  type="date"
                  // `bday`: o navegador sugere a data da própria pessoa, que é
                  // exatamente a que se pede aqui.
                  autoComplete="bday"
                  // Não controlado: o campo guarda o que a pessoa escolheu mesmo
                  // quando o navegador não avisa o React (ver `enviarPorta`).
                  defaultValue={nascimento}
                  onChange={(evento) => setNascimento(evento.target.value)}
                  required
                  className={cn(ENTRADA, erroPorta && ENTRADA_ERRO)}
                />
              </Campo>
            </div>

            {erroPorta ? <div className="mt-3"><Alerta>{erroPorta}</Alerta></div> : null}

            <button type="submit" disabled={abrindo} className={cn(BOTAO_PRIMARIO, "mt-6")}>
              {abrindo ? (
                <>
                  <LoaderCircle aria-hidden="true" size={18} className="animate-spin" />
                  {comCodigo ? "Enviando código…" : "Abrindo…"}
                </>
              ) : comCodigo ? (
                <>
                  Continuar
                  <ArrowRight aria-hidden="true" size={17} strokeWidth={1.9} />
                </>
              ) : jaAssinado ? (
                "Ver minha via"
              ) : anamnese ? (
                "Abrir formulário"
              ) : (
                "Abrir documento"
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ----- segundo fator: código por e-mail -----
  if (etapa === "codigo") {
    return (
      <div className="flex min-w-0 flex-col gap-4">
        {etapas}
        <form
          onSubmit={enviarCodigo}
          className="relative isolate overflow-hidden rounded-[calc(var(--radius-painel)+2px)] border border-card-border bg-[linear-gradient(155deg,#ffffff_0%,#f9fcff_58%,#edf6ff_100%)] px-5 py-7 shadow-[0_28px_72px_-50px_rgba(8,52,99,.58)] sm:px-9 sm:py-9"
        >
          <span aria-hidden="true" className="pointer-events-none absolute -top-28 -right-16 size-72 rounded-full bg-primary-fixed/55 blur-3xl" />
          <div className="relative">
            <span className="mb-5 flex size-13 items-center justify-center rounded-[var(--radius-painel)] border border-primary-fixed-dim bg-surface text-primary shadow-[0_14px_30px_-24px_rgba(8,84,160,.48)]">
              <MailCheck aria-hidden="true" size={22} strokeWidth={1.65} />
            </span>
            <p className="rotulo text-primary">Segundo fator</p>
            <h1 ref={refTitulo} tabIndex={-1} className="t-headline mt-2 max-w-2xl break-words text-primary outline-none">
              Digite o código do e-mail
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-on-surface-variant">
              {emailMascarado ? (
                <>Enviamos 6 números para <strong className="font-semibold text-on-surface">{emailMascarado}</strong>. O código vale por 15 minutos.</>
              ) : (
                "Enviamos 6 números para o e-mail do seu cadastro. O código vale por 15 minutos."
              )}
            </p>

            {avisoCodigo ? <div className="mt-4"><Alerta tom={avisoCodigo.tom}>{avisoCodigo.texto}</Alerta></div> : null}

            <div className="mt-5 sm:max-w-xs">
              <label htmlFor="codigo" className="text-sm font-semibold text-on-surface">
                Código de verificação
              </label>
              <input
                id="codigo"
                name="codigo"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9 ]*"
                maxLength={7}
                value={codigo}
                onChange={(evento) => setCodigo(evento.target.value.replace(/[^\d]/g, "").slice(0, 6))}
                placeholder="000000"
                aria-describedby="codigo-dica"
                className={cn(
                  ENTRADA,
                  "codigo-otp mt-1.5 h-14 text-center font-mono text-2xl font-bold tracking-[0.5em] tabular placeholder:text-outline-variant",
                  avisoCodigo?.tom === "negativo" && ENTRADA_ERRO,
                )}
              />
              <p id="codigo-dica" className="mt-1.5 text-xs leading-5 text-outline">
                Não chegou? Confira o spam ou peça outro.
              </p>
            </div>

            <div className="mt-6 grid gap-2.5 sm:flex sm:flex-wrap sm:items-center">
              <button type="submit" disabled={abrindo || codigo.length !== 6} className={BOTAO_PRIMARIO}>
                {abrindo ? (
                  <>
                    <LoaderCircle aria-hidden="true" size={18} className="animate-spin" />
                    Conferindo…
                  </>
                ) : (
                  <>
                    <ShieldCheck aria-hidden="true" size={17} strokeWidth={1.8} />
                    Confirmar código
                  </>
                )}
              </button>
              <button type="button" onClick={reenviar} disabled={enviando || faltam > 0} className={BOTAO_SECUNDARIO}>
                {enviando ? (
                  <LoaderCircle aria-hidden="true" size={16} className="animate-spin" />
                ) : (
                  <RotateCw aria-hidden="true" size={15} strokeWidth={1.8} />
                )}
                {faltam > 0 ? <span className="tabular">Reenviar em {faltam}s</span> : "Reenviar código"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEtapa("identidade");
                  setAvisoCodigo(null);
                }}
                className="inline-flex min-h-11 items-center justify-center gap-1.5 px-2 text-sm font-medium text-outline hover:text-primary"
              >
                <ArrowLeft aria-hidden="true" size={15} strokeWidth={1.8} />
                Corrigir a data
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  if (!documento || !documento.corpo) return <Recusa situacao={documento?.situacao ?? "nao_encontrado"} />;

  // ----- já assinado: a via dela -----
  if (etapa === "via" || documento.situacao === "ja_assinado") {
    return (
      <div className="flex min-w-0 flex-col gap-4">
        {aviso ? etapas : null}
        <ViaAssinada documento={documento} aviso={aviso} />
      </div>
    );
  }

  // ----- anamnese: preencher, não assinar -----
  if (anamnese) {
    return (
      <div className="flex min-w-0 flex-col gap-6">
        {etapas}
        <div className="min-w-0 overflow-hidden rounded-[calc(var(--radius-painel)+2px)] border border-card-border bg-card shadow-[0_24px_64px_-48px_rgba(8,52,99,.5)]">
          <div className="border-b border-card-border bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] px-5 pt-5 pb-4 sm:px-8 sm:pt-6">
            <p className="rotulo text-primary">Documento da clínica</p>
            <h1 ref={refTitulo} tabIndex={-1} className="t-headline mt-2 break-words text-primary outline-none">{documento.titulo}</h1>
            <p className="mt-1 break-words text-sm text-outline">{documento.paciente}</p>
          </div>

          <div className="px-5 py-5 sm:px-8 sm:py-6">
            <p className="break-words whitespace-pre-wrap text-sm leading-7 text-on-surface">
              {documento.corpo}
            </p>
          </div>
        </div>

        <div className="min-w-0 rounded-[calc(var(--radius-painel)+2px)] border border-card-border bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] px-5 py-5 shadow-[0_24px_64px_-48px_rgba(8,52,99,.5)] sm:px-8 sm:py-7">
          <div className="mb-5 border-b border-card-border pb-4">
            <p className="rotulo text-primary">Preenchimento protegido</p>
            <p className="mt-1 text-sm leading-6 text-on-surface-variant">Suas respostas ficam ligadas a este documento e podem ser retomadas enquanto o link estiver válido.</p>
          </div>
          {/* Sem passo de confirmação: a anamnese se preenche aos poucos e se
              corrige quando for preciso. Voltar ao link retoma de onde parou. */}
          <FormularioAnamnese
            campos={documento.campos}
            destino={{ tipo: "link", token, nascimento, codigo }}
          />

          <p className="mt-5 border-t border-card-border pt-4 text-xs leading-5 text-outline">
            Pode salvar e voltar depois para completar ou corrigir, enquanto o
            link valer. Não há nada para assinar aqui.
          </p>
        </div>
      </div>
    );
  }

  // ----- leitura -----
  if (etapa === "leitura") {
    return (
      <div className="flex min-w-0 flex-col gap-4">
        {etapas}
        <div className="min-w-0 overflow-hidden rounded-[calc(var(--radius-painel)+2px)] border border-card-border bg-card shadow-[0_26px_68px_-50px_rgba(8,52,99,.55)]">
          <div className="border-b border-card-border bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] px-5 pt-5 pb-4 sm:px-8 sm:pt-6">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-primary-fixed bg-selecao text-primary">
                <BookOpenCheck aria-hidden="true" size={17} strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="rotulo text-primary">Leia antes de assinar</p>
                <h1 ref={refTitulo} tabIndex={-1} className="t-headline mt-1.5 break-words text-primary outline-none">{documento.titulo}</h1>
                <p className="mt-1 break-words text-sm text-outline">{documento.paciente}</p>
              </div>
            </div>
          </div>

          <div className="px-4 py-5 sm:px-8 sm:py-6">
            <div className="mb-2.5 flex items-center gap-3">
              <div
                role="progressbar"
                aria-label="Leitura do documento"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progresso}
                className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-container-high"
              >
                <span
                  className={cn("block h-full rounded-full transition-[width,background-color] duration-300", leuTudo ? "bg-positivo" : "bg-primary-container")}
                  style={{ width: `${progresso}%` }}
                />
              </div>
              <span className={cn("tabular shrink-0 text-xs font-semibold", leuTudo ? "text-positivo" : "text-outline")}>
                {leuTudo ? "Lido até o fim" : `${progresso}% lido`}
              </span>
            </div>
            <div
              ref={refTexto}
              onScroll={medirLeitura}
              tabIndex={0}
              aria-label="Texto do documento"
              className="rolagem-esmaecida max-h-[60vh] overflow-y-auto rounded-[var(--radius-cartao)] border border-card-border bg-[linear-gradient(180deg,#ffffff_0%,#fcfdff_100%)] px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,.9)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-7"
            >
              <p className="break-words whitespace-pre-wrap text-sm leading-7 text-on-surface">
                {documento.corpo}
              </p>
            </div>
          </div>

          {documento.hash ? (
            <div className="flex min-w-0 items-start gap-2 border-t border-card-border bg-surface-container-low px-5 py-4 text-xs leading-5 text-outline sm:px-8">
              <Fingerprint aria-hidden="true" size={14} strokeWidth={1.75} className="mt-0.5 shrink-0" />
              <span className="min-w-0 break-words">
                Identificação deste texto:{" "}
                <code className="tabular break-all">{hashCurto(documento.hash)}</code>. Ele
                não pode ser alterado depois que você assinar.
              </span>
            </div>
          ) : null}
        </div>

        <div className="grid gap-2.5 sm:flex sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-outline sm:max-w-md">
            {leuTudo
              ? "Tudo lido. Na próxima etapa você confirma seus dados e faz a rubrica."
              : "Role o texto até o fim. Se tiver dúvida, fale com a clínica antes de assinar."}
          </p>
          <button type="button" onClick={() => setEtapa("assinatura")} className={BOTAO_PRIMARIO}>
            Continuar para assinar
            <ArrowRight aria-hidden="true" size={17} strokeWidth={1.9} />
          </button>
        </div>
      </div>
    );
  }

  // ----- assinatura -----
  const recusaDeCampo =
    estado?.situacao && estado.situacao !== "ok" && estado.situacao !== "ja_assinado"
      ? RECUSA_AO_ASSINAR[estado.situacao] ??
        (estado.situacao === "rubrica_necessaria" || estado.situacao === "rubrica_invalida"
          ? null
          : RECUSA[estado.situacao]?.texto ?? "Não foi possível registrar a assinatura. Confira o nome e o CPF e tente de novo.")
      : null;
  const erroRubrica =
    estado?.erros.rubrica ??
    (estado?.situacao === "rubrica_necessaria"
      ? "Faça a sua rubrica no quadro, ou marque que prefere assinar só pelo nome."
      : estado?.situacao === "rubrica_invalida"
        ? "Não conseguimos ler a rubrica. Limpe o quadro e desenhe de novo."
        : undefined);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {etapas}

      <div className="flex min-w-0 flex-wrap items-center gap-3 rounded-[var(--radius-painel)] border border-card-border bg-surface px-4 py-3 shadow-[0_16px_40px_-34px_rgba(8,41,76,.4)] sm:px-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-primary-fixed bg-selecao text-primary">
          <Fingerprint aria-hidden="true" size={16} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.68rem] font-semibold tracking-[0.055em] text-outline uppercase">Você está assinando</p>
          <p className="truncate text-sm font-semibold text-on-surface">{documento.titulo}</p>
        </div>
        <button
          type="button"
          onClick={() => setEtapa("leitura")}
          className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-controle)] border border-card-border px-3 text-xs font-semibold text-primary hover:bg-selecao"
        >
          <ArrowLeft aria-hidden="true" size={14} strokeWidth={1.9} />
          Reler
        </button>
      </div>

      <form
        onSubmit={assinar}
        className="relative isolate min-w-0 overflow-hidden rounded-[calc(var(--radius-painel)+2px)] border border-card-border bg-[linear-gradient(155deg,#ffffff_0%,#fbfdff_62%,#eef6ff_100%)] px-5 py-6 shadow-[0_26px_68px_-50px_rgba(8,52,99,.55)] sm:px-8 sm:py-7"
      >
        <span aria-hidden="true" className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-primary-fixed/45 blur-3xl" />
        <div className="relative">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-primary-fixed-dim bg-surface text-primary shadow-[0_12px_26px_-22px_rgba(8,84,160,.42)]">
              <PenLine aria-hidden="true" size={18} strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="rotulo text-primary">Confirmação final</p>
              <h2 ref={refTitulo} tabIndex={-1} className="t-headline mt-1 text-primary outline-none">Assinar</h2>
              <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                Confirme seu nome e faça a sua rubrica. Os dois ficam na sua via.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Campo id="nome" rotulo="Nome completo" obrigatorio erro={estado?.erros.nome}>
              <input
                id="nome"
                type="text"
                value={nome}
                maxLength={160}
                required
                autoComplete="name"
                onChange={(evento) => setNome(evento.target.value)}
                className={cn(ENTRADA, estado?.erros.nome && ENTRADA_ERRO)}
              />
            </Campo>

            <Campo
              id="cpf"
              rotulo="CPF"
              erro={estado?.erros.cpf ?? (estado?.situacao === "cpf_nao_confere" ? "Não confere com o cadastro." : undefined)}
              dica="Opcional. Quando confere com o cadastro, reforça a assinatura."
            >
              <input
                id="cpf"
                type="text"
                inputMode="numeric"
                // Não há token de autocompletar para CPF; `off` evita que o
                // navegador ofereça um número qualquer já digitado neste campo.
                autoComplete="off"
                value={cpf}
                maxLength={14}
                onChange={(evento) => setCpf(evento.target.value)}
                placeholder="000.000.000-00"
                className={cn(ENTRADA, "tabular", (estado?.erros.cpf || estado?.situacao === "cpf_nao_confere") && ENTRADA_ERRO)}
              />
            </Campo>
          </div>

          <div className="mt-5 rounded-[var(--radius-painel)] border border-card-border bg-surface p-4 shadow-[0_14px_30px_-28px_rgba(8,41,76,.3)] sm:p-5">
            <QuadroDeRubrica
              aoMudar={setRubrica}
              dispensada={rubricaDispensada}
              aoDispensar={setRubricaDispensada}
              erro={erroRubrica}
            />
          </div>

          <label className="mt-5 flex items-start gap-3 rounded-[var(--radius-cartao)] border border-card-border bg-surface px-3.5 py-3 text-sm leading-6 text-on-surface shadow-[0_12px_26px_-24px_rgba(8,41,76,.28)] sm:px-4">
            <input
              type="checkbox"
              checked={confirmou}
              onChange={(evento) => setConfirmou(evento.target.checked)}
              required
              className="mt-1 size-4 shrink-0 accent-[var(--color-primary-container)]"
            />
            <span className="min-w-0 break-words">Li o documento por inteiro e concordo com o conteúdo.</span>
          </label>

          {estado?.erros.confirmacao ? (
            <p role="alert" className="mt-2 text-xs leading-5 text-error">
              {estado.erros.confirmacao}
            </p>
          ) : null}

          {estado?.erros.geral ? <div className="mt-4"><Alerta>{estado.erros.geral}</Alerta></div> : null}
          {recusaDeCampo ? <div className="mt-4"><Alerta>{recusaDeCampo}</Alerta></div> : null}

          <button type="submit" disabled={assinando} className={cn(BOTAO_PRIMARIO, "mt-6")}>
            {assinando ? (
              <>
                <LoaderCircle aria-hidden="true" size={18} className="animate-spin" />
                Registrando…
              </>
            ) : (
              <>
                <PenLine aria-hidden="true" size={18} strokeWidth={1.75} />
                Assinar documento
              </>
            )}
          </button>

          <p className="mt-3 max-w-2xl text-xs leading-5 text-outline">
            Ao assinar, ficam registrados a data e a hora, o endereço de rede, o
            aparelho, a região aproximada e o que foi conferido (data de
            nascimento{comCodigo ? ", código por e-mail" : ""}). O registro recebe
            um carimbo de tempo de uma autoridade independente — é o que dá
            validade à assinatura eletrônica (Lei 14.063/2020).
          </p>
        </div>
      </form>
    </div>
  );
}
