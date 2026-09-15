import { Camera, ShieldCheck } from "lucide-react";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { EstadoVazio } from "@/components/ui/empty-state";
import { formatarData, formatarHora } from "@/lib/format";
import type {
  FotosDoProntuario,
  ImagemDoProntuario,
} from "@/server/consultas/prontuario-imagens";
import { EnviarFotos } from "./enviar-fotos";
import { FotoDaEvolucao } from "./foto-evolucao";

function Grade({
  imagens,
  prontuarioId,
  hojeNaClinica,
}: {
  imagens: ImagemDoProntuario[];
  prontuarioId: string;
  hojeNaClinica: string;
}) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {imagens.map((imagem) => (
        <FotoDaEvolucao
          key={imagem.id}
          imagem={imagem}
          prontuarioId={prontuarioId}
          hojeNaClinica={hojeNaClinica}
        />
      ))}
    </ul>
  );
}

/**
 * A galeria de evolução do prontuário.
 *
 * A ordem é cronológica crescente porque é assim que a evolução se lê: a foto
 * mais antiga primeiro, o resultado depois. É o contrário do resto do sistema,
 * onde o mais recente vem no topo.
 */
export function FotosDeEvolucao({
  fotos,
  prontuarioId,
  dataSugerida,
  hojeNaClinica,
}: {
  fotos: FotosDoProntuario;
  prontuarioId: string;
  /** Data do registro do prontuário — o palpite mais provável para a captura. */
  dataSugerida: string;
  hojeNaClinica: string;
}) {
  const { visiveis, arquivadas, eliminacoes } = fotos;

  return (
    <Card>
      <CardCabecalho
        titulo="Fotos de evolução"
        descricao="O antes, o durante e o depois. Só a administradora vê e envia."
      />

      <CardCorpo className="flex flex-col gap-8">
        {visiveis.length > 0 ? (
          <Grade
            imagens={visiveis}
            prontuarioId={prontuarioId}
            hojeNaClinica={hojeNaClinica}
          />
        ) : (
          <EstadoVazio
            icone={Camera}
            titulo="Nenhuma foto ainda"
            descricao="Envie as fotos do atendimento abaixo. A data que vale é a do dia em que foram tiradas."
            className="rounded-[var(--radius-cartao)] border border-dashed border-card-border py-10"
          />
        )}

        <div className="border-t border-card-border pt-6">
          <p className="rotulo mb-4">Enviar fotos</p>
          <EnviarFotos
            prontuarioId={prontuarioId}
            dataSugerida={dataSugerida}
            hojeNaClinica={hojeNaClinica}
          />
        </div>

        {arquivadas.length > 0 ? (
          <details className="border-t border-card-border pt-5">
            <summary className="cursor-pointer text-sm font-medium text-primary">
              {arquivadas.length === 1
                ? "1 foto arquivada"
                : `${arquivadas.length} fotos arquivadas`}
            </summary>
            <p className="mt-2 mb-4 text-xs text-outline">
              Fora da ficha e preservadas. Arquivar não é eliminar: o arquivo
              continua no armazenamento e volta a qualquer momento.
            </p>
            <Grade
              imagens={arquivadas}
              prontuarioId={prontuarioId}
              hojeNaClinica={hojeNaClinica}
            />
          </details>
        ) : null}

        {eliminacoes.length > 0 ? (
          <details className="border-t border-card-border pt-5">
            <summary className="cursor-pointer text-sm font-medium text-primary">
              {eliminacoes.length === 1
                ? "1 foto eliminada"
                : `${eliminacoes.length} fotos eliminadas`}
            </summary>
            <p className="mt-2 mb-4 text-xs text-outline">
              A prova de que a imagem existiu e foi eliminada — sem a imagem.
            </p>
            <ul className="flex flex-col">
              {eliminacoes.map((eliminacao) => (
                <li
                  key={eliminacao.id}
                  className="border-b border-card-border py-3 last:border-b-0"
                >
                  <p className="tabular text-xs text-outline">
                    Foto de {formatarData(eliminacao.dataCaptura)} · eliminada em{" "}
                    {formatarData(eliminacao.eliminadaEm)} às{" "}
                    {formatarHora(eliminacao.eliminadaEm)}
                    {eliminacao.eliminadaPor ? ` · ${eliminacao.eliminadaPor}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-on-surface">{eliminacao.motivo}</p>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </CardCorpo>

      <CardRodape className="flex items-start gap-2 text-outline">
        <ShieldCheck
          aria-hidden="true"
          size={14}
          strokeWidth={1.75}
          className="mt-0.5 shrink-0"
        />
        <span>
          As fotos ficam em armazenamento privado e são exibidas por endereço
          assinado, que expira. Nenhuma delas tem URL pública.
        </span>
      </CardRodape>
    </Card>
  );
}
