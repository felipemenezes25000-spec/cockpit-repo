"use client";

import { CalendarCheck, CircleAlert, Info } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { SeletorPaciente } from "./seletor-paciente";
import { AREA_TEXTO, Campo, ENTRADA, ENTRADA_ERRO } from "@/components/ui/field";
import { BotaoDeAcao } from "@/components/ui/formulario-acao";
import { cn } from "@/lib/cn";
import type {
  CatalogoAgenda,
  OpcaoProcedimento,
} from "@/server/consultas/agenda";
import type {
  EstadoAtendimento,
  PacienteParaSelecao,
} from "@/server/acoes/agenda";

type Acao = (estado: EstadoAtendimento, dados: FormData) => Promise<EstadoAtendimento>;

const INICIAL: EstadoAtendimento = { erros: {} };

export type ValoresAtendimento = {
  data: string;
  hora: string;
  profissional_id: string;
  procedimento_id: string;
  duracao_min: string;
  valor: string;
  observacoes: string;
};

function BotaoSalvar({ rotulo, indisponivel }: { rotulo: string; indisponivel: boolean }) {
  return (
    <BotaoDeAcao
      tom="primario"
      tamanho="md"
      icone={<CalendarCheck size={18} strokeWidth={1.75} />}
      rotuloPendente="Salvando…"
      indisponivel={indisponivel}
      motivoIndisponivel={indisponivel ? "Cadastre ao menos uma profissional e um procedimento ativo antes de salvar." : undefined}
    >
      {rotulo}
    </BotaoDeAcao>
  );
}

