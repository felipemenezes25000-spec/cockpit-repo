import { ShieldAlert } from "lucide-react";
import { EstadoVazio } from "@/components/ui/empty-state";

export function AcessoRestritoProntuario() {
  return (
    <EstadoVazio
      icone={ShieldAlert}
      titulo="Prontuário clínico restrito"
      descricao="Este módulo contém dado sensível de saúde e, nesta etapa, fica disponível apenas para a administradora."
      className="rounded-[var(--radius-painel)] border border-card-border bg-card"
    />
  );
}
