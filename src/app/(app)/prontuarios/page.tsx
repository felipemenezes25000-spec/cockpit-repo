import { FileText } from "lucide-react";
import type { Metadata } from "next";
import { AcessoRestritoProntuario } from "@/components/prontuarios/acesso-restrito";
import { BuscaProntuarios } from "@/components/prontuarios/busca-prontuarios";
import { ListaProntuarios } from "@/components/prontuarios/lista-prontuarios";
import { Paginacao } from "@/components/ui/paginacao";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, SeloHero } from "@/components/ui/page-hero";
import { estaAlemDoFim, PaginaAlemDoFim } from "@/components/ui/pagina-alem-do-fim";
import { ehAdministradora } from "@/lib/auth";
import { EstruturaPendenteProntuario } from "@/components/prontuarios/estrutura-pendente";
import {
  EstruturaProntuarioPendenteError,
  listarProntuarios,
} from "@/server/consultas/prontuarios";

export const metadata: Metadata = {
  title: "Prontuários",
  description: "Registros clínicos versionados das pacientes.",
};

function lerTexto(valor: string | string[] | undefined): string {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  return (texto ?? "").slice(0, 80);
}

export default async function PaginaProntuarios({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametros = await searchParams;
  const busca = lerTexto(parametros.busca);
  const pagina = Math.max(1, Number(lerTexto(parametros.pagina)) || 1);
  const administradora = await ehAdministradora();

  if (!administradora) return <AcessoRestritoProntuario />;

  const resultado = await listarProntuarios({ busca, pagina }).catch((erro: unknown) => {
    if (erro instanceof EstruturaProntuarioPendenteError) return null;
    throw erro;
  });

  if (!resultado) return <EstruturaPendenteProntuario />;

  const preservar: Record<string, string> = {};
  if (busca) preservar.busca = busca;

  return (
    <div className="page-reveal flex flex-col gap-5 sm:gap-6">
      <CabecalhoDePagina
        icone={FileText}
        rotulo="Registro clínico"
        titulo="Prontuários"
        descricao="Registros versionados, com leitura mais sóbria e foco no histórico clínico de cada paciente."
        acoes={
          <BotaoLink href="/prontuarios/novo" variante="primaria" tamanho="sm">
            <FileText aria-hidden="true" size={16} strokeWidth={1.75} />
            Novo prontuário
          </BotaoLink>
        }
        meta={
          <>
            <SeloHero tom="informativo">{resultado.total} {resultado.total === 1 ? "prontuário" : "prontuários"}</SeloHero>
            <SeloHero>Histórico versionado</SeloHero>
            {busca ? <SeloHero>Busca ativa</SeloHero> : null}
          </>
        }
      />

      <Card>
        <CardCorpo className="flex flex-col gap-6 sm:gap-7">
          <BuscaProntuarios busca={busca} total={resultado.total} />
          {estaAlemDoFim(resultado) ? (
            <PaginaAlemDoFim
              icone={FileText}
              total={resultado.total}
              paginas={resultado.paginas}
              singular="prontuário"
              plural="prontuários"
              caminho="/prontuarios"
              parametros={preservar}
            />
          ) : (
            <>
              <ListaProntuarios prontuarios={resultado.itens} busca={busca} />
              <Paginacao
                pagina={resultado.pagina}
                paginas={resultado.paginas}
                parametros={preservar}
                caminho="/prontuarios"
                rotulo="Paginação dos prontuários"
              />
            </>
          )}
        </CardCorpo>
      </Card>
    </div>
  );
}
