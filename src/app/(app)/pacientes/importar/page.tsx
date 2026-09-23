import { ShieldAlert, Upload } from "lucide-react";
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

      <Importador modeloCsv={modeloEmDataUri()} />
    </div>
  );
}
