import { DatabaseZap } from "lucide-react";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";

export function EstruturaPendenteProntuario() {
  return (
    <Card>
      <CardCabecalho
        titulo="Migração pendente"
        descricao="O código do módulo já está pronto, mas o banco ainda não tem as tabelas de prontuário."
      />
      <CardCorpo>
        <div className="flex items-start gap-3 rounded-[var(--radius-cartao)] border border-atencao-borda bg-atencao-fundo px-4 py-3 text-sm text-atencao-texto">
          <DatabaseZap aria-hidden="true" size={18} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          <p>
            Aplique `supabase/migrations/0010_prontuarios.sql` com `npm.cmd run
            db:push` e depois gere os tipos com `npm.cmd run db:tipos`.
          </p>
        </div>
      </CardCorpo>
    </Card>
  );
}
