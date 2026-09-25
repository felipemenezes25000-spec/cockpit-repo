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
import "./importacao-premium.css";

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

      <section aria-label="Etapas da importação" className="premium-panel relative overflow-hidden rounded-[var(--radius-painel)] border p-3 sm:p-4">
        <span aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-primary-fixed/35 blur-3xl" />
        <ol className="relative grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {ETAPAS.map((etapa, indice) => {
            const Icone = etapa.icone;
            return (
              <li key={etapa.numero} className="group relative overflow-hidden rounded-[var(--radius-cartao)] border border-card-border bg-surface p-3.5 transition-[transform,border-color,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary-fixed hover:bg-surface-container-low hover:shadow-[0_14px_30px_-26px_rgba(8,84,160,.45)]">
                <div className="flex items-start gap-3">
                  <span className="relative flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-primary-fixed bg-selecao text-primary">
                    <Icone aria-hidden="true" size={17} strokeWidth={1.65} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="tabular text-[0.62rem] font-bold tracking-[0.1em] text-outline uppercase">{etapa.numero}</span>
                      {indice < ETAPAS.length - 1 ? <span aria-hidden="true" className="hidden h-px flex-1 bg-card-border xl:block" /> : null}
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

      <div className="importacao-pacientes-premium">
        <Importador modeloCsv={modeloEmDataUri()} />
      </div>
    </div>
  );
}
