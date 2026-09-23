import { ArrowLeft, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Importador } from "@/components/pacientes/importador";
import { BotaoLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EstadoVazio } from "@/components/ui/empty-state";
import { gerarCsv } from "@/lib/csv";
import { COLUNAS_DO_MODELO } from "@/lib/importacao";
import { ehAdministradora } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Importar pacientes",
  description: "Trazer a base de pacientes de uma planilha para o sistema.",
};

/**
 * Arquivo-modelo com o cabeçalho e uma linha de exemplo.
 *
 * Gerado aqui, a partir da mesma lista que o importador reconhece: um modelo
 * escrito à mão sairia de sincronia na primeira coluna nova.
 *
 * O BOM no começo faz o Excel abrir o arquivo como UTF-8 e mostrar os acentos
 * certos — sem ele, "Observações" vira "ObservaÃ§Ãµes" ao dar duplo clique.
 */
function modeloEmDataUri(): string {
  const exemplo = [
    "Maria Aparecida da Silva",
    "",
    "529.982.247-25",
    "20/05/1990",
    "(11) 98765-4321",
    "maria@email.com",
    "01310-100",
    "Avenida Paulista",
    "1000",
    "Apto 52",
    "Bela Vista",
    "São Paulo",
    "SP",
    "Indicação",
    "Prefere atendimento pela manhã",
  ];

  const csv = gerarCsv([[...COLUNAS_DO_MODELO], exemplo], ";");
  return `data:text/csv;charset=utf-8,${encodeURIComponent(`﻿${csv}`)}`;
}

export default async function PaginaImportarPacientes() {
  // Regra da aplicação, não do banco: a RLS deixa a recepção cadastrar
  // paciente, porque cadastrar uma a uma é trabalho dela. A ação de servidor
  // repete esta checagem — esconder o botão não é proteger a rota.
  if (!(await ehAdministradora())) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <EstadoVazio
            icone={ShieldAlert}
            titulo="Importação restrita à administradora"
            descricao="Trazer uma base inteira de uma vez é decisão de quem responde pelo cadastro. Cadastrar pacientes uma a uma continua liberado."
            acao={
              <BotaoLink href="/pacientes" variante="secundaria">
                <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
                Voltar para a lista
              </BotaoLink>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/pacientes"
        className="mb-6 inline-flex min-h-6 items-center gap-2 text-sm text-on-surface-variant transition-colors hover:text-primary"
      >
        <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
        Voltar para a lista
      </Link>

      <div className="mb-8">
        <h2 className="t-display text-primary">Importar pacientes</h2>
        <p className="t-body-lg mt-3 max-w-2xl text-on-surface-variant">
          Traga a base que já existe na planilha da clínica. O sistema lê o
          arquivo, mostra o que entendeu e só grava depois que você confirmar.
        </p>
      </div>

      <Importador modeloCsv={modeloEmDataUri()} />
    </div>
  );
}
