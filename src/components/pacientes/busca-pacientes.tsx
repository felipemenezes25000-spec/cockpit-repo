"use client";

import { LoaderCircle, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { classeDeEntrada } from "@/components/ui/field";
import { classeDaOpcao, SEGMENTO_GRUPO } from "@/components/ui/segmento";
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

  // O último termo que esta caixa mandou para a URL. Quando a URL responde com
  // ele, nada muda na caixa: a pessoa pode ter seguido digitando enquanto a
  // consulta rodava, e a URL chega sem o espaço final ("ana " vira "ana") —
  // sobrescrever apagaria o que ela acabou de digitar.
  const [enviada, setEnviada] = useState(busca);
  const [buscaAnterior, setBuscaAnterior] = useState(busca);

  // A URL pode mudar por fora (voltar no navegador, link colado): aí sim a
  // caixa acompanha. Ajuste feito na renderização, como o React recomenda
  // para estado derivado de prop.
  if (busca !== buscaAnterior) {
    setBuscaAnterior(busca);
    if (busca !== enviada) {
      setTermo(busca);
      setEnviada(busca);
    }
  }

  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancelarEspera() {
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = null;
  }

  // Saiu da tela com uma busca agendada: ela não deve navegar depois.
  useEffect(() => {
    const espera = relogio;
    return () => {
      if (espera.current) clearTimeout(espera.current);
    };
  }, []);

  function navegar(novoTermo: string, novaSituacao: FiltroSituacao) {
    cancelarEspera();
    const query = new URLSearchParams(parametros?.toString() ?? "");
    const limpo = novoTermo.trim();

    if (limpo) query.set("busca", limpo);
    else query.delete("busca");

    if (novaSituacao !== "ativas") query.set("situacao", novaSituacao);
    else query.delete("situacao");

    // Mudou o critério: a página 3 do resultado anterior não quer dizer nada.
    query.delete("pagina");

    setEnviada(limpo);
    const texto = query.toString();
    iniciar(() => router.replace(texto ? `/pacientes?${texto}` : "/pacientes"));
  }

  // Espera a pessoa parar de digitar antes de consultar o banco.
  function digitar(valor: string) {
    setTermo(valor);
    cancelarEspera();
    if (valor.trim() === enviada) return;
    relogio.current = setTimeout(() => navegar(valor, situacao), 350);
  }

  return (
    <form
      method="get"
      action="/pacientes"
      onSubmit={(evento) => {
        evento.preventDefault();
        navegar(termo, situacao);
      }}
      className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="relative w-full lg:max-w-md">
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
          onChange={(evento) => digitar(evento.target.value)}
          maxLength={80}
          aria-label="Buscar paciente por nome, telefone, e-mail ou CPF"
          placeholder="Buscar por nome, telefone, e-mail ou CPF"
          className={classeDeEntrada({ recuo: "busca" })}
        />

        {/* Carregando ocupa o lugar do "limpar", dentro da caixa: fora dela,
            a 360 px o ícone passava da borda do cartão. */}
        {pendente ? (
          <LoaderCircle
            aria-hidden="true"
            size={16}
            className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 animate-spin text-outline"
          />
        ) : termo ? (
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
      </div>

      {/* Contador e segmento quebram entre si, nunca por dentro: a 320 px o
          segmento cortava "Todas" e, a 768, "33 pacientes" ia para duas linhas. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span aria-live="polite" className="text-xs whitespace-nowrap text-outline tabular">
          {total === 1 ? "1 paciente" : `${total} pacientes`}
        </span>

        {/* Grupo de rádio, não abas: sem JavaScript ainda dá para escolher e enviar. */}
        <div
          role="group"
          aria-label="Filtrar por situação"
          className={SEGMENTO_GRUPO}
        >
          {FILTROS.map((filtro) => {
            const ativo = filtro.valor === situacao;
            return (
              <label key={filtro.valor} className={classeDaOpcao(ativo)}>
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
