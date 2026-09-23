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
      className="flex min-w-0 flex-col gap-1.5"
    >
      <legend id={idRotulo} className="rotulo mb-1.5">
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

      {children}

      {dica ? (
        <p id={idDica} className="text-xs text-outline">
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
    "rounded-[var(--radius-cartao)] border text-sm text-on-surface transition-colors",
    somenteLeitura ? "cursor-not-allowed" : "cursor-pointer",
    marcada
      ? "border-primary bg-secondary-fixed"
      : cn("border-outline-variant bg-surface", !somenteLeitura && "hover:border-primary"),
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
              "inline-flex h-10 min-w-20 items-center justify-center gap-2 px-4 font-medium",
              classeDaOpcao(marcada, somenteLeitura),
            )}
          >
            {/* Rádio nativo, e não botão: o estado "marcado" e a navegação por
                setas vêm do navegador, sem ARIA para manter à mão. */}
            <input
              type="radio"
              name={nome}
              value={opcao.valor}
              checked={marcada}
              onChange={() => aoMudar(opcao.valor)}
              // Clicar de novo no que já está marcado limpa a resposta: sem
              // isso, uma pergunta não obrigatória marcada por engano ficaria
              // marcada para sempre. O rádio já marcado não dispara `change`,
              // por isso o clique.
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
    <div className="flex flex-col gap-2">
      {campo.opcoes.map((opcao) => {
        const marcada = marcadas.includes(opcao);

        return (
          <label
            key={opcao}
            className={cn(
              "flex items-start gap-2.5 px-3.5 py-2.5",
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
                // Mesmo gesto do sim/não: clicar na marcada limpa a resposta.
                onClick={() => {
                  if (marcada) aoMudar("");
                }}
                className={cn("mt-0.5", CONTROLE_DA_OPCAO)}
              />
            )}
            {opcao}
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

  // Instantâneo do que está na tela, para contar pendências enquanto digita.
  const naTela: CampoRespondido[] = campos.map((campo) => {
    const valor = valores[campo.chave];
    return campo.tipo === "escolha_multipla"
      ? { ...campo, respostas: Array.isArray(valor) ? valor : [] }
      : { ...campo, resposta: typeof valor === "string" ? valor : null };
  });

  const pendentes = obrigatoriasPendentes(naTela);
  const feitas = respondidas(naTela);

  function mudar(chave: string, valor: Valor) {
    setValores((atuais) => ({ ...atuais, [chave]: valor }));
    setSalvo(false);
    setErro(null);
  }

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    if (salvando) return;

    // O banco recusaria de qualquer jeito; aqui a recusa chega antes, junto
    // do campo, e em português.
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
      <p className="text-sm text-outline">
        Este documento não tem perguntas.
      </p>
    );
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-6">
      <div className="flex flex-col gap-6">
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
            <Campo
              key={campo.chave}
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
          );
        })}
      </div>

      {erro ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-[var(--radius-cartao)] border border-error/25 bg-error-container px-3.5 py-2.5 text-sm text-on-error-container"
        >
          <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          {erro}
        </p>
      ) : null}

      {somenteLeitura ? null : (
        <div className="flex flex-wrap items-center gap-3 border-t border-card-border pt-5">
          <button
            type="submit"
            disabled={salvando}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-controle)] bg-primary-container px-6 text-sm font-medium text-on-primary transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-55"
          >
            {salvando ? (
              <>
                <LoaderCircle aria-hidden="true" size={18} className="animate-spin" />
                Salvando…
              </>
            ) : salvo ? (
              <>
                <Check aria-hidden="true" size={18} strokeWidth={1.75} />
                Salvo
              </>
            ) : (
              <>
                <Save aria-hidden="true" size={18} strokeWidth={1.75} />
                Salvar respostas
              </>
            )}
          </button>

          <span className="tabular text-xs text-outline">
            {feitas} de {campos.length} respondidas
            {pendentes > 0
              ? ` · ${pendentes} obrigatória${pendentes > 1 ? "s" : ""} em falta`
              : ""}
          </span>
        </div>
      )}

      {/* Pendência não trava o salvamento: anamnese se preenche aos poucos, e
          guardar metade é melhor do que perder tudo porque falta uma. */}
      {pendentes > 0 && !somenteLeitura ? (
        <p className="text-xs text-atencao">
          Dá para salvar assim mesmo e completar depois.
        </p>
      ) : null}
    </form>
  );
}
