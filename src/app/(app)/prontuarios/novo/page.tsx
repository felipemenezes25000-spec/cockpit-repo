import { FileText, History, ShieldCheck, Stethoscope } from "lucide-react";
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

function Nota({ icone: Icone, titulo, texto }: { icone: typeof ShieldCheck; titulo: string; texto: string }) {
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
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
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
          <div className="grid items-start gap-7 2xl:grid-cols-[minmax(0,1fr)_21rem]">
            <div className="min-w-0">
              <FormularioProntuario
                acao={criarProntuario}
                modo="novo"
                pacienteInicial={paciente}
                atendimentoInicial={atendimento}
                dataPadrao={atendimento?.dataRegistro ?? chaveDoDia(hoje())}
                cancelarPara={cancelarPara}
                rotuloSalvar="Salvar prontuário"
              />
            </div>

            <aside className="integridade-cabine p-4 sm:p-5 2xl:sticky 2xl:top-28">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-[var(--radius-controle)] bg-selecao text-primary">
                  <ShieldCheck aria-hidden="true" size={17} strokeWidth={1.75} />
                </span>
                <div>
                  <p className="rotulo text-primary">Registro clínico</p>
                  <h2 className="mt-1 text-base font-semibold text-on-surface">Versão, não sobrescrita</h2>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                <Nota icone={Stethoscope} titulo="Conteúdo clínico" texto="Queixa, avaliação, conduta, evolução e orientações ficam separados para leitura e continuidade do cuidado." />
                <Nota icone={History} titulo="Versão 1 preservada" texto="Depois de salvar, futuras atualizações geram novas versões; o conteúdo anterior continua disponível." />
                <Nota icone={ShieldCheck} titulo="Acesso restrito" texto="Prontuário é dado clínico sensível e permanece protegido pelas regras de perfil e pelo banco." />
              </div>

              {atendimento ? (
                <div className="mt-4 rounded-[var(--radius-controle)] border border-primary-fixed bg-selecao px-3.5 py-3">
                  <p className="text-xs font-semibold text-primary">Atendimento vinculado</p>
                  <p className="mt-1 text-xs leading-5 text-on-surface-variant">Data e contexto do atendimento já ajudam a preencher a identificação deste registro.</p>
                </div>
              ) : null}
            </aside>
          </div>
        </CardCorpo>
      </Card>
    </div>
  );
}
