import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormularioProcedimento } from "@/components/configuracoes/formulario-procedimento";
import {
  EXPLICACAO_PROCEDIMENTOS,
  SomenteAdministradora,
} from "@/components/configuracoes/somente-administradora";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { ehAdministradora } from "@/lib/auth";
import { valorParaCampo } from "@/lib/procedimento";
import { atualizarProcedimento } from "@/server/acoes/procedimentos";
import { procedimentoPorId } from "@/server/consultas/procedimentos";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const procedimento = await procedimentoPorId(id);
  return { title: procedimento ? `Editar ${procedimento.nome}` : "Procedimento" };
}

export default async function PaginaEditarProcedimento({ params }: Props) {
  if (!(await ehAdministradora())) {
    return <SomenteAdministradora
        voltarPara="/configuracoes/procedimentos"
        explicacao={EXPLICACAO_PROCEDIMENTOS}
      />;
  }

  const { id } = await params;
  const procedimento = await procedimentoPorId(id);
  if (!procedimento) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/configuracoes/procedimentos"
        className="mb-6 inline-flex min-h-6 items-center gap-2 text-sm text-on-surface-variant transition-colors hover:text-primary"
      >
        <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
        Voltar para a tabela
      </Link>

      <Card>
        <CardCabecalho
          titulo={procedimento.nome}
          descricao={
            procedimento.usos > 0
              ? `Usado em ${procedimento.usos} ${procedimento.usos === 1 ? "atendimento" : "atendimentos"}. Mudar aqui não altera o que já foi marcado — só o padrão das próximas marcações.`
              : "Ainda sem atendimento marcado com este procedimento."
          }
        />
        <CardCorpo className="py-8">
          <FormularioProcedimento
            acao={atualizarProcedimento}
            procedimentoId={procedimento.id}
            inicial={{
              nome: procedimento.nome,
              duracao_min: String(procedimento.duracaoMin),
              valor_padrao: valorParaCampo(procedimento.valorPadrao),
              retorno_sugerido_dias: procedimento.retornoSugeridoDias
                ? String(procedimento.retornoSugeridoDias)
                : "",
            }}
            rotuloSalvar="Salvar alterações"
            cancelarPara="/configuracoes/procedimentos"
          />
        </CardCorpo>
      </Card>
    </div>
  );
}
