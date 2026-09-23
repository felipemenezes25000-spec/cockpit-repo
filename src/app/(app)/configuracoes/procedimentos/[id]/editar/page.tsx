import { PencilLine, Stethoscope } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormularioProcedimento } from "@/components/configuracoes/formulario-procedimento";
import {
  EXPLICACAO_PROCEDIMENTOS,
  SomenteAdministradora,
} from "@/components/configuracoes/somente-administradora";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";
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
    return (
      <SomenteAdministradora
        voltarPara="/configuracoes/procedimentos"
        explicacao={EXPLICACAO_PROCEDIMENTOS}
      />
    );
  }

  const { id } = await params;
  const procedimento = await procedimentoPorId(id);
  if (!procedimento) notFound();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <LinkDeVoltar href="/configuracoes/procedimentos">Voltar para procedimentos</LinkDeVoltar>

      <CabecalhoDePagina
        icone={PencilLine}
        rotulo="Procedimento"
        titulo={procedimento.nome}
        descricao={
          procedimento.usos > 0
            ? `Este procedimento já foi usado em ${procedimento.usos} ${procedimento.usos === 1 ? "atendimento" : "atendimentos"}. As alterações abaixo passam a valer como padrão para novas marcações e não reescrevem o passado.`
            : "Este procedimento ainda não foi usado em atendimentos. Ajuste os padrões antes de colocá-lo em operação."
        }
        meta={
          <>
            <SeloHero tom={procedimento.ativo ? "positivo" : "neutro"}>{procedimento.ativo ? "Ativo na agenda" : "Fora da agenda"}</SeloHero>
            <SeloHero>{procedimento.usos} {procedimento.usos === 1 ? "uso registrado" : "usos registrados"}</SeloHero>
            <SeloHero tom="informativo">
              <Stethoscope aria-hidden="true" size={13} strokeWidth={1.7} />
              Padrão operacional
            </SeloHero>
          </>
        }
      />

      <Card>
        <CardCabecalho
          titulo="Editar padrões"
          descricao="Ajuste nome, duração, valor e retorno sugerido. O histórico dos atendimentos já registrados permanece intacto."
        />
        <CardCorpo className="py-7 sm:py-8">
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
