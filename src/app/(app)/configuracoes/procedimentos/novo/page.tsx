import { CalendarClock, ShieldCheck, Stethoscope, WalletCards } from "lucide-react";
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

function Nota({ icone: Icone, titulo, texto }: { icone: typeof Stethoscope; titulo: string; texto: string }) {
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
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
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
          <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-w-0">
              <FormularioProcedimento
                acao={criarProcedimento}
                rotuloSalvar="Cadastrar procedimento"
                cancelarPara="/configuracoes/procedimentos"
              />
            </div>

            <aside className="integridade-cabine p-4 sm:p-5 xl:sticky xl:top-28">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-[var(--radius-controle)] bg-selecao text-primary">
                  <ShieldCheck aria-hidden="true" size={17} strokeWidth={1.75} />
                </span>
                <div>
                  <p className="rotulo text-primary">Padrão operacional</p>
                  <h2 className="mt-1 text-base font-semibold text-on-surface">Sugere, não engessa</h2>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                <Nota icone={CalendarClock} titulo="Duração padrão" texto="A Agenda usa esse valor como ponto de partida; cada atendimento ainda pode ser ajustado." />
                <Nota icone={WalletCards} titulo="Valor de tabela" texto="Ajuda a preencher novas operações sem impedir negociação diferente em um caso específico." />
                <Nota icone={Stethoscope} titulo="Retorno sugerido" texto="Representa a regra operacional definida pela equipe. Vazio significa que não há sugestão automática." />
              </div>
            </aside>
          </div>
        </CardCorpo>
      </Card>
    </div>
  );
}
