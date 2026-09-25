import { Clock3, Database, HardDrive, ImageOff, Images, ShieldAlert, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { EstadoVazio } from "@/components/ui/empty-state";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";
import { ehAdministradora } from "@/lib/auth";
import { formatarData, formatarHora } from "@/lib/format";
import type { SobraDeFoto } from "@/lib/prontuario-imagens";
import { conferenciaDasFotos } from "@/server/consultas/prontuario-imagens";

export const metadata: Metadata = {
  title: "Conferência das fotos",
  description: "Fotos de evolução com registro e sem arquivo, ou com arquivo e sem registro.",
};

function MetricaIntegridade({ icone: Icone, rotulo, valor, apoio }: { icone: typeof Images; rotulo: string; valor: number; apoio: string }) {
  return (
    <div className="min-w-0 rounded-[var(--radius-painel)] border border-card-border bg-white/78 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="rotulo text-primary">{rotulo}</span>
        <span className="flex size-9 items-center justify-center rounded-[var(--radius-controle)] border border-primary-fixed bg-selecao text-primary">
          <Icone aria-hidden="true" size={17} strokeWidth={1.7} />
        </span>
      </div>
      <p className="numero mt-4 text-on-surface">{valor}</p>
      <p className="mt-1 text-xs leading-5 text-outline">{apoio}</p>
    </div>
  );
}

export default async function PaginaConferenciaDasFotos() {
  const administradora = await ehAdministradora();
  const conferencia = administradora
    ? await conferenciaDasFotos()
    : { permitida: false as const, mensagem: "A conferência das fotos é restrita à administradora." };

  const semArquivo = conferencia.permitida
    ? conferencia.sobras.filter((s) => s.situacao === "metadado_sem_arquivo")
    : [];
  const semRegistro = conferencia.permitida
    ? conferencia.sobras.filter((s) => s.situacao === "arquivo_sem_metadado")
    : [];
  const recentes = conferencia.permitida ? conferencia.sobras.filter((s) => s.recente).length : 0;

  return (
    <div className="page-reveal flex flex-col gap-6">
      <LinkDeVoltar href="/configuracoes">Voltar para configurações</LinkDeVoltar>

      <CabecalhoDePagina
        icone={Images}
        rotulo="Integridade clínica"
        titulo="Conferência das fotos"
        descricao="Compara os arquivos privados do Storage com os registros das fotos de evolução. A tela é deliberadamente somente leitura: nenhuma foto clínica é apagada daqui."
        meta={
          conferencia.permitida ? (
            <>
              <SeloHero tom={conferencia.sobras.length === 0 ? "positivo" : "atencao"}>
                {conferencia.sobras.length === 0 ? "Tudo confere" : `${conferencia.sobras.length} ${conferencia.sobras.length === 1 ? "divergência" : "divergências"}`}
              </SeloHero>
              <SeloHero>{semArquivo.length} registros sem arquivo</SeloHero>
              <SeloHero>{semRegistro.length} arquivos sem registro</SeloHero>
              {recentes > 0 ? <SeloHero tom="informativo">{recentes} possivelmente em envio</SeloHero> : null}
            </>
          ) : (
            <SeloHero tom="atencao">Acesso restrito</SeloHero>
          )
        }
      />

      {conferencia.permitida ? (
        <section aria-label="Pulso de integridade" className="integridade-cabine grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
          <MetricaIntegridade icone={Database} rotulo="Divergências" valor={conferencia.sobras.length} apoio={conferencia.sobras.length === 0 ? "metadados e arquivos estão reconciliados" : "itens precisam de conferência manual"} />
          <MetricaIntegridade icone={HardDrive} rotulo="Sem arquivo" valor={semArquivo.length} apoio="registro clínico existe, mas o objeto não foi localizado" />
          <MetricaIntegridade icone={Images} rotulo="Sem registro" valor={semRegistro.length} apoio={recentes > 0 ? `${recentes} ainda podem estar em processo de envio` : "objetos encontrados sem metadado correspondente"} />
        </section>
      ) : null}

      <Card>
        <CardCabecalho
          titulo="Reconciliação Storage × prontuário"
          descricao="Uma divergência não é apagada automaticamente: primeiro é preciso entender se houve falha de envio, eliminação parcial ou objeto órfão."
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
            <div className="grid gap-6 xl:grid-cols-2">
              <Grupo
                id="registro-sem-arquivo"
                titulo="Registro sem arquivo"
                explicacao="A foto aparece no prontuário sem a imagem. Abra o prontuário e use Eliminar, com o motivo, se o arquivo não for recuperado."
                sobras={semArquivo}
              />
              <Grupo
                id="arquivo-sem-registro"
                titulo="Arquivo sem registro"
                explicacao="Um envio que parou no meio: o arquivo foi guardado e o registro não. Itens com menos de uma hora podem estar em andamento; os antigos exigem conferência manual no Storage."
                sobras={semRegistro}
                semRegistro
              />
            </div>
          )}
        </CardCorpo>

        {conferencia.permitida ? (
          <CardRodape className="flex items-start gap-2 text-outline">
            <ShieldCheck aria-hidden="true" size={14} strokeWidth={1.75} className="mt-0.5 shrink-0 text-primary" />
            <span>
              O sistema não remove automaticamente objetos clínicos divergentes. Falhas parciais também são registradas no servidor para investigação sem expor conteúdo da paciente.
            </span>
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
  semRegistro?: boolean;
}) {
  return (
    <section aria-labelledby={id} className="integridade-cabine p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="rotulo text-primary">Conferência</p>
          <h3 id={id} className="mt-2 text-lg font-semibold tracking-[-0.02em] text-on-surface">{titulo}</h3>
        </div>
        <SeloHero tom={sobras.length > 0 ? "atencao" : "positivo"}>{sobras.length}</SeloHero>
      </div>
      <p className="mt-2 text-sm leading-6 text-on-surface-variant">{explicacao}</p>

      {sobras.length === 0 ? (
        <div className="mt-4 flex items-center gap-2 rounded-[var(--radius-controle)] border border-positivo-borda bg-positivo-fundo px-3 py-3 text-sm text-positivo">
          <ShieldCheck aria-hidden="true" size={16} strokeWidth={1.75} />
          Nenhum item.
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {sobras.map((sobra) => (
            <li
              key={`${sobra.situacao}-${sobra.caminho}`}
              className="integridade-item rounded-[var(--radius-cartao)] border border-card-border bg-surface px-3.5 py-3.5"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-controle)] bg-surface-container-low text-outline">
                  <ImageOff aria-hidden="true" size={15} strokeWidth={1.6} />
                </span>
                <div className="min-w-0 flex-1">
                  <code className="block text-[0.7rem] leading-5 break-all text-on-surface-variant">{sobra.caminho}</code>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-outline">
                    <span className="tabular">Desde {formatarData(sobra.desde)}, {formatarHora(sobra.desde)}</span>
                    {sobra.recente ? (
                      <SeloHero tom="atencao" className="min-h-6 px-2 py-0 text-[0.64rem]">
                        <Clock3 aria-hidden="true" size={11} strokeWidth={1.75} />
                        envio possivelmente em andamento
                      </SeloHero>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-3 border-t border-card-border pt-3 text-right">
                {semRegistro ? (
                  <span className="text-xs font-medium text-outline">{sobra.recente ? "Aguarde uma hora" : "Conferir no Supabase"}</span>
                ) : sobra.prontuarioId ? (
                  <Link href={`/prontuarios/${sobra.prontuarioId}`} className="inline-flex min-h-8 items-center rounded-[var(--radius-controle)] bg-selecao px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary-fixed">
                    Abrir prontuário
                  </Link>
                ) : (
                  <span className="text-xs text-outline">Pasta sem prontuário</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
