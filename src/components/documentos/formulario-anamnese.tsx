"use client";

import { Check, CircleAlert, LoaderCircle, Save } from "lucide-react";
import { useState } from "react";
import { AREA_TEXTO, Campo, ENTRADA } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import {
  obrigatoriasPendentes,
  respondidas,
  validarResposta,
  type CampoRespondido,
} from "@/lib/documento";
import { responderAnamnese } from "@/server/acoes/documentos";
import { responderPorLink } from "@/server/acoes/assinatura-link";

type Valor = string | string[] | null;

/**
 * Onde as respostas vão parar. Duas portas com guardas diferentes: a da
 * consulta exige sessão de administradora, a do link exige token e data de
 * nascimento. O componente não escolhe nada — só chama a que recebeu.
 */
export type DestinoDaAnamnese =
  | { tipo: "consulta"; documentoId: string }
  | { tipo: "link"; token: string; nascimento: string };

function valorInicial(campo: CampoRespondido): Valor {
  if (campo.tipo === "escolha_multipla") return campo.respostas ?? [];
  return campo.resposta ?? "";
}

/**
 * Pergunta de marcar (sim/não, escolha): um GRUPO de controles, não um campo.
 *
 * `Campo` liga o rótulo a um controle só, por `htmlFor`. Aqui há vários, e o
 * rótulo apontava para um id que não existia: o leitor de tela anunciava
 * "Sim, botão" sem dizer a que pergunta ele respondia — inclusive para a
 * paciente, no link. O `fieldset` dá ao grupo o nome (o `legend`, repetido em
 * `aria-labelledby` para não depender de como cada navegador lê o legend) e a
 * dica (`aria-describedby`).
 *
 * O obrigatório vai em `aria-required` só na escolha única: a ARIA admite o
 * atributo em `radiogroup`, não em `group`. Na múltipla ele vai por extenso,
 * escondido da tela e lido pelo leitor — o asterisco visível é `aria-hidden`,
 * como em `Campo`.
 *
 * `disabled` no `fieldset` desativa todas as opções de uma vez: é o modo
 * somente leitura, sem depender de cada opção lembrar.
 */
