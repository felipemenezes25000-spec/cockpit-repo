import { ArrowLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Card, CardCorpo } from "@/components/ui/card";

/**
 * Tela para quem não opera o financeiro. As ações de servidor e a RLS
 * repetem a checagem — esconder a tela não é proteger a rota.
 */
export function SomenteFinanceiro({ voltarPara }: { voltarPara: string }) {
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardCorpo className="flex flex-col items-center gap-4 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-[var(--radius-controle)] bg-surface-container text-outline">
            <ShieldAlert aria-hidden="true" size={20} strokeWidth={1.5} />
          </span>
          <div>
            <p className="font-medium text-on-surface">
              Área do financeiro e da administradora
            </p>
            <p className="mt-1 max-w-sm text-sm text-outline">
              A recepção registra vendas com a taxa padrão. Alterar valores,
              confirmar recebimentos e lançar despesas é de quem responde pelo
              caixa.
            </p>
          </div>
          <Link
            href={voltarPara}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-controle)] border border-primary px-6 text-sm font-medium text-primary transition-colors hover:bg-surface-container-low"
          >
            <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
            Voltar
          </Link>
        </CardCorpo>
      </Card>
    </div>
  );
}
