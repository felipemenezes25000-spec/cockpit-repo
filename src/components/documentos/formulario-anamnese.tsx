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

function PerguntaSimNao({
  valor,
  aoMudar,
}: {
  valor: string;
  aoMudar: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {[
        { v: "sim", r: "Sim" },
        { v: "nao", r: "Não" },
      ].map((opcao) => (
        <button
          key={opcao.v}
          type="button"
          // Clicar de novo no que já está marcado limpa a resposta: sem isso,
          // uma pergunta não obrigatória marcada por engano ficaria marcada
          // para sempre.
          onClick={() => aoMudar(valor === opcao.v ? "" : opcao.v)}
          className={cn(
            "inline-flex h-10 min-w-20 items-center justify-center rounded-[var(--radius-cartao)] border px-4 text-sm font-medium transition-colors",
            valor === opcao.v
              ? "border-primary bg-primary-container text-on-primary"
              : "border-outline-variant bg-surface text-on-surface hover:border-primary hover:text-primary",
          )}
        >
          {opcao.r}
        </button>
      ))}
    </div>
  );
}

function PerguntaEscolha({
  campo,
  valor,
  aoMudar,
  multipla,
}: {
  campo: CampoRespondido;
  valor: Valor;
  aoMudar: (v: Valor) => void;
  multipla: boolean;
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
              "flex cursor-pointer items-start gap-2.5 rounded-[var(--radius-cartao)] border px-3.5 py-2.5 text-sm transition-colors",
              marcada
                ? "border-primary bg-secondary-fixed text-on-surface"
                : "border-outline-variant bg-surface text-on-surface hover:border-primary",
            )}
          >
            <input
              type={multipla ? "checkbox" : "radio"}
              name={campo.chave}
              checked={marcada}
              onChange={() => {
                if (multipla) {
                  aoMudar(
                    marcada
                      ? marcadas.filter((m) => m !== opcao)
                      : [...marcadas, opcao],
                  );
                } else {
                  aoMudar(marcada ? "" : opcao);
                }
              }}
              className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary-container)]"
            />
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
      else if (situacao === "expirado" || situacao === "revogado")
        setErro("Este link não vale mais. Peça um novo à clínica.");
      else if (situacao === "respostas_invalidas")
        setErro("Alguma resposta não foi aceita. Revise as alternativas marcadas.");
      else setErro("Não foi possível salvar. Tente de novo.");
    }

    setSalvando(false);
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

          return (
            <Campo
              key={campo.chave}
              id={idCampo}
              rotulo={`${indice + 1}. ${campo.rotulo}`}
              obrigatorio={campo.obrigatorio}
              dica={campo.ajuda || undefined}
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
              ) : campo.tipo === "sim_nao" ? (
                <PerguntaSimNao
                  valor={typeof valor === "string" ? valor : ""}
                  aoMudar={(v) => mudar(campo.chave, v)}
                />
              ) : campo.tipo === "escolha_unica" ||
                campo.tipo === "escolha_multipla" ? (
                <PerguntaEscolha
                  campo={campo}
                  valor={valor ?? ""}
                  multipla={campo.tipo === "escolha_multipla"}
                  aoMudar={(v) => mudar(campo.chave, v)}
                />
              ) : (
                <input
                  id={idCampo}
                  type={
                    campo.tipo === "data"
                      ? "date"
                      : campo.tipo === "numero"
                        ? "text"
                        : "text"
                  }
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
