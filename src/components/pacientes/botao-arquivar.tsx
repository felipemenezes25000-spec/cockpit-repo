import { Archive, ArchiveRestore } from "lucide-react";
import { BotaoDeAcao, FormularioDeAcao } from "@/components/ui/formulario-acao";
import { alternarArquivamento } from "@/server/acoes/pacientes";

/**
 * Arquivar tira a paciente da lista sem apagar nada — o histórico continua.
 *
 * A confirmação é do navegador de propósito: um diálogo próprio pediria estado,
 * foco preso e tecla Esc para uma pergunta de uma linha só, e a ação é
 * reversível no clique seguinte.
 */
export function BotaoArquivar({
  pacienteId,
  arquivada,
  nome,
}: {
  pacienteId: string;
  arquivada: boolean;
  nome: string;
}) {
  return (
    <FormularioDeAcao
      acao={alternarArquivamento}
      campos={{ id: pacienteId, arquivar: arquivada ? "nao" : "sim" }}
      confirmacao={
        arquivada
          ? `Reativar ${nome}? Ela volta a aparecer na lista de pacientes ativas.`
          : `Arquivar ${nome}? O histórico é mantido e ela sai da lista de ativas. Dá para reativar depois.`
      }
    >
      <BotaoDeAcao icone={arquivada ? <ArchiveRestore strokeWidth={1.75} /> : <Archive strokeWidth={1.75} />}>
        {arquivada ? "Reativar paciente" : "Arquivar paciente"}
      </BotaoDeAcao>
    </FormularioDeAcao>
  );
}