function GrupoDaPergunta({
  id,
  rotulo,
  obrigatorio,
  dica,
  unica,
  somenteLeitura,
  children,
}: {
  id: string;
  rotulo: string;
  obrigatorio: boolean;
  dica?: string;
  /** Uma resposta só (sim/não, escolha única): o grupo é um `radiogroup`. */
  unica: boolean;
  somenteLeitura: boolean;
  children: React.ReactNode;
}) {
  const idRotulo = `${id}-rotulo`;
  const idDica = `${id}-dica`;
  const descricao = dica ? idDica : undefined;

  // Os atributos ficam separados por papel: `aria-required` num `group` é
  // atributo que a ARIA não reconhece.
  const papel = unica
    ? {
        role: "radiogroup" as const,
        "aria-required": obrigatorio ? true : undefined,
      }
    : {};

  return (
    <fieldset
      {...papel}
      aria-labelledby={idRotulo}
      aria-describedby={descricao}
      disabled={somenteLeitura}
      className="group/pergunta premium-interactive relative flex min-w-0 flex-col gap-2 overflow-hidden rounded-[var(--radius-painel)] border border-card-border bg-[linear-gradient(180deg,#ffffff_0%,#fcfdff_100%)] p-4 shadow-[0_12px_30px_-28px_rgba(8,41,76,.34)] transition-[border-color,background-color,box-shadow] duration-200 focus-within:border-primary-fixed focus-within:shadow-[0_18px_38px_-30px_rgba(8,84,160,.38)] sm:p-5"
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-[linear-gradient(180deg,#75b5ef_0%,#0a6ed1_55%,#0854a0_100%)] opacity-65" />
      <legend id={idRotulo} className="rotulo relative mb-1.5 max-w-full break-words pl-1 text-on-surface">
        {rotulo}
        {obrigatorio ? (
          <>
            <span aria-hidden="true" className="ml-1 text-atencao-acento">
              *
            </span>
            {unica ? null : <span className="sr-only"> (obrigatória)</span>}
          </>
        ) : (
          <span className="ml-2 font-normal tracking-normal text-outline lowercase">
            opcional
          </span>
        )}
      </legend>

      <div className="relative min-w-0 pl-1">{children}</div>

      {dica ? (
        <p id={idDica} className="relative min-w-0 break-words pl-1 text-xs leading-5 text-outline transition-colors group-focus-within/pergunta:text-on-surface-variant">
          {dica}
        </p>
      ) : null}
    </fieldset>
  );
}

/**
 * Aparência de cada opção. O estado marcado não depende só da cor: o controle
 * nativo (bolinha ou caixa preenchida) muda de forma junto com o fundo, e é
 * ele que o leitor de tela anuncia como "marcado".
 */
function classeDaOpcao(marcada: boolean, somenteLeitura: boolean): string {
  return cn(
    "min-w-0 rounded-[var(--radius-cartao)] border text-sm text-on-surface shadow-[0_8px_20px_-20px_rgba(8,41,76,.28)] transition-[transform,background-color,border-color,box-shadow] duration-180",
    somenteLeitura ? "cursor-not-allowed" : "cursor-pointer active:scale-[0.99]",
    marcada
      ? "border-primary-fixed-dim bg-primary-fixed shadow-[0_10px_24px_-20px_rgba(8,84,160,.38)]"
      : cn("border-card-border bg-surface", !somenteLeitura && "hover:-translate-y-0.5 hover:border-primary-fixed hover:bg-selecao hover:shadow-[0_12px_26px_-20px_rgba(8,84,160,.34)]"),
  );
}

const CONTROLE_DA_OPCAO =
  "size-4 shrink-0 accent-[var(--color-primary-container)] disabled:cursor-not-allowed";

const SIM_NAO = [
  { valor: "sim", rotulo: "Sim" },
  { valor: "nao", rotulo: "Não" },
] as const;

function PerguntaSimNao({
  nome,
  valor,
  aoMudar,
  somenteLeitura,
}: {
  nome: string;
  valor: string;
  aoMudar: (v: string) => void;
  somenteLeitura: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {SIM_NAO.map((opcao) => {
        const marcada = valor === opcao.valor;

        return (
          <label
            key={opcao.valor}
            className={cn(
              "inline-flex min-h-10 min-w-20 items-center justify-center gap-2 px-4 font-medium",
              classeDaOpcao(marcada, somenteLeitura),
            )}
          >
            <input
              type="radio"
              name={nome}
              value={opcao.valor}
              checked={marcada}
              onChange={() => aoMudar(opcao.valor)}
              onClick={() => {
                if (marcada) aoMudar("");
              }}
              className={CONTROLE_DA_OPCAO}
            />
            {opcao.rotulo}
          </label>
        );
      })}
    </div>
  );
}

function PerguntaEscolha({
  campo,
  nome,
  valor,
  aoMudar,
  multipla,
  somenteLeitura,
}: {
  campo: CampoRespondido;
  nome: string;
  valor: Valor;
  aoMudar: (v: Valor) => void;
  multipla: boolean;
  somenteLeitura: boolean;
}) {
  const marcadas = multipla
    ? Array.isArray(valor)
      ? valor
      : []
    : typeof valor === "string" && valor
      ? [valor]
      : [];

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {campo.opcoes.map((opcao) => {
        const marcada = marcadas.includes(opcao);

        return (
          <label
            key={opcao}
            className={cn(
              "flex min-w-0 items-start gap-2.5 px-3.5 py-2.5",
              classeDaOpcao(marcada, somenteLeitura),
            )}
          >
            {multipla ? (
              <input
                type="checkbox"
                name={nome}
                value={opcao}
                checked={marcada}
                onChange={() =>
                  aoMudar(
                    marcada
                      ? marcadas.filter((m) => m !== opcao)
                      : [...marcadas, opcao],
                  )
                }
                className={cn("mt-0.5", CONTROLE_DA_OPCAO)}
              />
            ) : (
              <input
                type="radio"
                name={nome}
                value={opcao}
                checked={marcada}
                onChange={() => aoMudar(opcao)}
                onClick={() => {
                  if (marcada) aoMudar("");
                }}
                className={cn("mt-0.5", CONTROLE_DA_OPCAO)}
              />
            )}
            <span className="min-w-0 break-words leading-5">{opcao}</span>
          </label>
        );
      })}
    </div>
  );
}

export function FormularioAnamnese({
  campos,
  destino,
  somenteLeitura = false,
}: {
  campos: CampoRespondido[];
  destino: DestinoDaAnamnese;
  somenteLeitura?: boolean;
}) {
  const [valores, setValores] = useState<Record<string, Valor>>(() =>
    Object.fromEntries(campos.map((campo) => [campo.chave, valorInicial(campo)])),
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const naTela: CampoRespondido[] = campos.map((campo) => {
    const valor = valores[campo.chave];
    return campo.tipo === "escolha_multipla"
      ? { ...campo, respostas: Array.isArray(valor) ? valor : [] }
      : { ...campo, resposta: typeof valor === "string" ? valor : null };
  });

  const pendentes = obrigatoriasPendentes(naTela);
  const feitas = respondidas(naTela);
  const progresso = campos.length > 0 ? Math.round((feitas / campos.length) * 100) : 0;

  function mudar(chave: string, valor: Valor) {
    setValores((atuais) => ({ ...atuais, [chave]: valor }));
    setSalvo(false);
    setErro(null);
  }

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    if (salvando) return;

    for (const campo of campos) {
      const valor = valores[campo.chave];
      if (typeof valor === "string") {
        const problema = validarResposta(campo, valor);
        if (problema) {
          setErro(`"${campo.rotulo}": ${problema}`);
          return;
        }
      }
    }

    setSalvando(true);
    setErro(null);

    const respostas: Record<string, string | string[] | null> = {};
    for (const campo of campos) {
      const valor = valores[campo.chave];
      if (campo.tipo === "escolha_multipla") {
        respostas[campo.chave] = Array.isArray(valor) ? valor : [];
      } else {
        respostas[campo.chave] =
          typeof valor === "string" && valor.trim() ? valor.trim() : null;
      }
    }

    try {
      if (destino.tipo === "consulta") {
        const resposta = await responderAnamnese({
          documentoId: destino.documentoId,
          respostas,
        });
        if (resposta.ok) setSalvo(true);
        else setErro(resposta.erro);
      } else {
        const situacao = await responderPorLink({
          token: destino.token,
          nascimento: destino.nascimento,
          respostas,
        });

        if (situacao === "ok") setSalvo(true);
        else if (situacao === "data_incorreta")
          setErro("A data de nascimento não confere. Recarregue a página.");
        else if (situacao === "expirado" || situacao === "revogado" || situacao === "bloqueado")
          setErro("Este link não vale mais. Peça um novo à clínica.");
        else if (situacao === "indisponivel")
          setErro("Este formulário não aceita mais respostas.");
        else if (situacao === "respostas_invalidas")
          setErro("Alguma resposta não foi aceita. Confira datas, números e alternativas marcadas.");
        else setErro("Não foi possível salvar. Tente de novo.");
      }
    } catch {
      setErro(
        "Não foi possível falar com o servidor. Confira a conexão e tente de novo — o que você preencheu continua na tela.",
      );
    } finally {
      setSalvando(false);
    }
  }

  if (campos.length === 0) {
    return (
      <div className="rounded-[var(--radius-cartao)] border border-dashed border-outline-variant bg-surface-container-low px-4 py-5 text-center">
        <p className="text-sm font-medium text-on-surface-variant">Este documento não tem perguntas.</p>
      </div>
    );
  }

  return (
    <form onSubmit={salvar} className="flex min-w-0 flex-col gap-5">
      <section className="relative isolate overflow-hidden rounded-[calc(var(--radius-painel)+1px)] border border-primary-fixed-dim bg-[linear-gradient(145deg,#f4f9ff_0%,#ffffff_62%,#edf6ff_100%)] p-4 shadow-[0_18px_42px_-34px_rgba(8,84,160,.4)] sm:p-5" aria-label="Progresso da anamnese">
        <span aria-hidden="true" className="pointer-events-none absolute -top-20 -right-14 size-52 rounded-full bg-primary-fixed/45 blur-3xl" />
        <div className="relative flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold text-on-surface">Preenchimento da anamnese</p>
            <p className="mt-1 max-w-2xl break-words text-xs leading-5 text-outline">
              {somenteLeitura
                ? `${feitas} de ${campos.length} perguntas respondidas.`
                : "Você pode salvar parcialmente e voltar depois enquanto o formulário estiver disponível."}
            </p>
          </div>
          <span className="tabular shrink-0 rounded-full border border-primary-fixed bg-surface px-2.5 py-1 text-xs font-bold text-primary shadow-[0_8px_18px_-16px_rgba(8,84,160,.35)]">{progresso}%</span>
        </div>
        <div className="relative mt-4 h-2 overflow-hidden rounded-full border border-primary-fixed bg-surface shadow-inner" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progresso} aria-label={`${feitas} de ${campos.length} perguntas respondidas`}>
          <span className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#0a6ed1_0%,#0854a0_100%)] transition-[width] duration-300 ease-out" style={{ width: `${progresso}%` }} />
        </div>
        <div className="relative mt-3 flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-xs">
          <span className="tabular font-medium text-on-surface-variant">{feitas} respondidas</span>
          {pendentes > 0 ? <span className="font-medium text-atencao">{pendentes} obrigatória{pendentes > 1 ? "s" : ""} em falta</span> : <span className="font-medium text-positivo">Obrigatórias completas</span>}
        </div>
      </section>

      <div className="flex min-w-0 flex-col gap-3">
        {campos.map((campo, indice) => {
          const valor = valores[campo.chave];
          const idCampo = `campo-${campo.chave}`;
          const rotulo = `${indice + 1}. ${campo.rotulo}`;
          const dica = campo.ajuda || undefined;

          if (campo.tipo === "sim_nao") {
            return (
              <GrupoDaPergunta
                key={campo.chave}
                id={idCampo}
                rotulo={rotulo}
                obrigatorio={campo.obrigatorio}
                dica={dica}
                unica
                somenteLeitura={somenteLeitura}
              >
                <PerguntaSimNao
                  nome={idCampo}
                  valor={typeof valor === "string" ? valor : ""}
                  aoMudar={(v) => mudar(campo.chave, v)}
                  somenteLeitura={somenteLeitura}
                />
              </GrupoDaPergunta>
            );
          }

          if (campo.tipo === "escolha_unica" || campo.tipo === "escolha_multipla") {
            const multipla = campo.tipo === "escolha_multipla";
            return (
              <GrupoDaPergunta
                key={campo.chave}
                id={idCampo}
                rotulo={rotulo}
                obrigatorio={campo.obrigatorio}
                dica={dica}
                unica={!multipla}
                somenteLeitura={somenteLeitura}
              >
                <PerguntaEscolha
                  campo={campo}
                  nome={idCampo}
                  valor={valor ?? ""}
                  multipla={multipla}
                  aoMudar={(v) => mudar(campo.chave, v)}
                  somenteLeitura={somenteLeitura}
                />
              </GrupoDaPergunta>
            );
          }

          return (
            <div key={campo.chave} className="premium-interactive relative min-w-0 overflow-hidden rounded-[var(--radius-painel)] border border-card-border bg-[linear-gradient(180deg,#ffffff_0%,#fcfdff_100%)] p-4 shadow-[0_12px_30px_-28px_rgba(8,41,76,.34)] transition-[border-color,background-color,box-shadow] duration-200 focus-within:border-primary-fixed focus-within:shadow-[0_18px_38px_-30px_rgba(8,84,160,.38)] sm:p-5">
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-[linear-gradient(180deg,#75b5ef_0%,#0a6ed1_55%,#0854a0_100%)] opacity-65" />
              <div className="relative min-w-0 pl-1">
                <Campo
                  id={idCampo}
                  rotulo={rotulo}
                  obrigatorio={campo.obrigatorio}
                  dica={dica}
                >
                  {campo.tipo === "texto_longo" ? (
                    <textarea
                      id={idCampo}
                      value={typeof valor === "string" ? valor : ""}
                      maxLength={4000}
                      rows={4}
                      disabled={somenteLeitura}
                      onChange={(evento) => mudar(campo.chave, evento.target.value)}
                      className={AREA_TEXTO}
                    />
                  ) : (
                    <input
                      id={idCampo}
                      type={campo.tipo === "data" ? "date" : "text"}
                      inputMode={campo.tipo === "numero" ? "decimal" : undefined}
                      value={typeof valor === "string" ? valor : ""}
                      maxLength={campo.tipo === "numero" ? 20 : 4000}
                      disabled={somenteLeitura}
                      onChange={(evento) => mudar(campo.chave, evento.target.value)}
                      className={cn(ENTRADA, campo.tipo === "numero" && "tabular")}
                    />
                  )}
                </Campo>
              </div>
            </div>
          );
        })}
      </div>

      {erro ? (
        <p
          role="alert"
          className="flex min-w-0 items-start gap-2 rounded-[var(--radius-cartao)] border border-error bg-error-container px-3.5 py-2.5 text-sm leading-5 text-on-error-container"
        >
          <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          <span className="min-w-0 break-words">{erro}</span>
        </p>
      ) : null}

      {somenteLeitura ? null : (
        <div className={cn(
          "sticky z-20 grid min-w-0 gap-2 overflow-hidden rounded-[var(--radius-painel)] border border-card-border bg-surface/96 px-3 py-3 shadow-[0_20px_50px_-32px_rgba(8,41,76,.5)] backdrop-blur-xl sm:flex sm:flex-wrap sm:items-center sm:gap-3 sm:px-4",
          destino.tipo === "link" ? "bottom-3" : "bottom-[calc(5.15rem+env(safe-area-inset-bottom))] lg:bottom-3",
        )}>
          <button
            type="submit"
            disabled={salvando}
            className={cn(
              "relative inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-controle)] border px-5 text-sm font-semibold shadow-[0_12px_26px_-20px_rgba(8,41,76,.35)] transition-[transform,background-color,border-color,box-shadow] duration-180 disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto",
              salvo ? "border-positivo-borda bg-positivo-fundo text-positivo" : "border-primary-container bg-primary-container text-on-primary hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-[0_16px_30px_-18px_rgba(8,60,115,.65)]",
            )}
          >
            {salvando ? (
              <>
                <LoaderCircle aria-hidden="true" size={18} className="animate-spin" />
                Salvando…
              </>
            ) : salvo ? (
              <>
                <Check aria-hidden="true" size={18} strokeWidth={1.75} />
                Respostas salvas
              </>
            ) : (
              <>
                <Save aria-hidden="true" size={18} strokeWidth={1.75} />
                Salvar respostas
              </>
            )}
          </button>

          <span className="tabular min-w-0 break-words text-center text-xs leading-5 text-outline sm:text-left">
            {feitas} de {campos.length} respondidas
            {pendentes > 0
              ? ` · ${pendentes} obrigatória${pendentes > 1 ? "s" : ""} em falta`
              : ""}
          </span>
        </div>
      )}

      {pendentes > 0 && !somenteLeitura ? (
        <p className="break-words text-xs leading-5 text-atencao">
          Dá para salvar assim mesmo e completar depois.
        </p>
      ) : null}
    </form>
  );
}
