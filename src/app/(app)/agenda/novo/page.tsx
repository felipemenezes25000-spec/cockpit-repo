import { CalendarClock, CalendarPlus, Sparkles, UserRoundCheck } from "lucide-react";
import type { Metadata } from "next";
import { FormularioAtendimento } from "@/components/agenda/formulario-atendimento";
import {
  enderecoDaAgenda,
  lerChaveDoDia,
  lerProfissional,
} from "@/components/agenda/parametros-agenda";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";
import { chaveDoDia, hoje } from "@/lib/dates";
import { formatarTelefone } from "@/lib/paciente";
import { marcarAtendimento, type PacienteParaSelecao } from "@/server/acoes/agenda";
import { catalogoAgenda } from "@/server/consultas/agenda";
import { pacientePorId } from "@/server/consultas/pacientes";

export const metadata: Metadata = {
  title: "Marcar atendimento",
  description: "Novo horário na agenda da clínica.",
};

function lerTexto(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

function Nota({ icone: Icone, titulo, texto }: { icone: typeof CalendarClock; titulo: string; texto: string }) {
  return (
    <div className="rounded-[var(--radius-controle)] border border-card-border bg-surface px-3.5 py-3">
      <div className="flex items-center gap-2 text-primary">
        <Icone aria-hidden="true" size={14} strokeWidth={1.75} />
        <p className="text-xs font-semibold">{titulo}</p>
      </div>
      <p className="mt-1.5 text-xs leading-5 text-outline">{texto}</p>
    </div>
  );
}

export default async function PaginaNovoAtendimento({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametros = await searchParams;
  const diaSugerido = lerChaveDoDia(parametros.dia);
  const profissionalSugerida = lerProfissional(parametros.profissional);
  const pacienteId = lerTexto(parametros.paciente);

  let pacienteInicial: PacienteParaSelecao | null = null;
  if (/^[0-9a-f-]{36}$/i.test(pacienteId)) {
    const paciente = await pacientePorId(pacienteId);
    if (paciente) {
      pacienteInicial = {
        id: paciente.id,
        nome: paciente.exibicao,
        detalhe:
          [
            paciente.telefone ? formatarTelefone(paciente.telefone) : null,
            paciente.email,
          ]
            .filter(Boolean)
            .join(" · ") || "sem contato cadastrado",
      };
    }
  }

  const catalogo = await catalogoAgenda();
  const profissionalInicial = catalogo.profissionais.some((p) => p.id === profissionalSugerida)
    ? (profissionalSugerida ?? "")
    : "";
  const voltarPara = enderecoDaAgenda(diaSugerido, profissionalInicial || null);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <LinkDeVoltar href={voltarPara}>Voltar para a agenda</LinkDeVoltar>

      <CabecalhoDePagina
        icone={CalendarPlus}
        rotulo="Agenda"
        titulo="Marcar atendimento"
        descricao="Monte o horário com contexto completo sem perder o ritmo da agenda. Procedimento, duração e valor continuam seguindo a tabela da clínica."
        meta={
          <>
            <SeloHero tom="informativo">Duração e valor assistidos</SeloHero>
            {pacienteInicial ? <SeloHero tom="positivo">Paciente já selecionada</SeloHero> : null}
          </>
        }
      />

      <Card>
        <CardCabecalho
          titulo="Detalhes do horário"
          descricao="Escolher o procedimento preenche a duração e o valor da tabela; revise antes de salvar."
        />
        <CardCorpo className="py-7 sm:py-8">
          <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-w-0">
              <FormularioAtendimento
                acao={marcarAtendimento}
                catalogo={catalogo}
                pacienteInicial={pacienteInicial}
                inicial={{
                  data: diaSugerido ?? chaveDoDia(hoje()),
                  hora: "",
                  profissional_id: profissionalInicial,
                  procedimento_id: "",
                  duracao_min: "60",
                  valor: "",
                  observacoes: "",
                }}
                rotuloSalvar="Marcar atendimento"
                cancelarPara={voltarPara}
                filtroProfissional={profissionalInicial || null}
              />
            </div>

            <aside className="integridade-cabine p-4 sm:p-5 xl:sticky xl:top-28">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-[var(--radius-controle)] bg-selecao text-primary">
                  <Sparkles aria-hidden="true" size={17} strokeWidth={1.75} />
                </span>
                <div>
                  <p className="rotulo text-primary">Agendamento assistido</p>
                  <h2 className="mt-1 text-base font-semibold text-on-surface">Menos digitação, mais conferência</h2>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                <Nota icone={UserRoundCheck} titulo="Paciente vinculada" texto="O horário nasce ligado à ficha certa e fica disponível no histórico da paciente." />
                <Nota icone={CalendarClock} titulo="Duração pela tabela" texto="O procedimento sugere duração e valor; ajuste somente quando este caso realmente pedir." />
                <Nota icone={Sparkles} titulo="Conflitos protegidos" texto="A validação do servidor impede sobreposição inválida e devolve o formulário sem apagar o que foi preenchido." />
              </div>
            </aside>
          </div>
        </CardCorpo>
      </Card>
    </div>
  );
}
