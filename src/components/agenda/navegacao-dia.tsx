"use client";

import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { enderecoDaAgenda } from "./parametros-agenda";
import { classeDeEntrada } from "@/components/ui/field";
import { dataValida } from "@/lib/dates";
import { cn } from "@/lib/cn";
import type { OpcaoProfissional } from "@/server/consultas/agenda";

/** Espera entre a última tecla no campo de data e a navegação. */
export const ESPERA_NAVEGACAO_MS = 500;

const semAssinatura = () => () => {};

/**
 * Verdadeiro depois da hidratação, falso no HTML do servidor — sem efeito e
 * sem estado, então não há renderização dupla nem aviso de divergência.
 */
function useComJavaScript(): boolean {
  return useSyncExternalStore(
    semAssinatura,
    () => true,
    () => false,
  );
}

/** Seta que troca o ícone pelo indicador enquanto o dia vizinho carrega. */
function IconeDaSeta({ direcao }: { direcao: "anterior" | "proximo" }) {
  const { pending } = useLinkStatus();
  if (pending) return <LoaderCircle aria-hidden="true" size={18} className="animate-spin" />;
  const Icone = direcao === "anterior" ? ChevronLeft : ChevronRight;
  return <Icone aria-hidden="true" size={18} strokeWidth={1.75} />;
}

/**
 * Navegação entre dias e filtro de profissional, tudo na URL:
 * `?dia=AAAA-MM-DD&profissional=<id>`.
 *
 * Recarregar, voltar pelo navegador e mandar o link de um dia específico
 * funcionam — mesmo raciocínio da busca de pacientes. É um `form method="get"`
 * de verdade: sem JavaScript, o botão "Ver" (que só aparece nesse caso) envia.
 *
 * O campo de data NÃO navega a cada tecla. Digitando "2026" no ano, o
 * navegador passa por "0002", "0020" e "0202" — cada um viraria uma ida ao
 * servidor e uma entrada no histórico. A navegação espera a pessoa parar e só
 * acontece com uma data que existe; Enter e sair do campo navegam na hora.
 */
export function NavegacaoDia({
  dia,
  anterior,
  proximo,
  ehHoje,
  profissional = null,
  profissionais = [],
}: {
  /** "AAAA-MM-DD" do dia exibido e dos vizinhos, calculados no servidor. */
  dia: string;
  anterior: string;
  proximo: string;
  ehHoje: boolean;
  /** Profissional filtrada, ou `null` para a agenda de todas. */
  profissional?: string | null;
  /** Com uma só, o filtro não aparece — não haveria o que escolher. */
  profissionais?: OpcaoProfissional[];
}) {
  const router = useRouter();
  const comJavaScript = useComJavaScript();
  const [pendente, iniciar] = useTransition();
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Clique numa seta com uma data digitada: o blur do campo (que navega para
  // a data digitada) e o clique (que vai ao vizinho do dia antigo) disparavam
  // duas navegações concorrentes. O `pointerdown` da seta vem antes do blur
  // em todo navegador — inclusive no Safari, onde o link clicado não recebe
  // foco e o `relatedTarget` do blur chega nulo —, e marca que a seta manda.
  const setaAcionada = useRef(false);

  // O campo segue a URL: voltar pelo navegador ou clicar numa seta troca o
  // `dia` vindo do servidor, e o que estava digitado dá lugar a ele.
  const [valor, setValor] = useState(dia);
  const [filtro, setFiltro] = useState(profissional);
  const [daUrl, setDaUrl] = useState({ dia, profissional });
  if (dia !== daUrl.dia || profissional !== daUrl.profissional) {
    setDaUrl({ dia, profissional });
    setValor(dia);
    setFiltro(profissional);
  }

  useEffect(
    () => () => {
      if (relogio.current) clearTimeout(relogio.current);
    },
    [],
  );

  function navegar(novoDia: string, novoProfissional: string | null) {
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = null;
    if (!dataValida(novoDia)) return;
    if (novoDia === dia && novoProfissional === profissional) return;
    iniciar(() => router.push(enderecoDaAgenda(novoDia, novoProfissional)));
  }

  function agendarNavegacao(novoDia: string) {
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = setTimeout(() => navegar(novoDia, filtro), ESPERA_NAVEGACAO_MS);
  }

  const seta =
    "flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-cartao)] border border-card-border bg-surface text-on-surface-variant transition-colors hover:border-primary hover:text-primary";

  const temFiltro = profissionais.length > 1;

  return (
    <form
      method="get"
      action="/agenda"
      aria-label="Escolher o dia da agenda"
      aria-busy={pendente || undefined}
      onSubmit={(evento) => {
        evento.preventDefault();
        navegar(valor, filtro);
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <div className="flex items-center gap-2">
        <Link
          href={enderecoDaAgenda(anterior, profissional)}
          aria-label="Dia anterior"
          onPointerDown={() => {
            setaAcionada.current = true;
          }}
          className={seta}
        >
          <IconeDaSeta direcao="anterior" />
        </Link>

        <input
          type="date"
          name="dia"
          value={valor}
          onChange={(evento) => {
            setValor(evento.target.value);
            agendarNavegacao(evento.target.value);
          }}
          // Marca de um clique antigo na seta (sem o campo em foco) não vale
          // para esta edição.
          onFocus={() => {
            setaAcionada.current = false;
          }}
          onBlur={() => {
            if (setaAcionada.current) {
              // A seta navega; a data digitada (e a espera dela) fica para trás.
              setaAcionada.current = false;
              if (relogio.current) clearTimeout(relogio.current);
              relogio.current = null;
              return;
            }
            navegar(valor, filtro);
          }}
          aria-label="Escolher o dia"
          className={cn(classeDeEntrada({ altura: "compacta", largura: "auto" }), "tabular")}
        />

        <Link
          href={enderecoDaAgenda(proximo, profissional)}
          aria-label="Dia seguinte"
          onPointerDown={() => {
            setaAcionada.current = true;
          }}
          className={seta}
        >
          <IconeDaSeta direcao="proximo" />
        </Link>
      </div>

      {temFiltro ? (
        <select
          name="profissional"
          value={filtro ?? ""}
          onChange={(evento) => {
            const escolhido = evento.target.value || null;
            setFiltro(escolhido);
            navegar(valor, escolhido);
          }}
          aria-label="Filtrar por quem atende"
          // Nome comprido não empurra a tela para o lado em 360 px.
          className={cn(classeDeEntrada({ altura: "compacta", largura: "auto" }), "max-w-full")}
        >
          <option value="">Todas as profissionais</option>
          {profissionais.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      ) : profissional ? (
        // Filtro que veio no link, sem seletor na tela: continua valendo.
        <input type="hidden" name="profissional" value={profissional} />
      ) : null}

      {comJavaScript ? null : (
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-[var(--radius-cartao)] border border-card-border bg-surface px-3 text-sm font-medium text-primary transition-colors hover:bg-surface-container-low"
        >
          Ver
        </button>
      )}

      {!ehHoje ? (
        <Link
          href={enderecoDaAgenda(null, profissional)}
          className="inline-flex h-9 items-center rounded-[var(--radius-cartao)] px-3 text-sm font-medium text-primary transition-colors hover:bg-surface-container-low"
        >
          Voltar para hoje
        </Link>
      ) : null}

      <p role="status" className="inline-flex items-center gap-1.5 text-xs text-outline">
        {pendente ? (
          <>
            <LoaderCircle aria-hidden="true" size={14} className="animate-spin" />
            Carregando a agenda…
          </>
        ) : null}
      </p>
    </form>
  );
}
