import { ShieldAlert, WalletCards } from "lucide-react";
import { AvisoDeTela } from "@/components/ui/aviso-de-tela";
import { LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";

/** Estado institucional para perfis que não operam o caixa. */
export function SomenteFinanceiro({ voltarPara }: { voltarPara: string }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <LinkDeVoltar href={voltarPara}>Voltar</LinkDeVoltar>
      <AvisoDeTela
        icone={ShieldAlert}
        rotulo="Permissão financeira"
        titulo="Área do financeiro e da administradora"
        selos={
          <>
            <SeloHero>
              <WalletCards aria-hidden="true" size={13} strokeWidth={1.75} />
              Caixa protegido por perfil
            </SeloHero>
            <SeloHero tom="informativo">A RLS repete a restrição no banco</SeloHero>
          </>
        }
      >
        A recepção registra vendas com a taxa padrão. Alterar valores, confirmar recebimentos e lançar despesas fica com quem responde pelo caixa.
      </AvisoDeTela>
    </div>
  );
}
