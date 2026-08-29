import { FileText } from "lucide-react";
import type { Metadata } from "next";
import { FaixaDemonstracao } from "@/components/layout/demo-badge";
import { AcessoRestritoProntuario } from "@/components/prontuarios/acesso-restrito";
import { BuscaProntuarios } from "@/components/prontuarios/busca-prontuarios";
import { ListaProntuarios } from "@/components/prontuarios/lista-prontuarios";
import { PaginacaoProntuarios } from "@/components/prontuarios/paginacao-prontuarios";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
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

  if (!administradora) {
    return (
      <div>
        <FaixaDemonstracao className="mb-8" />
        <AcessoRestritoProntuario />
      </div>
    );
  }

  const resultado = await listarProntuarios({ busca, pagina }).catch((erro: unknown) => {
    if (erro instanceof EstruturaProntuarioPendenteError) return null;
    throw erro;
  });

  if (!resultado) {
    return (
      <div>
        <FaixaDemonstracao className="mb-8" />
        <EstruturaPendenteProntuario />
      </div>
    );
  }

  const preservar: Record<string, string> = {};
  if (busca) preservar.busca = busca;

  return (
    <div>
      <FaixaDemonstracao className="mb-8" />

      <Card>
        <CardCabecalho
          titulo="Prontuários"
          descricao="Registros clínicos com histórico de versões."
          acao={
            <BotaoLink href="/prontuarios/novo" variante="primaria" tamanho="sm">
              <FileText aria-hidden="true" size={16} strokeWidth={1.75} />
              Novo prontuário
            </BotaoLink>
          }
        />

        <CardCorpo className="flex flex-col gap-6">
          <BuscaProntuarios busca={busca} total={resultado.total} />
          <ListaProntuarios prontuarios={resultado.itens} busca={busca} />
          <PaginacaoProntuarios
            pagina={resultado.pagina}
            paginas={resultado.paginas}
            parametros={preservar}
          />
        </CardCorpo>
      </Card>
    </div>
  );
}
