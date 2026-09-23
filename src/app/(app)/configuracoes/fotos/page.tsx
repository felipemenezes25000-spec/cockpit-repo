import { ArrowLeft, Clock3, ImageOff, ShieldAlert, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { EstadoVazio } from "@/components/ui/empty-state";
import { ehAdministradora } from "@/lib/auth";
import { formatarData, formatarHora } from "@/lib/format";
import type { SobraDeFoto } from "@/lib/prontuario-imagens";
import { conferenciaDasFotos } from "@/server/consultas/prontuario-imagens";

export const metadata: Metadata = {
  title: "Conferência das fotos",
  description: "Fotos de evolução com registro e sem arquivo, ou com arquivo e sem registro.",
};

/**
 * Conferência entre o bucket das fotos e as linhas que as descrevem (0024).
 *
 * Só leitura. Nenhum botão apaga nada daqui: foto é dado de saúde, e a saída
 * dela é a eliminação com motivo, feita no prontuário por uma pessoa. A tela
 * só aponta onde olhar.
 */
export default async function PaginaConferenciaDasFotos() {
  const administradora = await ehAdministradora();
  const conferencia = administradora
    ? await conferenciaDasFotos()
    : { permitida: false as const, mensagem: "A conferência das fotos é restrita à administradora." };

  return (
    <div>
      <Link
        href="/configuracoes"
        className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm text-on-surface-variant transition-colors hover:text-primary sm:min-h-6"
      >
        <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
        Configurações
      </Link>

      <Card>
        <CardCabecalho
          titulo="Conferência das fotos"
          descricao="Compara os arquivos guardados com os registros das fotos de evolução. Nada é apagado por aqui."
        />

        <CardCorpo>
          {!conferencia.permitida ? (
            <EstadoVazio icone={ShieldAlert} titulo="Acesso restrito" descricao={conferencia.mensagem} />
          ) : conferencia.sobras.length === 0 ? (
            <EstadoVazio
              icone={ShieldCheck}
              titulo="Tudo confere"
              descricao="Cada foto registrada tem o seu arquivo, e cada arquivo tem o seu registro."
            />
          ) : (
            <div className="flex flex-col gap-8">
              <Grupo
                id="registro-sem-arquivo"
                titulo="Registro sem arquivo"
                explicacao="A foto aparece no prontuário sem a imagem. Abra o prontuário e use Eliminar, com o motivo, se o arquivo não for recuperado."
                sobras={conferencia.sobras.filter((s) => s.situacao === "metadado_sem_arquivo")}
              />
              <Grupo
                id="arquivo-sem-registro"
                titulo="Arquivo sem registro"
                explicacao="Um envio que parou no meio: o arquivo foi guardado e o registro não. Ele não aparece em tela nenhuma, nem no prontuário, e o sistema não o remove. Passada uma hora, quem administra o Supabase apaga, em Storage › prontuario-imagens, o objeto com o caminho abaixo — depois de reabrir esta tela e ver que ele continua sem registro."
                sobras={conferencia.sobras.filter((s) => s.situacao === "arquivo_sem_metadado")}
                semRegistro
              />
            </div>
          )}
        </CardCorpo>

        {conferencia.permitida ? (
          <CardRodape className="text-outline">
            Item com menos de uma hora pode ser um envio ainda em andamento: o arquivo sobe antes
            de o registro ser gravado. Nos registros do servidor, as falhas desse tipo aparecem como
            “fotos: arquivo órfão no bucket” e “fotos: linha sem arquivo após eliminação”.
          </CardRodape>
        ) : null}
      </Card>
    </div>
  );
}

function Grupo({
  id,
  titulo,
  explicacao,
  sobras,
  semRegistro = false,
}: {
  id: string;
  titulo: string;
  explicacao: string;
  sobras: SobraDeFoto[];
  /** Arquivo sem linha: o prontuário não o mostra, então não há o que abrir. */
  semRegistro?: boolean;
}) {
  return (
    <section aria-labelledby={id}>
      <h3 id={id} className="font-medium text-on-surface">
        {titulo} <span className="tabular text-on-surface-variant">({sobras.length})</span>
      </h3>
      <p className="mt-1 text-sm text-on-surface-variant">{explicacao}</p>

      {sobras.length === 0 ? (
        <p className="mt-3 text-sm text-outline">Nenhum item.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {sobras.map((sobra) => (
            <li
              key={`${sobra.situacao}-${sobra.caminho}`}
              className="flex flex-col gap-2 rounded-[var(--radius-cartao)] border border-card-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm text-on-surface">
                  <ImageOff aria-hidden="true" size={16} strokeWidth={1.5} className="shrink-0 text-outline" />
                  <span className="font-mono text-xs break-all">{sobra.caminho}</span>
                </p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Desde {formatarData(sobra.desde)}, {formatarHora(sobra.desde)}
                  {sobra.recente ? (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-[var(--radius-tag)] bg-atencao-fundo px-1.5 py-0.5 text-atencao">
                      <Clock3 aria-hidden="true" size={12} strokeWidth={1.75} />
                      envio possivelmente em andamento
                    </span>
                  ) : null}
                </p>
              </div>
              {semRegistro ? (
                <span className="shrink-0 text-xs text-outline">
                  {sobra.recente ? "Aguarde uma hora" : "Remover no Supabase"}
                </span>
              ) : sobra.prontuarioId ? (
                <Link
                  href={`/prontuarios/${sobra.prontuarioId}`}
                  className="inline-flex min-h-11 shrink-0 items-center text-sm font-medium text-primary underline-offset-2 hover:underline sm:min-h-6"
                >
                  Abrir prontuário
                </Link>
              ) : (
                <span className="shrink-0 text-xs text-outline">Pasta sem prontuário</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
