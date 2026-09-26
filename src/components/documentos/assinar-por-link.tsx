"use client";

import {
  CircleAlert,
  CircleCheck,
  Fingerprint,
  LoaderCircle,
  Lock,
  PenLine,
  Printer,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Campo, ENTRADA, ENTRADA_ERRO } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import {
  hashCurto,
  ROTULO_TIPO,
  seAssina,
  type TipoDocumento,
} from "@/lib/documento";
import { FormularioAnamnese } from "./formulario-anamnese";
import { MarcaDaClinica } from "@/components/ui/marca-da-clinica";
import { CLINICA } from "@/lib/nav";
import {
  abrirDocumentoParaAssinatura,
  assinarPorLink,
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
      "Houve tentativas demais com data de nascimento errada e o link foi fechado por segurança. Peça um novo à clínica.",
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

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="grid min-w-0 gap-1 border-t border-card-border py-3 first:border-t-0 first:pt-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
      <span className="text-[0.68rem] font-semibold tracking-[0.055em] text-outline uppercase">
        {rotulo}
      </span>
      <span className="min-w-0 break-words text-sm text-on-surface">{valor}</span>
    </div>
  );
}

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
      "Guarde a sua via: use o botão abaixo para salvar em PDF ou imprimir. Você também pode voltar a este link enquanto ele valer.",
  },
  ja_estava: {
    titulo: "Este documento já estava assinado",
    texto:
      "A assinatura já tinha sido registrada antes — em outra aba, em outro aparelho ou na clínica. Não é preciso assinar de novo: guarde a sua via com o botão abaixo.",
  },
} as const;

