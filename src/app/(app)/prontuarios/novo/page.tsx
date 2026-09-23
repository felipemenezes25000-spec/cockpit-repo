import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AcessoRestritoProntuario } from "@/components/prontuarios/acesso-restrito";
import { FormularioProntuario } from "@/components/prontuarios/formulario-prontuario";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { ehAdministradora } from "@/lib/auth";
import { chaveDoDia, hoje } from "@/lib/dates";
import { criarProntuario } from "@/server/acoes/prontuarios";
import {
  atendimentoParaProntuario,
  pacienteParaProntuario,
} from "@/server/consultas/prontuarios";

export const metadata: Metadata = {
  title: "Novo prontuário",
  description: "Registro clínico inicial de uma paciente.",
};

function lerId(valor: string | string[] | undefined): string {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  return (texto ?? "").slice(0, 36);
}

export default async function PaginaNovoProntuario({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const administradora = await ehAdministradora();

  if (!administradora) {
    return (
      <div>
        <AcessoRestritoProntuario />
      </div>
    );
  }

  const parametros = await searchParams;
  const atendimentoId = lerId(parametros.atendimento);
  const pacienteId = lerId(parametros.paciente);

  const atendimento = atendimentoId
    ? await atendimentoParaProntuario(atendimentoId)
    : null;
  const paciente = atendimento?.paciente ?? (
    pacienteId ? await pacienteParaProntuario(pacienteId) : null
  );

  return (
    <div>
      <Link
        href="/prontuarios"
        className="mb-6 inline-flex min-h-6 items-center gap-2 text-sm text-on-surface-variant transition-colors hover:text-primary"
      >
        <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
        Voltar para prontuários
      </Link>

      <Card>
        <CardCabecalho
          titulo="Novo prontuário"
          descricao="Registro clínico inicial, salvo com versão 1."
        />
        <CardCorpo>
          <FormularioProntuario
            acao={criarProntuario}
            modo="novo"
            pacienteInicial={paciente}
            atendimentoInicial={atendimento}
            dataPadrao={atendimento?.dataRegistro ?? chaveDoDia(hoje())}
            cancelarPara={paciente ? `/pacientes/${paciente.id}` : "/prontuarios"}
            rotuloSalvar="Salvar prontuário"
          />
        </CardCorpo>
      </Card>
    </div>
  );
}
