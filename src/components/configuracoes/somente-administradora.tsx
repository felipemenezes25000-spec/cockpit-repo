import { ArrowLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Card, CardCorpo } from "@/components/ui/card";

export const EXPLICACAO_PROCEDIMENTOS =
  "A recepção usa os procedimentos na agenda, mas quem define nome, duração e valor é quem responde pela clínica.";

export const EXPLICACAO_MODELOS =
  "A equipe emite documentos a partir dos modelos, mas quem cria, versiona e aposenta o texto é quem responde pela clínica.";

export const EXPLICACAO_TAXAS =
  "O financeiro altera a taxa de uma venda, com justificativa, mas a tabela padrão de taxas é definida por quem responde pela clínica.";

/**
 * Tela para quem não é administradora. A ação de servidor repete a checagem —
 * esconder a tela não é proteger a rota. `explicacao` diz o que os outros
 * perfis fazem com a tabela, porque isso muda de tabela para tabela.
 */
export function SomenteAdministradora({
  voltarPara,
  explicacao,
}: {
  voltarPara: string;
  explicacao: string;
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardCorpo className="flex flex-col items-center gap-4 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-[var(--radius-controle)] bg-surface-container text-outline">
            <ShieldAlert aria-hidden="true" size={20} strokeWidth={1.5} />
          </span>
          <div>
            <p className="font-medium text-on-surface">Só a administradora altera a tabela</p>
            <p className="mt-1 max-w-sm text-sm text-outline">{explicacao}</p>
          </div>
          <Link
            href={voltarPara}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-controle)] border border-primary px-6 text-sm font-medium text-primary transition-colors hover:bg-surface-container-low"
          >
            <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
            Ver a tabela
          </Link>
        </CardCorpo>
      </Card>
    </div>
  );
}
