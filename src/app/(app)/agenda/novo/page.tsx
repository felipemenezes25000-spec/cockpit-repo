import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FormularioAtendimento } from "@/components/agenda/formulario-atendimento";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
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

  const diaSugerido = lerTexto(parametros.dia);
  const pacienteId = lerTexto(parametros.paciente);

  // Marcado a partir da ficha: a paciente já vem escolhida.
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
  const voltarPara = diaSugerido ? `/agenda?dia=${diaSugerido}` : "/agenda";

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={voltarPara}
        className="mb-6 inline-flex items-center gap-2 text-sm text-on-surface-variant transition-colors hover:text-primary"
      >
        <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
        Voltar para a agenda
      </Link>

      <Card>
        <CardCabecalho
          titulo="Marcar atendimento"
          descricao="Escolher o procedimento preenche a duração e o valor da tabela."
        />
        <CardCorpo className="py-8">
          <FormularioAtendimento
            acao={marcarAtendimento}
            catalogo={catalogo}
            pacienteInicial={pacienteInicial}
            inicial={{
              data: /^\d{4}-\d{2}-\d{2}$/.test(diaSugerido)
                ? diaSugerido
                : chaveDoDia(hoje()),
              hora: "",
              profissional_id: "",
              procedimento_id: "",
              duracao_min: "60",
              valor: "",
              observacoes: "",
            }}
            rotuloSalvar="Marcar atendimento"
            cancelarPara={voltarPara}
          />
        </CardCorpo>
      </Card>
    </div>
  );
}