function ViaAssinada({
  documento,
  aviso,
}: {
  documento: DocumentoParaAssinar;
  aviso: AvisoDaVia;
}) {
  const assinadoEm = documento.assinadoEm ? new Date(documento.assinadoEm) : null;

  // Assinar desmonta o formulário e leva junto o botão que tinha o foco: sem
  // isto, o foco caía no <body> e o leitor de tela não dizia que a
  // assinatura foi registrada. O aviso recebe o foco e é lido inteiro.
  const refAviso = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (aviso) refAviso.current?.focus();
  }, [aviso]);

  const quando = assinadoEm
    ? assinadoEm.toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {aviso ? (
        <div
          ref={refAviso}
          tabIndex={-1}
          role="status"
          className="sem-impressao flex min-w-0 items-start gap-3 rounded-[var(--radius-painel)] border border-positivo-borda bg-[linear-gradient(145deg,var(--color-positivo-fundo)_0%,#ffffff_100%)] px-4 py-4 shadow-[0_16px_36px_-30px_rgba(16,126,62,.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-5"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-positivo-borda bg-surface text-positivo">
            <CircleCheck aria-hidden="true" size={18} strokeWidth={1.85} />
          </span>
          <div className="min-w-0">
            <p className="break-words font-semibold text-positivo">{AVISO_DA_VIA[aviso].titulo}</p>
            <p className="mt-1 break-words text-sm leading-6 text-on-surface">{AVISO_DA_VIA[aviso].texto}</p>
          </div>
        </div>
      ) : null}

      <div className="sem-impressao grid gap-2.5 sm:flex sm:flex-wrap sm:items-center">
        <button
          type="button"
          onClick={() => window.print()}
          className="group inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-controle)] border border-primary-container bg-primary-container px-5 text-sm font-semibold text-on-primary shadow-[0_14px_28px_-18px_rgba(10,110,209,.7)] transition-[transform,background-color,box-shadow] duration-180 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-[0_18px_34px_-18px_rgba(8,60,115,.72)] active:translate-y-0 sm:w-auto"
        >
          <Printer aria-hidden="true" size={18} strokeWidth={1.75} className="transition-transform duration-180 group-hover:-translate-y-0.5" />
          Salvar em PDF ou imprimir
        </button>
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
            <div className="min-w-0 leading-tight">
              <p className="truncate font-bold tracking-[-0.01em] text-primary">{CLINICA.nome}</p>
              <p className="mt-0.5 truncate text-xs text-outline">{CLINICA.descricao}</p>
            </div>
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
          <div className="flex min-w-0 flex-col">
            {documento.assinadoPor ? (
              <Linha rotulo="Assinado por" valor={documento.assinadoPor} />
            ) : null}
            {quando ? <Linha rotulo="Data e hora" valor={quando} /> : null}
            <Linha rotulo="Forma" valor={formaDaAssinatura(documento.assinadoCanal)} />
            {documento.hash ? (
              <Linha
                rotulo="Identificação do texto"
                valor={`SHA-256 ${hashCurto(documento.hash)}`}
              />
            ) : null}
          </div>

          <p className="mt-4 flex min-w-0 items-start gap-2 rounded-[var(--radius-controle)] border border-card-border bg-surface px-3 py-2.5 text-xs leading-5 text-outline">
            <Fingerprint
              aria-hidden="true"
              size={14}
              strokeWidth={1.75}
              className="mt-0.5 shrink-0"
            />
            <span className="min-w-0 break-words">
              A identificação acima é calculada a partir do texto deste documento.
              Qualquer alteração produziria um valor diferente, e o registro
              guardado pela clínica traz o mesmo número.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export function AssinarPorLink({
  token,
  tipo,
  situacaoInicial,
}: {
  token: string;
  tipo: TipoDocumento | null;
  /** Situação do link no carregamento da página, antes de qualquer digitação. */
  situacaoInicial: string;
}) {
  const [nascimento, setNascimento] = useState("");
  const [documento, setDocumento] = useState<DocumentoParaAssinar | null>(null);
  const [abrindo, setAbrindo] = useState(false);
  const [erroPorta, setErroPorta] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [confirmou, setConfirmou] = useState(false);
  const [assinando, setAssinando] = useState(false);
  const [estado, setEstado] = useState<EstadoAssinaturaLink | null>(null);
  const [aviso, setAviso] = useState<AvisoDaVia>(null);

  const jaAssinado = situacaoInicial === "ja_assinado";

  async function abrir(evento: React.FormEvent<HTMLFormElement>) {
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
      const resposta = await abrirDocumentoParaAssinatura(token, lida);

      if (resposta.situacao === "data_incorreta") {
        setErroPorta(
          "A data não confere com o cadastro. Confira e tente de novo — depois de dez erros o link se fecha.",
        );
      } else if (resposta.situacao === "falhou") {
        setErroPorta(FALHA_DE_CONEXAO);
      } else {
        setDocumento(resposta);
      }
    } catch {
      setErroPorta(FALHA_DE_CONEXAO);
    } finally {
      setAbrindo(false);
    }
  }

  async function assinar(evento: React.FormEvent) {
    evento.preventDefault();
    if (assinando) return;

    setAssinando(true);

    try {
      const resposta = await assinarPorLink({
        token,
        nascimento,
        nome,
        cpf,
        confirmou,
      });
      setEstado(resposta);

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
        const via = await abrirDocumentoParaAssinatura(token, nascimento);
        if (via.situacao === "falhou") {
          setEstado({
            situacao: null,
            erros: {
              geral: jaEstava
                ? "Este documento já está assinado. Não conseguimos carregar a via agora — recarregue a página para salvá-la."
                : "Sua assinatura foi registrada. Não conseguimos carregar a via agora — recarregue a página para salvá-la.",
            },
          });
        } else {
          setDocumento(via);
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

  // ----- porta: data de nascimento -----
  if (!documento) {
    return (
      <form
        onSubmit={abrir}
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
              : `${tipo ? ROTULO_TIPO[tipo] : "Documento"} para ${
                  tipo && !seAssina(tipo) ? "preencher" : "assinar"
                }`}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-on-surface-variant">
            Para proteger seus dados, confirme sua data de nascimento antes de
            abrir o documento.
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
                // quando o navegador não avisa o React (ver `abrir`).
                defaultValue={nascimento}
                onChange={(evento) => setNascimento(evento.target.value)}
                required
                className={cn(ENTRADA, erroPorta && ENTRADA_ERRO)}
              />
            </Campo>
          </div>

          {erroPorta ? (
            <p role="alert" className="mt-3 flex max-w-xl items-start gap-2 rounded-[var(--radius-cartao)] border border-negativo-borda bg-negativo-fundo px-3.5 py-2.5 text-sm leading-5 text-negativo">
              <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
              <span className="min-w-0 break-words">{erroPorta}</span>
            </p>
          ) : null}

          <button
            type="submit"
            disabled={abrindo}
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-controle)] border border-primary-container bg-primary-container px-6 text-sm font-semibold text-on-primary shadow-[0_14px_28px_-18px_rgba(10,110,209,.7)] transition-[transform,background-color,box-shadow] duration-180 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-[0_18px_34px_-18px_rgba(8,60,115,.72)] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 sm:w-auto"
          >
            {abrindo ? (
              <>
                <LoaderCircle aria-hidden="true" size={18} className="animate-spin" />
                Abrindo…
              </>
            ) : jaAssinado ? (
              "Ver minha via"
            ) : tipo && !seAssina(tipo) ? (
              "Abrir formulário"
            ) : (
              "Abrir documento"
            )}
          </button>
        </div>
      </form>
    );
  }

  // ----- já assinado: a via dela -----
  if (documento.situacao === "ja_assinado" && documento.corpo) {
    return <ViaAssinada documento={documento} aviso={aviso} />;
  }

  if (documento.situacao !== "ok" || !documento.corpo) {
    return <Recusa situacao={documento.situacao} />;
  }

  // ----- anamnese: preencher, não assinar -----
  if (tipo && !seAssina(tipo)) {
    return (
      <div className="flex min-w-0 flex-col gap-6">
        <div className="min-w-0 overflow-hidden rounded-[calc(var(--radius-painel)+2px)] border border-card-border bg-card shadow-[0_24px_64px_-48px_rgba(8,52,99,.5)]">
          <div className="border-b border-card-border bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] px-5 pt-5 pb-4 sm:px-8 sm:pt-6">
            <p className="rotulo text-primary">Documento da clínica</p>
            <h1 className="t-headline mt-2 break-words text-primary">{documento.titulo}</h1>
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
            destino={{ tipo: "link", token, nascimento }}
          />

          <p className="mt-5 border-t border-card-border pt-4 text-xs leading-5 text-outline">
            Pode salvar e voltar depois para completar ou corrigir, enquanto o
            link valer. Não há nada para assinar aqui.
          </p>
        </div>
      </div>
    );
  }

  // ----- documento e assinatura -----
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="min-w-0 overflow-hidden rounded-[calc(var(--radius-painel)+2px)] border border-card-border bg-card shadow-[0_26px_68px_-50px_rgba(8,52,99,.55)]">
        <div className="border-b border-card-border bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] px-5 pt-5 pb-4 sm:px-8 sm:pt-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-primary-fixed bg-selecao text-primary">
              <Fingerprint aria-hidden="true" size={17} strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="rotulo text-primary">Leia antes de assinar</p>
              <h1 className="t-headline mt-1.5 break-words text-primary">{documento.titulo}</h1>
              <p className="mt-1 break-words text-sm text-outline">{documento.paciente}</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-5 sm:px-8 sm:py-6">
          <div className="rolagem-esmaecida max-h-[60vh] overflow-y-auto rounded-[var(--radius-cartao)] border border-card-border bg-[linear-gradient(180deg,#ffffff_0%,#fcfdff_100%)] px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,.9)] sm:px-7">
            <p className="break-words whitespace-pre-wrap text-sm leading-7 text-on-surface">
              {documento.corpo}
            </p>
          </div>
        </div>

        {documento.hash ? (
          <div className="flex min-w-0 items-start gap-2 border-t border-card-border bg-surface-container-low px-5 py-4 text-xs leading-5 text-outline sm:px-8">
            <Fingerprint
              aria-hidden="true"
              size={14}
              strokeWidth={1.75}
              className="mt-0.5 shrink-0"
            />
            <span className="min-w-0 break-words">
              Identificação deste texto:{" "}
              <code className="tabular break-all">{hashCurto(documento.hash)}</code>. Ele
              não pode ser alterado depois que você assinar.
            </span>
          </div>
        ) : null}
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
              <h2 className="t-headline mt-1 text-primary">Assinar</h2>
              <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                Escreva seu nome completo como forma de assinatura.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Campo
              id="nome"
              rotulo="Nome completo"
              obrigatorio
              erro={estado?.erros.nome}
            >
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
              erro={estado?.erros.cpf}
              dica="Opcional. Reforça a validade da assinatura."
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
                className={cn(ENTRADA, "tabular", estado?.erros.cpf && ENTRADA_ERRO)}
              />
            </Campo>
          </div>

          <label className="mt-5 flex items-start gap-3 rounded-[var(--radius-cartao)] border border-card-border bg-surface px-3.5 py-3 text-sm leading-6 text-on-surface shadow-[0_12px_26px_-24px_rgba(8,41,76,.28)] sm:px-4">
            <input
              type="checkbox"
              checked={confirmou}
              onChange={(evento) => setConfirmou(evento.target.checked)}
              required
              className="mt-1 size-4 shrink-0 accent-[var(--color-primary-container)]"
            />
            <span className="min-w-0 break-words">Li o documento acima por inteiro e concordo com o conteúdo.</span>
          </label>

          {estado?.erros.confirmacao ? (
            <p role="alert" className="mt-2 text-xs leading-5 text-error">
              {estado.erros.confirmacao}
            </p>
          ) : null}

          {estado?.erros.geral ? (
            <p
              role="alert"
              className="mt-4 flex min-w-0 items-start gap-2 rounded-[var(--radius-cartao)] border border-error bg-error-container px-3.5 py-2.5 text-sm leading-5 text-on-error-container"
            >
              <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
              <span className="min-w-0 break-words">{estado.erros.geral}</span>
            </p>
          ) : null}

          {estado?.situacao && estado.situacao !== "ok" && estado.situacao !== "ja_assinado" ? (
            <p
              role="alert"
              className="mt-4 break-words rounded-[var(--radius-cartao)] border border-error bg-error-container px-3.5 py-2.5 text-sm leading-5 text-on-error-container"
            >
              {/* O que sobra sem frase própria é recusa de campo que escapou da
                  conferência daqui (`nome_invalido`, `cpf_invalido`): o link
                  vale, e mandar pedir outro não resolveria nada. */}
              {RECUSA[estado.situacao]?.texto ??
                "Não foi possível registrar a assinatura. Confira o nome e o CPF e tente de novo."}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={assinando}
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-controle)] border border-primary-container bg-primary-container px-6 text-sm font-semibold text-on-primary shadow-[0_14px_28px_-18px_rgba(10,110,209,.72)] transition-[transform,background-color,box-shadow] duration-180 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-[0_18px_34px_-18px_rgba(8,60,115,.74)] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 sm:w-auto"
          >
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
            Ao assinar, ficam registrados a data, a hora, o endereço de rede e o
            aparelho usado — é o que dá validade à assinatura eletrônica
            (Lei 14.063/2020). Depois de assinar, você poderá salvar a sua via.
          </p>
        </div>
      </form>
    </div>
  );
}
