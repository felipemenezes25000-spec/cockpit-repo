import { Archive, FileCheck2, FilePlus2, FileSignature, Layers3, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { EstruturaPendenteDocumento } from "@/components/documentos/estrutura-pendente";
import { ListaModelos } from "@/components/documentos/lista-modelos";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { CabecalhoDePagina, SeloHero } from "@/components/ui/page-hero";
import { ehAdministradora } from "@/lib/auth";
import {
  EstruturaDocumentoPendenteError,
  listarModelos,
} from "@/server/consultas/documentos";

export const metadata: Metadata = {
  title: "Modelos de documento",
  description: "Textos-base de contrato, termo e orientação.",
};

function Indicador({ icone: Icone, rotulo, valor, detalhe }: { icone: typeof Layers3; rotulo: string; valor: string; detalhe: string }) {
  return (
    <div className="financeiro-metrica-cabine">
      <span className="flex items-center justify-between gap-3 text-cabine-texto-secundario">
        <span className="rotulo text-[0.62rem] text-current">{rotulo}</span>
        <Icone aria-hidden="true" size={16} strokeWidth={1.75} />
      </span>
      <strong className="mt-3 block text-2xl font-semibold tracking-[-0.035em] text-cabine-texto">{valor}</strong>
      <span className="mt-1 block text-[0.7rem] leading-4 text-cabine-texto-secundario">{detalhe}</span>
    </div>
  );
}

export default async function PaginaModelos() {
  const administradora = await ehAdministradora();

  const modelos = await listarModelos({ incluirInativos: administradora }).catch((erro: unknown) => {
    if (erro instanceof EstruturaDocumentoPendenteError) return null;
    throw erro;
  });

  if (!modelos) return <EstruturaPendenteDocumento />;

  const ativos = modelos.filter((modelo) => modelo.ativo);
  const aposentados = modelos.filter((modelo) => !modelo.ativo);
  const semTexto = modelos.filter((modelo) => modelo.versaoAtual <= 0);
  const emitidosConhecidos = modelos.reduce((total, modelo) => total + (modelo.emitidos ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoDePagina
        icone={Layers3}
        rotulo="Documentos"
        titulo="Modelos de documento"
        descricao="Textos-base versionados que dão origem a contratos, termos, orientações e anamneses. Cada emissão congela sua própria cópia."
        acoes={
          <>
            <BotaoLink href="/formularios" variante="contorno" tamanho="sm">
              <FileSignature aria-hidden="true" size={16} strokeWidth={1.75} />
              Documentos
            </BotaoLink>
            {administradora ? (
              <BotaoLink href="/formularios/modelos/novo" variante="primaria" tamanho="sm">
                <FilePlus2 aria-hidden="true" size={16} strokeWidth={1.75} />
                Novo modelo
              </BotaoLink>
            ) : null}
          </>
        }
        meta={
          <>
            <SeloHero tom="informativo">{modelos.length} {modelos.length === 1 ? "modelo visível" : "modelos visíveis"}</SeloHero>
            <SeloHero>Emissões ficam congeladas</SeloHero>
            {administradora ? <SeloHero tom="positivo">Versionamento liberado</SeloHero> : <SeloHero>Consulta de modelos</SeloHero>}
          </>
        }
      />

      <section className="cabine financeiro-cabine p-4 sm:p-5" aria-label="Saúde da biblioteca de modelos">
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="rotulo text-cabine-texto-secundario">Biblioteca documental</p>
              <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.03em] text-cabine-texto sm:text-2xl">Textos prontos para virar registro</h2>
            </div>
            <p className="max-w-md text-xs leading-5 text-cabine-texto-secundario">Modelo evolui por versão; documento emitido preserva a cópia que existia naquele momento.</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <Indicador icone={FileCheck2} rotulo="Ativos" valor={String(ativos.length)} detalhe="disponíveis para emissão" />
            <Indicador icone={Archive} rotulo="Aposentados" valor={String(aposentados.length)} detalhe="preservados no histórico" />
            <Indicador icone={FileSignature} rotulo="Emissões" valor={administradora ? String(emitidosConhecidos) : "—"} detalhe={administradora ? "documentos originados" : "conforme permissão"} />
            <Indicador icone={ShieldCheck} rotulo="Integridade" valor={semTexto.length === 0 ? "OK" : String(semTexto.length)} detalhe={semTexto.length === 0 ? "todos com versão utilizável" : "modelos ainda sem texto"} />
          </div>
        </div>
      </section>

      <Card>
        <CardCabecalho titulo="Biblioteca de modelos" descricao="Versões novas mudam somente emissões futuras; documentos anteriores continuam intactos." />
        <CardCorpo><ListaModelos modelos={modelos} administradora={administradora} /></CardCorpo>
        {!administradora ? (
          <CardRodape className="text-outline">
            A recepção consulta os modelos para saber o que emitir. Quem escreve, versiona e aposenta é a administradora.
          </CardRodape>
        ) : null}
      </Card>
    </div>
  );
}
