import { HeartPulse, ShieldAlert } from "lucide-react";
import { AvisoDeTela } from "@/components/ui/aviso-de-tela";
import { SeloHero } from "@/components/ui/page-hero";

export function AcessoRestritoProntuario() {
  return (
    <AvisoDeTela
      icone={ShieldAlert}
      rotulo="Dado sensível de saúde"
      titulo="Prontuário clínico restrito"
      selos={
        <>
          <SeloHero>
            <HeartPulse aria-hidden="true" size={13} strokeWidth={1.75} />
            Conteúdo clínico
          </SeloHero>
          <SeloHero tom="informativo">Acesso protegido por perfil</SeloHero>
        </>
      }
    >
      Este módulo contém informação clínica sensível e, nesta etapa, fica disponível apenas para a administradora. A restrição também é aplicada fora da interface.
    </AvisoDeTela>
  );
}
