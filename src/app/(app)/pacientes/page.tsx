import { Upload, UserRoundPlus, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import { ehAdministradora } from "@/lib/auth";
import { BuscaPacientes } from "@/components/pacientes/busca-pacientes";
import { ListaPacientes } from "@/components/pacientes/lista-pacientes";
import { Paginacao } from "@/components/ui/paginacao";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, SeloHero } from "@/components/ui/page-hero";
import { estaAlemDoFim, PaginaAlemDoFim } from "@/components/ui/pagina-alem-do-fim";
import { listarPacientes, type FiltroSituacao } from "@/server/consultas/pacientes";

export const metadata: Metadata = {
  title: "Pacientes",
  description:
    "Cadastro e histórico de cada paciente, com contatos, procedimentos realizados e observações.",
};

const SITUACOES: FiltroSituacao[] = ["ativas", "arquivadas", "todas"];

function lerSituacao(valor: string | string[] | undefined): FiltroSituacao {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  return SITUACOES.find((s) => s === texto) ?? "ativas";
}

function lerTexto(valor: string | string[] | undefined): string {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  return (texto ?? "").slice(0, 80);
}

export default async function PaginaPacientes({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametros = await searchParams;
  const busca = lerTexto(parametros.busca);
  const situacao = lerSituacao(parametros.situacao);
  const pagina = Math.max(1, Number(lerTexto(parametros.pagina)) || 1);

  const [resultado, administradora] = await Promise.all([
    listarPacientes({ busca, situacao, pagina }),
    ehAdministradora(),
  ]);

  const preservar: Record<string, string> = {};
  if (busca) preservar.busca = busca;
  if (situacao !== "ativas") preservar.situacao = situacao;

  return (
    <div className="page-reveal flex flex-col gap-5 sm:gap-6">
      <CabecalhoDePagina
        icone={UsersRound}
        rotulo="Base de pacientes"
        titulo="Pacientes"
        descricao="Encontre rapidamente quem você precisa, mantenha os dados organizados e entre no histórico da paciente sem perder contexto."
        acoes={
          <>
            {administradora ? (
              <BotaoLink href="/pacientes/importar" variante="contorno" tamanho="sm">
                <Upload aria-hidden="true" size={16} strokeWidth={1.75} />
                Importar planilha
              </BotaoLink>
            ) : null}
            <BotaoLink href="/pacientes/novo" variante="primaria" tamanho="sm">
              <UserRoundPlus aria-hidden="true" size={16} strokeWidth={1.75} />
              Nova paciente
            </BotaoLink>
          </>
        }
        meta={
          <>
            <SeloHero tom="informativo">{resultado.total} {resultado.total === 1 ? "paciente" : "pacientes"}</SeloHero>
            {busca ? <SeloHero>Busca ativa</SeloHero> : null}
            {situacao !== "ativas" ? <SeloHero>{situacao === "arquivadas" ? "Arquivadas" : "Ativas e arquivadas"}</SeloHero> : <SeloHero tom="positivo">Ativas</SeloHero>}
          </>
        }
      />

      <Card>
        <CardCorpo className="flex flex-col gap-6 sm:gap-7">
          <BuscaPacientes busca={busca} situacao={situacao} total={resultado.total} />

          {estaAlemDoFim(resultado) ? (
            <PaginaAlemDoFim
              icone={UsersRound}
              total={resultado.total}
              paginas={resultado.paginas}
              singular="paciente"
              plural="pacientes"
              caminho="/pacientes"
              parametros={preservar}
            />
          ) : (
            <>
              <ListaPacientes pacientes={resultado.itens} busca={busca} />
              <Paginacao
                pagina={resultado.pagina}
                paginas={resultado.paginas}
                parametros={preservar}
                caminho="/pacientes"
                rotulo="Paginação dos pacientes"
              />
            </>
          )}
        </CardCorpo>
      </Card>
    </div>
  );
}
