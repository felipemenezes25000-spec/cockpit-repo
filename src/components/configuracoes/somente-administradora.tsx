import { Crown, ShieldAlert } from "lucide-react";
import { AvisoDeTela } from "@/components/ui/aviso-de-tela";
import { LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";

export const EXPLICACAO_PROCEDIMENTOS =
  "A recepção usa os procedimentos na agenda, mas quem define nome, duração e valor é quem responde pela clínica.";

export const EXPLICACAO_MODELOS =
  "A equipe emite documentos a partir dos modelos, mas quem cria, versiona e aposenta o texto é quem responde pela clínica.";

export const EXPLICACAO_TAXAS =
  "O financeiro altera a taxa de uma venda, com justificativa, mas a tabela padrão de taxas é definida por quem responde pela clínica.";

export function SomenteAdministradora({
  voltarPara,
  explicacao,
}: {
  voltarPara: string;
  explicacao: string;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <LinkDeVoltar href={voltarPara}>Voltar</LinkDeVoltar>
      <AvisoDeTela
        icone={ShieldAlert}
        rotulo="Permissão administrativa"
        titulo="Só a administradora altera esta tabela"
        selos={
          <>
            <SeloHero>
              <Crown aria-hidden="true" size={13} strokeWidth={1.75} />
              Configuração da clínica
            </SeloHero>
            <SeloHero tom="informativo">Ação revalidada no servidor e no banco</SeloHero>
          </>
        }
      >
        {explicacao}
      </AvisoDeTela>
    </div>
  );
}
