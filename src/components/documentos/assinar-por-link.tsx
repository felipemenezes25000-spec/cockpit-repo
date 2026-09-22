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
import { useState } from "react";
import { Campo, ENTRADA, ENTRADA_ERRO } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import {
  hashCurto,
  ROTULO_TIPO,
  seAssina,
  type TipoDocumento,
} from "@/lib/documento";
import { FormularioAnamnese } from "./formulario-anamnese";
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
 * "Data incorreta" é a única que diz o que houve, porque quem errou a própria
 * data precisa saber para corrigir. As demais ficam propositalmente iguais:
 * link inexistente e link revogado dão a mesma resposta.
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
  falhou: {
    titulo: "Não foi possível abrir agora",
    texto:
      "A página não conseguiu falar com a clínica. Confira sua internet e recarregue em instantes — o link continua valendo.",
  },
};

function Recusa({ situacao }: { situacao: string }) {
  const aviso = RECUSA[situacao] ?? RECUSA.nao_encontrado;

  return (
    <div className="rounded-[var(--radius-painel)] border border-card-border bg-card px-6 py-8 text-center sm:px-10">
      <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-[var(--radius-controle)] bg-surface-container text-outline">
        <CircleAlert aria-hidden="true" size={22} strokeWidth={1.5} />
      </span>
      <h1 className="t-headline text-on-surface">{aviso.titulo}</h1>
      <p className="mt-2 text-sm text-outline">{aviso.texto}</p>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-card-border py-2 first:border-t-0 first:pt-0 sm:flex-row sm:gap-4">
      <span className="text-xs font-medium uppercase text-outline sm:w-40 sm:shrink-0">
        {rotulo}
      </span>
      <span className="text-sm break-words text-on-surface">{valor}</span>
    </div>
  );
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
function ViaAssinada({
  documento,
  recemAssinado,
}: {
  documento: DocumentoParaAssinar;
  recemAssinado: boolean;
}) {
  const assinadoEm = documento.assinadoEm ? new Date(documento.assinadoEm) : null;

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
    <div className="flex flex-col gap-6">
      {recemAssinado ? (
        <div className="sem-impressao flex items-start gap-3 rounded-[var(--radius-painel)] border border-positivo-borda bg-positivo-fundo px-5 py-4">
          <CircleCheck
            aria-hidden="true"
            size={20}
            strokeWidth={1.75}
            className="mt-0.5 shrink-0 text-positivo"
          />
          <div>
            <p className="font-medium text-positivo">Assinatura registrada</p>
            <p className="mt-1 text-sm text-on-surface">
              Guarde a sua via: use o botão abaixo para salvar em PDF ou
              imprimir. Você também pode voltar a este link enquanto ele valer.
            </p>
          </div>
        </div>
      ) : null}

      <div className="sem-impressao flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-controle)] bg-primary-container px-6 text-sm font-medium text-on-primary transition-colors hover:bg-primary"
        >
          <Printer aria-hidden="true" size={18} strokeWidth={1.75} />
          Salvar em PDF ou imprimir
        </button>
        <span className="text-xs text-outline">
          Na janela que abrir, escolha &quot;Salvar como PDF&quot;.
        </span>
      </div>

      <div className="folha rounded-[var(--radius-painel)] border border-card-border bg-card">
        <div className="border-b border-card-border px-6 pt-6 pb-4 sm:px-8">
          <p className="text-xs text-outline">{CLINICA.nome}</p>
          <h1 className="t-headline mt-1 text-primary">{documento.titulo}</h1>
          <p className="mt-1 text-sm text-outline">{documento.paciente}</p>
        </div>

        <div className="px-6 py-6 sm:px-8">
          <div className="folha-texto rounded-[var(--radius-cartao)] border border-card-border bg-surface px-5 py-5 sm:px-7">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-on-surface">
              {documento.corpo}
            </p>
          </div>
        </div>

        <div className="folha-evidencias border-t border-card-border px-6 py-5 sm:px-8">
          <p className="rotulo mb-3">Assinatura eletrônica</p>
          <div className="flex flex-col">
            {documento.assinadoPor ? (
              <Linha rotulo="Assinado por" valor={documento.assinadoPor} />
            ) : null}
            {quando ? <Linha rotulo="Data e hora" valor={quando} /> : null}
            <Linha
              rotulo="Forma"
              valor="Assinatura eletrônica simples, à distância (Lei 14.063/2020)"
            />
            {documento.hash ? (
              <Linha
                rotulo="Identificação do texto"
                valor={`SHA-256 ${hashCurto(documento.hash)}`}
              />
            ) : null}
          </div>

          <p className="mt-4 flex items-start gap-2 text-xs text-outline">
            <Fingerprint
              aria-hidden="true"
              size={14}
              strokeWidth={1.75}
              className="mt-0.5 shrink-0"
            />
            A identificação acima é calculada a partir do texto deste documento.
            Qualquer alteração produziria um valor diferente, e o registro
            guardado pela clínica traz o mesmo número.
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
  const [recemAssinado, setRecemAssinado] = useState(false);

  const jaAssinado = situacaoInicial === "ja_assinado";

  async function abrir(evento: React.FormEvent) {
    evento.preventDefault();
    if (abrindo) return;

    setAbrindo(true);
    setErroPorta(null);

    try {
      const resposta = await abrirDocumentoParaAssinatura(token, nascimento);

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

      if (resposta.situacao === "ok") {
        // Recarrega do banco em vez de montar a via com o que está na tela: o
        // que ela vai guardar precisa ser o que ficou gravado, não o que foi
        // digitado aqui.
        setRecemAssinado(true);
        const via = await abrirDocumentoParaAssinatura(token, nascimento);
        if (via.situacao === "falhou") {
          setEstado({
            situacao: null,
            erros: {
              geral:
                "Sua assinatura foi registrada. Não conseguimos carregar a via agora — recarregue a página para salvá-la.",
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
        className="rounded-[var(--radius-painel)] border border-card-border bg-card px-6 py-8 sm:px-10"
      >
        <span className="mb-4 flex size-12 items-center justify-center rounded-[var(--radius-controle)] bg-secondary-fixed text-primary">
          <Lock aria-hidden="true" size={22} strokeWidth={1.5} />
        </span>

        <h1 className="t-headline text-primary">
          {jaAssinado
            ? "Sua via do documento assinado"
            : `${tipo ? ROTULO_TIPO[tipo] : "Documento"} para ${
                tipo && !seAssina(tipo) ? "preencher" : "assinar"
              }`}
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Para proteger seus dados, confirme sua data de nascimento antes de
          abrir o documento.
        </p>

        <div className="mt-6 max-w-xs">
          <Campo id="nascimento" rotulo="Sua data de nascimento" obrigatorio>
            <input
              id="nascimento"
              type="date"
              value={nascimento}
              onChange={(evento) => setNascimento(evento.target.value)}
              required
              className={cn(ENTRADA, erroPorta && ENTRADA_ERRO)}
            />
          </Campo>
        </div>

        {erroPorta ? (
          <p role="alert" className="mt-3 text-sm text-error">
            {erroPorta}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={abrindo || !nascimento}
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-controle)] bg-primary-container px-6 text-sm font-medium text-on-primary transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-55"
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
      </form>
    );
  }

  // ----- já assinado: a via dela -----
  if (documento.situacao === "ja_assinado" && documento.corpo) {
    return <ViaAssinada documento={documento} recemAssinado={recemAssinado} />;
  }

  if (documento.situacao !== "ok" || !documento.corpo) {
    return <Recusa situacao={documento.situacao} />;
  }

  // ----- anamnese: preencher, não assinar -----
  if (tipo && !seAssina(tipo)) {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-[var(--radius-painel)] border border-card-border bg-card">
          <div className="border-b border-card-border px-6 pt-6 pb-4 sm:px-8">
            <h1 className="t-headline text-primary">{documento.titulo}</h1>
            <p className="mt-1 text-sm text-outline">{documento.paciente}</p>
          </div>

          <div className="px-6 py-6 sm:px-8">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-on-surface">
              {documento.corpo}
            </p>
          </div>
        </div>

        <div className="rounded-[var(--radius-painel)] border border-card-border bg-card px-6 py-6 sm:px-8">
          {/* Sem passo de confirmação: a anamnese se preenche aos poucos e se
              corrige quando for preciso. Voltar ao link retoma de onde parou. */}
          <FormularioAnamnese
            campos={documento.campos}
            destino={{ tipo: "link", token, nascimento }}
          />

          <p className="mt-5 border-t border-card-border pt-4 text-xs text-outline">
            Pode salvar e voltar depois para completar ou corrigir, enquanto o
            link valer. Não há nada para assinar aqui.
          </p>
        </div>
      </div>
    );
  }

  // ----- documento e assinatura -----
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-[var(--radius-painel)] border border-card-border bg-card">
        <div className="border-b border-card-border px-6 pt-6 pb-4 sm:px-8">
          <h1 className="t-headline text-primary">{documento.titulo}</h1>
          <p className="mt-1 text-sm text-outline">{documento.paciente}</p>
        </div>

        <div className="px-6 py-6 sm:px-8">
          <div className="max-h-[60vh] overflow-y-auto rounded-[var(--radius-cartao)] border border-card-border bg-surface px-5 py-5 sm:px-7">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-on-surface">
              {documento.corpo}
            </p>
          </div>
        </div>

        {documento.hash ? (
          <div className="flex items-start gap-2 border-t border-card-border px-6 py-4 text-xs text-outline sm:px-8">
            <Fingerprint
              aria-hidden="true"
              size={14}
              strokeWidth={1.75}
              className="mt-0.5 shrink-0"
            />
            <span>
              Identificação deste texto:{" "}
              <code className="tabular">{hashCurto(documento.hash)}</code>. Ele
              não pode ser alterado depois que você assinar.
            </span>
          </div>
        ) : null}
      </div>

      <form
        onSubmit={assinar}
        className="rounded-[var(--radius-painel)] border border-card-border bg-card px-6 py-6 sm:px-8"
      >
        <h2 className="t-headline text-primary">Assinar</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Escreva seu nome completo como forma de assinatura.
        </p>

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
              value={cpf}
              maxLength={14}
              onChange={(evento) => setCpf(evento.target.value)}
              placeholder="000.000.000-00"
              className={cn(ENTRADA, "tabular", estado?.erros.cpf && ENTRADA_ERRO)}
            />
          </Campo>
        </div>

        <label className="mt-5 flex items-start gap-2.5 text-sm text-on-surface">
          <input
            type="checkbox"
            checked={confirmou}
            onChange={(evento) => setConfirmou(evento.target.checked)}
            required
            className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary-container)]"
          />
          Li o documento acima por inteiro e concordo com o conteúdo.
        </label>

        {estado?.erros.confirmacao ? (
          <p role="alert" className="mt-1.5 text-xs text-error">
            {estado.erros.confirmacao}
          </p>
        ) : null}

        {estado?.erros.geral ? (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-[var(--radius-cartao)] border border-error/25 bg-error-container px-3.5 py-2.5 text-sm text-on-error-container"
          >
            <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
            {estado.erros.geral}
          </p>
        ) : null}

        {estado?.situacao && estado.situacao !== "ok" ? (
          <p
            role="alert"
            className="mt-4 rounded-[var(--radius-cartao)] border border-error/25 bg-error-container px-3.5 py-2.5 text-sm text-on-error-container"
          >
            {RECUSA[estado.situacao]?.texto ??
              "Não foi possível registrar a assinatura. Peça um novo link à clínica."}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={assinando}
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-controle)] bg-primary-container px-6 text-sm font-medium text-on-primary transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
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

        <p className="mt-3 text-xs text-outline">
          Ao assinar, ficam registrados a data, a hora, o endereço de rede e o
          aparelho usado — é o que dá validade à assinatura eletrônica
          (Lei 14.063/2020). Depois de assinar, você poderá salvar a sua via.
        </p>
      </form>
    </div>
  );
}
