"use client";

import { LoaderCircle, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ENTRADA } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import type { FiltroSituacao } from "@/server/consultas/pacientes";

const FILTROS: { valor: FiltroSituacao; rotulo: string }[] = [
  { valor: "ativas", rotulo: "Ativas" },
  { valor: "arquivadas", rotulo: "Arquivadas" },
  { valor: "todas", rotulo: "Todas" },
];

/**
 * Busca e filtro da listagem, guardados na própria URL.
 *
 * Estado na URL e não em memória: a recepção pode deixar a busca aberta em uma
 * aba, recarregar ou mandar o link para outra pessoa e chegar na mesma tela.
 *
 * O formulário é um `form method="get"` de verdade — sem JavaScript, o Enter
 * ainda busca. Com JavaScript, a digitação navega sozinha depois de uma pausa.
 */
export function BuscaPacientes({
  busca,
  situacao,
  total,
}: {
  busca: string;
  situacao: FiltroSituacao;
  total: number;
}) {
  const router = useRouter();
  const parametros = useSearchParams();
  const [pendente, iniciar] = useTransition();
  const [termo, setTermo] = useState(busca);

  // A URL pode mudar por fora (voltar no navegador, clicar num filtro).
  useEffect(() => setTermo(busca), [busca]);

  const primeiraRenderizacao = useRef(true);

  function navegar(novoTermo: string, novaSituacao: FiltroSituacao) {
    const query = new URLSearchParams(parametros?.toString() ?? "");

    if (novoTermo.trim()) query.set("busca", novoTermo.trim());
    else query.delete("busca");

    if (novaSituacao !== "ativas") query.set("situacao", novaSituacao);
    else query.delete("situacao");

    // Mudou o critério: a página 3 do resultado anterior não quer dizer nada.
    query.delete("pagina");

    const texto = query.toString();
    iniciar(() => router.replace(texto ? `/pacientes?${texto}` : "/pacientes"));
  }

  // Espera a pessoa parar de digitar antes de consultar o banco.
  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }
    if (termo === busca) return;

    const relogio = setTimeout(() => navegar(termo, situacao), 350);
    return () => clearTimeout(relogio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termo]);

  return (
    <form
      method="get"
      action="/pacientes"
      onSubmit={(evento) => {
        evento.preventDefault();
        navegar(termo, situacao);
      }}
      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="relative w-full sm:max-w-md">
        <Search
          aria-hidden="true"
          size={18}
          strokeWidth={1.5}
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-outline"
        />
        <input
          type="search"
          name="busca"
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
          maxLength={80}
          aria-label="Buscar paciente por nome, telefone, e-mail ou CPF"
          placeholder="Buscar por nome, telefone, e-mail ou CPF"
          className={cn(ENTRADA, "pr-10 pl-11")}
        />

        {termo ? (
          <button
            type="button"
            onClick={() => {
              setTermo("");
              navegar("", situacao);
            }}
            aria-label="Limpar busca"
            className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-[var(--radius-tag)] text-outline transition-colors hover:bg-surface-container-low hover:text-primary"
          >
            <X aria-hidden="true" size={16} strokeWidth={1.75} />
          </button>
        ) : null}

        {pendente ? (
          <LoaderCircle
            aria-hidden="true"
            size={16}
            className="absolute top-1/2 -right-6 -translate-y-1/2 animate-spin text-outline"
          />
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <span aria-live="polite" className="text-xs text-outline tabular">
          {total === 1 ? "1 paciente" : `${total} pacientes`}
        </span>

        {/* Grupo de rádio, não abas: sem JavaScript ainda dá para escolher e enviar. */}
        <div
          role="group"
          aria-label="Filtrar por situação"
          className="flex rounded-[var(--radius-controle)] border border-outline-variant p-0.5"
        >
          {FILTROS.map((filtro) => {
            const ativo = filtro.valor === situacao;
            return (
              <label
                key={filtro.valor}
                className={cn(
                  "cursor-pointer rounded-[var(--radius-cartao)] px-3 py-1.5 text-xs font-medium transition-colors",
                  ativo
                    ? "bg-secondary-fixed text-primary"
                    : "text-on-surface-variant hover:text-primary",
                )}
              >
                <input
                  type="radio"
                  name="situacao"
                  value={filtro.valor}
                  checked={ativo}
                  onChange={() => navegar(termo, filtro.valor)}
                  className="sr-only"
                />
                {filtro.rotulo}
              </label>
            );
          })}
        </div>
      </div>
    </form>
  );
}
