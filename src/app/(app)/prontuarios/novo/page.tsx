import { FileText } from "lucide-react";
import type { Metadata } from "next";
import { AcessoRestritoProntuario } from "@/components/prontuarios/acesso-restrito";
import { FormularioProntuario } from "@/components/prontuarios/formulario-prontuario";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";
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
  const cancelarPara = paciente ? `/pacientes/${paciente.id}` : "/prontuarios";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <LinkDeVoltar href="/prontuarios">Voltar para prontuários</LinkDeVoltar>

      <CabecalhoDePagina
        icone={FileText}
        rotulo="Prontuário clínico"
        titulo="Criar registro inicial"
        descricao="Estruture o registro clínico com leitura confortável e histórico preservado. Ao salvar, nasce a versão 1 do prontuário."
        meta={
          <>
            <SeloHero tom="informativo">Versão 1</SeloHero>
            {paciente ? <SeloHero tom="positivo">Paciente selecionada: {paciente.nome}</SeloHero> : null}
            {atendimento ? <SeloHero>Vinculado a atendimento</SeloHero> : null}
          </>
        }
      />

      <Card>
        <CardCabecalho
          titulo="Registro clínico"
          descricao="Revise paciente, data e conteúdo clínico antes de criar a primeira versão."
        />
        <CardCorpo className="py-7 sm:py-8">
          <FormularioProntuario
            acao={criarProntuario}
            modo="novo"
            pacienteInicial={paciente}
            atendimentoInicial={atendimento}
            dataPadrao={atendimento?.dataRegistro ?? chaveDoDia(hoje())}
            cancelarPara={cancelarPara}
            rotuloSalvar="Salvar prontuário"
          />
        </CardCorpo>
      </Card>
    </div>
  );
}
