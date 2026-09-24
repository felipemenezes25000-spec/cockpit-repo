import { FileSpreadsheet, ScanSearch, ShieldAlert, Upload, UserRoundCheck } from "lucide-react";
import type { Metadata } from "next";
import { Importador } from "@/components/pacientes/importador";
import { BotaoLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EstadoVazio } from "@/components/ui/empty-state";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";
import { gerarCsv } from "@/lib/csv";
import { COLUNAS_DO_MODELO } from "@/lib/importacao";
import { ehAdministradora } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Importar pacientes",
  description: "Trazer a base de pacientes de uma planilha para o sistema.",
};

function modeloEmDataUri(): string {
  const exemplo = [
    "Maria Aparecida da Silva", "", "529.982.247-25", "20/05/1990", "(11) 98765-4321",
    "maria@email.com", "01310-100", "Avenida Paulista", "1000", "Apto 52", "Bela Vista",
    "São Paulo", "SP", "Indicação", "Prefere atendimento pela manhã",
  ];
  const csv = gerarCsv([[...COLUNAS_DO_MODELO], exemplo], ";");
  return `data:text/csv;charset=utf-8,${encodeURIComponent(`﻿${csv}`)}`;
}

const ETAPAS = [
  { numero: "01", titulo: "Arquivo", descricao: "Escolha o CSV da clínica.", icone: FileSpreadsheet },
  { numero: "02", titulo: "Análise", descricao: "O sistema reconhece e valida as colunas.", icone: ScanSearch },
  { numero: "03", titulo: "Conferência", descricao: "Revise erros, avisos e duplicidades.", icone: Upload },
  { numero: "04", titulo: "Importação", descricao: "Somente as linhas prontas são gravadas.", icone: UserRoundCheck },
] as const;

export default async function PaginaImportarPacientes() {
  if (!(await ehAdministradora())) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <EstadoVazio
            icone={ShieldAlert}
            titulo="Importação restrita à administradora"
            descricao="Trazer uma base inteira de uma vez é decisão de quem responde pelo cadastro. Cadastrar pacientes uma a uma continua liberado."
            acao={<BotaoLink href="/pacientes" variante="secundaria">Voltar para pacientes</BotaoLink>}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <LinkDeVoltar href="/pacientes">Voltar para pacientes</LinkDeVoltar>

      <CabecalhoDePagina
        icone={Upload}
        rotulo="Pacientes"
        titulo="Importar base de pacientes"
        descricao="Traga a planilha existente da clínica com uma etapa de prévia antes da gravação. O sistema reprocessa o arquivo no servidor quando você confirma."
        meta={
          <>
            <SeloHero tom="informativo">Prévia antes de gravar</SeloHero>
            <SeloHero>CSV até 2 MB</SeloHero>
            <SeloHero tom="atencao">Ação administrativa</SeloHero>
          </>
        }
      />

      <section aria-label="Etapas da importação" className="premium-panel relative overflow-hidden rounded-[20px] border p-3 sm:p-4">
        <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-10 size-40 rounded-full bg-primary-fixed/30 blur-3xl" />
        <ol className="relative grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {ETAPAS.map((etapa, indice) => {
            const Icone = etapa.icone;
            return (
              <li key={etapa.numero} className="group relative overflow-hidden rounded-[15px] border border-card-border/70 bg-white/58 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] transition-[transform,border-color,box-shadow,background-color] duration-200 hover:-translate-y-px hover:border-primary/15 hover:bg-white/76 hover:shadow-[var(--shadow-cartao)]">
                <div className="flex items-start gap-3">
                  <span className="relative flex size-9 shrink-0 items-center justify-center rounded-[11px] border border-primary/10 bg-primary-fixed/48 text-primary shadow-[var(--shadow-cartao)]">
                    <Icone aria-hidden="true" size={17} strokeWidth={1.65} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="tabular text-[0.62rem] font-bold tracking-[0.1em] text-outline uppercase">{etapa.numero}</span>
                      {indice < ETAPAS.length - 1 ? <span aria-hidden="true" className="hidden h-px flex-1 bg-gradient-to-r from-card-border to-transparent xl:block" /> : null}
                    </div>
                    <p className="mt-1 text-sm font-semibold tracking-[-0.01em] text-on-surface">{etapa.titulo}</p>
                    <p className="mt-1 text-xs leading-5 text-outline">{etapa.descricao}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <Importador modeloCsv={modeloEmDataUri()} />
    </div>
  );
}
