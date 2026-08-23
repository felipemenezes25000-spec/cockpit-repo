import { ArrowLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Card, CardCorpo } from "@/components/ui/card";

/**
 * Tela para quem não é administradora. A ação de servidor repete a checagem —
 * esconder a tela não é proteger a rota.
 */
export function SomenteAdministradora({ voltarPara }: { voltarPara: string }) {
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardCorpo className="flex flex-col items-center gap-4 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-[var(--radius-controle)] bg-surface-container text-outline">
            <ShieldAlert aria-hidden="true" size={20} strokeWidth={1.5} />
          </span>
          <div>
            <p className="font-medium text-on-surface">Só a administradora altera a tabela</p>
            <p className="mt-1 max-w-sm text-sm text-outline">
              A recepção usa os procedimentos na agenda, mas quem define nome,
              duração e valor é quem responde pela clínica.
            </p>
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
