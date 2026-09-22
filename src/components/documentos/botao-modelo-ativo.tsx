import { Archive, ArchiveRestore } from "lucide-react";
import { BotaoDeAcao, FormularioDeAcao } from "@/components/ui/formulario-acao";
import { alternarModeloAtivo } from "@/server/acoes/documentos";

/**
 * Aposentar tira o modelo da tela de emissão sem apagar nada. Ele continua
 * explicando os documentos que já gerou — e esses documentos não dependem
 * dele de todo modo, porque carregam o texto congelado.
 */
export function BotaoModeloAtivo({
  modeloId,
  ativo,
  nome,
}: {
  modeloId: string;
  ativo: boolean;
  nome: string;
}) {
  return (
    <FormularioDeAcao
      acao={alternarModeloAtivo}
      campos={{ id: modeloId, ativar: ativo ? "nao" : "sim" }}
      confirmacao={
        ativo
          ? `Aposentar "${nome}"? Ele sai da lista de emissão. Os documentos já emitidos continuam intactos.`
          : `Reativar "${nome}"? Ele volta a aparecer na tela de emissão.`
      }
      alinhamento="fim"
    >
      <BotaoDeAcao
        tom="silencioso"
        tamanho="xs"
        icone={ativo ? Archive : ArchiveRestore}
        rotuloAcessivel={`${ativo ? "Aposentar" : "Reativar"} o modelo ${nome}`}
      >
        {ativo ? "Aposentar" : "Reativar"}
      </BotaoDeAcao>
    </FormularioDeAcao>
  );
}
