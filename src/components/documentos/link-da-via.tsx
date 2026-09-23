import { CircleAlert, Link2, Link2Off } from "lucide-react";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { BotaoDeAcao, FormularioDeAcao } from "@/components/ui/formulario-acao";
import { formatarData } from "@/lib/format";
import { revogarLinkAssinatura } from "@/server/acoes/assinatura-link";
import type { LinkDeAssinatura } from "@/server/consultas/documentos";

/**
 * O link que continua aberto depois da assinatura (0016).
 *
 * Assinar não revoga: o link vale até a expiração, em modo leitura, para a
 * paciente salvar a via dela. Encurtar isso é decisão da clínica caso a
 * caso — link encaminhado a quem não devia, pedido da própria paciente — e
 * `documento_link_revogar` aceita em qualquer situação do documento. Faltava
 * só o botão (AGENTS.md §8.7).
 *
 * Só aparece com link vivo. Revogar aqui não mexe na assinatura nem no
 * documento: fecha só a porta de leitura. E não tem volta pelo sistema:
 * `documento_link_criar` só aceita documento `emitido`, então documento
 * assinado não ganha link novo. A confirmação diz isso antes do clique.
 */
export function LinkDaVia({
  documentoId,
  links,
}: {
  documentoId: string;
  links: LinkDeAssinatura[];
}) {
  const ativo = links.find((link) => link.ativo) ?? null;
  if (!ativo) return null;

  return (
    <Card>
      <CardCabecalho
        titulo="Via da paciente pelo link"
        descricao="Depois de assinado, o link continua abrindo o documento em modo leitura até vencer."
      />
      <CardCorpo>
        {ativo.bloqueado ? (
          // Dez datas de nascimento erradas fecham a porta (0016): dizer que
          // está "aberto para leitura" seria informar errado sobre a via.
          <p className="flex items-start gap-2 text-sm text-negativo">
            <CircleAlert
              aria-hidden="true"
              size={16}
              strokeWidth={1.75}
              className="mt-0.5 shrink-0"
            />
            <span>
              Bloqueado por dez tentativas erradas de data de nascimento
              {ativo.canalEnvio ? ` (enviado por ${ativo.canalEnvio})` : ""}. O link não
              abre mais, nem para a paciente; documento assinado não recebe link
              novo.
            </span>
          </p>
        ) : (
          <p className="flex items-start gap-2 text-sm text-on-surface">
            <Link2
              aria-hidden="true"
              size={16}
              strokeWidth={1.75}
              className="mt-0.5 shrink-0 text-primary"
            />
            <span>
              Aberto para leitura até{" "}
              <span className="tabular font-medium">{formatarData(ativo.expiraEm)}</span>
              {ativo.canalEnvio ? `, enviado por ${ativo.canalEnvio}` : ""}. Quem tiver o
              endereço e a data de nascimento da paciente consegue ver o texto
              assinado.
            </span>
          </p>
        )}

        <div className="mt-4 border-t border-card-border pt-4">
          <FormularioDeAcao
            acao={revogarLinkAssinatura}
            campos={{ link_id: ativo.id, documento_id: documentoId }}
            confirmacao="Revogar o link da via? A assinatura continua valendo, mas a paciente deixa de abrir o documento pelo link, e documento assinado não recebe link novo."
          >
            <BotaoDeAcao
              tom="negativo"
              icone={<Link2Off aria-hidden="true" strokeWidth={1.75} />}
            >
              Revogar link da via
            </BotaoDeAcao>
          </FormularioDeAcao>
        </div>
      </CardCorpo>
    </Card>
  );
}
