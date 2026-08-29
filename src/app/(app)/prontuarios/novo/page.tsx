import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { FaixaDemonstracao } from "@/components/layout/demo-badge";
import { AcessoRestritoProntuario } from "@/components/prontuarios/acesso-restrito";
import { FormularioProntuario } from "@/components/prontuarios/formulario-prontuario";
import { BotaoLink } from "@/components/ui/button";
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
        <FaixaDemonstracao className="mb-8" />
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
      <FaixaDemonstracao className="mb-8" />

      <div className="mb-4">
        <BotaoLink href="/prontuarios" variante="contorno" tamanho="sm">
          <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
          Prontuários
        </BotaoLink>
      </div>

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
