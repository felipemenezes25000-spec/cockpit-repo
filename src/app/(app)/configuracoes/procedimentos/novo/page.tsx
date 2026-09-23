import { Stethoscope } from "lucide-react";
import type { Metadata } from "next";
import { FormularioProcedimento } from "@/components/configuracoes/formulario-procedimento";
import {
  EXPLICACAO_PROCEDIMENTOS,
  SomenteAdministradora,
} from "@/components/configuracoes/somente-administradora";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";
import { ehAdministradora } from "@/lib/auth";
import { criarProcedimento } from "@/server/acoes/procedimentos";

export const metadata: Metadata = { title: "Novo procedimento" };

export default async function PaginaNovoProcedimento() {
  if (!(await ehAdministradora())) {
    return (
      <SomenteAdministradora
        voltarPara="/configuracoes/procedimentos"
        explicacao={EXPLICACAO_PROCEDIMENTOS}
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <LinkDeVoltar href="/configuracoes/procedimentos">Voltar para procedimentos</LinkDeVoltar>

      <CabecalhoDePagina
        icone={Stethoscope}
        rotulo="Configurações"
        titulo="Cadastrar procedimento"
        descricao="Defina o padrão que será sugerido ao criar novos atendimentos. Duração, valor e retorno podem ser ajustados conforme a operação da clínica."
        meta={
          <>
            <SeloHero tom="informativo">Padrão para novas marcações</SeloHero>
            <SeloHero>Não altera atendimentos anteriores</SeloHero>
          </>
        }
      />

      <Card>
        <CardCabecalho
          titulo="Dados do procedimento"
          descricao="Esses valores alimentam Agenda e Financeiro como ponto de partida, sem substituir a revisão humana de cada atendimento."
        />
        <CardCorpo className="py-7 sm:py-8">
          <FormularioProcedimento
            acao={criarProcedimento}
            rotuloSalvar="Cadastrar procedimento"
            cancelarPara="/configuracoes/procedimentos"
          />
        </CardCorpo>
      </Card>
    </div>
  );
}
