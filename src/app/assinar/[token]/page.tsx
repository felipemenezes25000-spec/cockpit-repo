import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { AssinarPorLink } from "@/components/documentos/assinar-por-link";
import type { TipoDocumento } from "@/lib/documento";
import { CLINICA } from "@/lib/nav";
import { estadoDoLinkPublico } from "@/server/consultas/documentos";

/**
 * A única página do sistema que abre sem sessão.
 *
 * O que a protege não é esta rota — é a migração 0014: `anon` não tem acesso
 * a tabela nenhuma, só a três funções que exigem o token do link e a data de
 * nascimento da paciente a cada chamada. Aqui não há consulta ao banco fora
 * dessas funções, e não há nada que o servidor confie no que a página manda.
 */

export const metadata: Metadata = {
  title: "Assinar documento",
  description: "Leia e assine o documento enviado pela clínica.",
  // Link de assinatura não é conteúdo para buscador nenhum.
  robots: { index: false, follow: false },
};

const TIPOS = ["contrato", "termo", "orientacao", "anamnese"];

export default async function PaginaAssinar({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const limpo = decodeURIComponent(token ?? "").slice(0, 200);

  // Só a situação, sem revelar conteúdo: a função devolve o tipo para a tela
  // saber dizer "contrato" ou "termo", e mais nada antes da data de
  // nascimento.
  const estado = await estadoDoLinkPublico(limpo);
  const situacao = estado.situacao;
  const tipo =
    estado.tipo && TIPOS.includes(estado.tipo) ? (estado.tipo as TipoDocumento) : null;

  return (
    <main className="min-h-dvh bg-surface-container-low px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        {/* Cabeçalho e rodapé são da tela, não do documento: `sem-impressao`
            os tira do papel para a via sair só com o que foi assinado. */}
        <header className="sem-impressao flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-controle)] bg-primary-container text-sm font-semibold text-on-primary">
            {CLINICA.monograma}
          </span>
          <div className="min-w-0">
            <p className="font-medium text-on-surface">{CLINICA.nome}</p>
            <p className="text-xs text-outline">{CLINICA.descricao}</p>
          </div>
        </header>

        <AssinarPorLink token={limpo} tipo={tipo} situacaoInicial={situacao} />

        <footer className="sem-impressao flex items-start gap-2 px-1 text-xs text-outline">
          <ShieldCheck
            aria-hidden="true"
            size={14}
            strokeWidth={1.75}
            className="mt-0.5 shrink-0"
          />
          <span>
            Esta página é do consultório. Ela não pede senha, não cobra nada e
            não guarda dados de pagamento. Na dúvida, ligue para a clínica antes
            de assinar.
          </span>
        </footer>
      </div>
    </main>
  );
}
