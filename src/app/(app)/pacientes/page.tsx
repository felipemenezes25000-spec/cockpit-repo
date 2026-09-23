import { Upload, UserRoundPlus } from "lucide-react";
import type { Metadata } from "next";
import { ehAdministradora } from "@/lib/auth";
import { BuscaPacientes } from "@/components/pacientes/busca-pacientes";
import { ListaPacientes } from "@/components/pacientes/lista-pacientes";
import { Paginacao } from "@/components/pacientes/paginacao";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { listarPacientes, type FiltroSituacao } from "@/server/consultas/pacientes";

export const metadata: Metadata = {
  title: "Pacientes",
  description:
    "Cadastro e histórico de cada paciente, com contatos, procedimentos realizados e observações.",
};

const SITUACOES: FiltroSituacao[] = ["ativas", "arquivadas", "todas"];

/** Aceita só o que a consulta conhece — o resto da URL é ignorado. */
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

  // O que a paginação precisa repetir nos links.
  const preservar: Record<string, string> = {};
  if (busca) preservar.busca = busca;
  if (situacao !== "ativas") preservar.situacao = situacao;

  return (
    <div>

      <Card>
        <CardCabecalho
          titulo="Pacientes"
          descricao="Cadastro, contatos e histórico de atendimento."
          acao={
            <div className="flex flex-wrap items-center gap-2">
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
            </div>
          }
        />

        <CardCorpo className="flex flex-col gap-6">
          <BuscaPacientes
            busca={busca}
            situacao={situacao}
            total={resultado.total}
          />

          <ListaPacientes pacientes={resultado.itens} busca={busca} />

          <Paginacao
            pagina={resultado.pagina}
            paginas={resultado.paginas}
            parametros={preservar}
          />
        </CardCorpo>
      </Card>
    </div>
  );
}
