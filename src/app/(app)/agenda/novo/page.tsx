import { CalendarPlus } from "lucide-react";
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
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
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
        </CardCorpo>
      </Card>
    </div>
  );
}