export function FormularioAtendimento({
  acao,
  catalogo,
  inicial,
  pacienteInicial,
  atendimentoId,
  rotuloSalvar,
  cancelarPara,
  filtroProfissional,
}: {
  acao: Acao;
  catalogo: CatalogoAgenda;
  inicial: ValoresAtendimento;
  /** Já resolvida quando se marca a partir da ficha ou se edita. */
  pacienteInicial: PacienteParaSelecao | null;
  atendimentoId?: string;
  rotuloSalvar: string;
  cancelarPara: string;
  /**
   * O filtro de profissional que estava na agenda de onde se veio. Vai num
   * campo oculto para o redirect depois de salvar voltar à mesma agenda.
   */
  filtroProfissional?: string | null;
}) {
  const [estado, enviar] = useActionState(acao, INICIAL);

  const de = (campo: keyof ValoresAtendimento) =>
    estado.valores?.[campo] ?? inicial[campo];

  // Escolher o procedimento preenche duração e valor da tabela — editáveis,
  // porque caso a caso o combinado pode ser outro.
  const [duracao, setDuracao] = useState(de("duracao_min"));
  const [valor, setValor] = useState(de("valor"));

  function aoTrocarProcedimento(id: string) {
    const procedimento: OpcaoProcedimento | undefined =
      catalogo.procedimentos.find((p) => p.id === id);
    if (!procedimento) return;
    setDuracao(String(procedimento.duracaoMin));
    setValor(
      procedimento.valorPadrao > 0
        ? procedimento.valorPadrao.toFixed(2).replace(".", ",")
        : "",
    );
  }

  const erros = estado.erros;
  const marcar = (campo: keyof typeof erros) =>
    erros[campo] ? ({ "aria-invalid": true as const } as const) : {};

  // Recusado pelo servidor: o foco vai para o primeiro campo com erro (a frase
  // está ligada a ele e é lida junto) ou, sem campo, para o aviso geral. Sem
  // isto, quem usa teclado ficava no botão sem saber o que corrigir.
  const formulario = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (Object.keys(estado.erros).length === 0) return;
    const alvo =
      formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]') ??
      formulario.current?.querySelector<HTMLElement>("[data-erro-geral]");
    alvo?.focus();
  }, [estado]);

  // Sem profissional ou sem procedimento ativo, nada pode ser marcado: a
  // tela diz o que falta em vez de devolver "Escolha…" a cada envio.
  const semProfissional = catalogo.profissionais.length === 0;
  const semProcedimento = catalogo.procedimentos.length === 0;

  return (
    <form ref={formulario} action={enviar} className="flex flex-col gap-6" noValidate>
      {atendimentoId ? <input type="hidden" name="id" value={atendimentoId} /> : null}
      {filtroProfissional ? (
        <input type="hidden" name="filtro_profissional" value={filtroProfissional} />
      ) : null}

      {semProfissional || semProcedimento ? (
        <div className="flex items-start gap-2 rounded-[var(--radius-cartao)] border border-atencao-borda bg-atencao-fundo px-3.5 py-2.5 text-sm text-atencao">
          <Info aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          <div className="flex flex-col gap-1">
            <p className="font-medium">Ainda não dá para marcar atendimento.</p>
            {semProcedimento ? (
              <p>
                Nenhum procedimento ativo.{" "}
                <Link href="/configuracoes/procedimentos" className="underline">
                  Cadastre em Configurações → Procedimentos
                </Link>
                .
              </p>
            ) : null}
            {semProfissional ? (
              <p>
                Nenhuma profissional ativa em “Quem atende”. A equipe ainda não tem
                tela própria: peça à administração do sistema para cadastrá-la.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {erros.geral ? (
        <p
          role="alert"
          tabIndex={-1}
          data-erro-geral
          className="flex items-start gap-2 rounded-[var(--radius-cartao)] border border-error/25 bg-error-container px-3.5 py-2.5 text-sm text-on-error-container"
        >
          <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          {erros.geral}
        </p>
      ) : null}

      <SeletorPaciente inicial={pacienteInicial} erro={erros.paciente_id} />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Campo
          id="procedimento_id"
          rotulo="Procedimento"
          obrigatorio
          erro={erros.procedimento_id}
        >
          <select
            id="procedimento_id"
            name="procedimento_id"
            required
            defaultValue={de("procedimento_id")}
            onChange={(e) => aoTrocarProcedimento(e.target.value)}
            className={cn(ENTRADA, erros.procedimento_id && ENTRADA_ERRO)}
            {...marcar("procedimento_id")}
          >
            <option value="">Escolher…</option>
            {catalogo.procedimentos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </Campo>

        <Campo
          id="profissional_id"
          rotulo="Quem atende"
          obrigatorio
          erro={erros.profissional_id}
        >
          <select
            id="profissional_id"
            name="profissional_id"
            required
            defaultValue={
              de("profissional_id") ||
              (catalogo.profissionais.length === 1 ? catalogo.profissionais[0].id : "")
            }
            className={cn(ENTRADA, erros.profissional_id && ENTRADA_ERRO)}
            {...marcar("profissional_id")}
          >
            <option value="">Escolher…</option>
            {catalogo.profissionais.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </Campo>

        <Campo id="data" rotulo="Data" obrigatorio erro={erros.data}>
          <input
            id="data"
            name="data"
            type="date"
            required
            defaultValue={de("data")}
            className={cn(ENTRADA, erros.data && ENTRADA_ERRO)}
            {...marcar("data")}
          />
        </Campo>

        <Campo id="hora" rotulo="Hora" obrigatorio erro={erros.hora}>
          <input
            id="hora"
            name="hora"
            type="time"
            required
            step={300}
            defaultValue={de("hora")}
            className={cn(ENTRADA, "tabular", erros.hora && ENTRADA_ERRO)}
            {...marcar("hora")}
          />
        </Campo>

        <Campo
          id="duracao_min"
          rotulo="Duração (minutos)"
          obrigatorio
          erro={erros.duracao_min}
          dica="Preenchida pela tabela do procedimento; ajuste se o caso pedir."
        >
          <input
            id="duracao_min"
            name="duracao_min"
            type="number"
            inputMode="numeric"
            min={5}
            max={480}
            step={5}
            required
            value={duracao}
            onChange={(e) => setDuracao(e.target.value)}
            className={cn(ENTRADA, "tabular", erros.duracao_min && ENTRADA_ERRO)}
            {...marcar("duracao_min")}
          />
        </Campo>

        <Campo
          id="valor"
          rotulo="Valor (R$)"
          erro={erros.valor}
          dica="O combinado deste atendimento. Pode diferir da tabela."
        >
          <input
            id="valor"
            name="valor"
            type="text"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
            className={cn(ENTRADA, "tabular", erros.valor && ENTRADA_ERRO)}
            {...marcar("valor")}
          />
        </Campo>
      </div>

      <Campo
        id="observacoes"
        rotulo="Observações"
        dica="Preparo, restrição de horário, o que a recepção precisa lembrar."
      >
        <textarea
          id="observacoes"
          name="observacoes"
          maxLength={2000}
          defaultValue={de("observacoes")}
          className={AREA_TEXTO}
        />
      </Campo>

      <div className="flex flex-wrap items-center gap-3 border-t border-card-border pt-6">
        <BotaoSalvar rotulo={rotuloSalvar} indisponivel={semProfissional || semProcedimento} />
        <Link
          href={cancelarPara}
          className="inline-flex h-11 items-center justify-center rounded-[var(--radius-controle)] px-6 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
        >
          Voltar sem salvar
        </Link>
      </div>
    </form>
  );
}
