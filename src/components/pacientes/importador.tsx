"use client";

import {
  CircleAlert,
  CircleCheck,
  FileSpreadsheet,
  LoaderCircle,
  TriangleAlert,
  Upload,
  UserRoundCheck,
} from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { ENTRADA } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { formatarCpf, formatarTelefone } from "@/lib/paciente";
import {
  importarPacientes,
  type EstadoImportacao,
  type LinhaAnalisada,
} from "@/server/acoes/importar-pacientes";

const INICIAL: EstadoImportacao = {
  etapa: "vazio",
  falha: null,
  arquivo: null,
  codificacao: null,
  separador: null,
  colunas: [],
  colunasIgnoradas: [],
  linhas: [],
  resumo: { total: 0, prontas: 0, comErro: 0, jaCadastradas: 0 },
  gravadas: 0,
  recusadas: [],
};

const NOME_DO_SEPARADOR: Record<string, string> = {
  ";": "ponto-e-vírgula",
  ",": "vírgula",
  "\t": "tabulação",
};

function Enviar({
  rotulo,
  valor,
  variante,
  ocupadoRotulo,
  pending,
}: {
  rotulo: string;
  valor: "nao" | "sim";
  variante: "primaria" | "contorno";
  ocupadoRotulo: string;
  /**
   * Vem do `useActionState`, não do `useFormStatus`: o formulário é enviado
   * pelo `onSubmit` (ver `Importador`), e o `useFormStatus` só enxerga envio
   * feito pela prop `action` do `<form>`.
   */
  pending: boolean;
}) {
  return (
    <button
      type="submit"
      name="confirmar"
      value={valor}
      disabled={pending}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-controle)] px-6 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        variante === "primaria"
          ? "bg-primary-container text-on-primary hover:bg-primary-hover"
          : "border border-primary bg-surface text-primary hover:bg-surface-container-low",
      )}
    >
      {pending ? (
        <>
          <LoaderCircle aria-hidden="true" size={18} className="animate-spin" />
          {ocupadoRotulo}
        </>
      ) : (
        <>
          <Upload aria-hidden="true" size={18} strokeWidth={1.75} />
          {rotulo}
        </>
      )}
    </button>
  );
}

/** Um número grande com rótulo, para o resumo da prévia. */
function Contagem({
  valor,
  rotulo,
  tom,
}: {
  valor: number;
  rotulo: string;
  tom: "neutro" | "bom" | "atencao" | "erro";
}) {
  const cores = {
    neutro: "text-on-surface",
    bom: "text-positivo",
    atencao: "text-atencao",
    erro: "text-negativo",
  } as const;

  return (
    <div className="rounded-[var(--radius-cartao)] border border-card-border bg-surface px-4 py-3">
      <p className={cn("tabular t-headline", cores[tom])}>{valor}</p>
      <p className="mt-0.5 text-xs text-outline">{rotulo}</p>
    </div>
  );
}

function LinhaDaPrevia({ linha }: { linha: LinhaAnalisada }) {
  const v = linha.valores;

  const marca = {
    pronta: { texto: "Vai entrar", classe: "bg-positivo-fundo text-positivo" },
    erro: { texto: "Com erro", classe: "bg-negativo-fundo text-negativo" },
    // Pulada não é erro: o cadastro já existe e continua intacto.
    ja_cadastrada: { texto: "Já cadastrada", classe: "bg-atencao-fundo text-atencao" },
  }[linha.situacao];

  return (
    <li className="flex flex-col gap-2 border-b border-card-border px-4 py-3 last:border-b-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="tabular w-10 shrink-0 text-xs text-outline">
          {linha.numero}
        </span>
        <span className="font-medium text-on-surface">{v.nome || "(sem nome)"}</span>
        <span
          className={cn(
            "rounded-[var(--radius-tag)] px-1.5 py-0.5 text-[0.6875rem] font-medium",
            marca.classe,
          )}
        >
          {marca.texto}
        </span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 pl-13 text-xs text-outline">
        {v.cpf ? <span className="tabular">{formatarCpf(v.cpf)}</span> : null}
        {v.telefone ? (
          <span className="tabular">{formatarTelefone(v.telefone)}</span>
        ) : null}
        {v.email ? <span>{v.email}</span> : null}
        {v.data_nascimento ? (
          <span className="tabular">
            {v.data_nascimento.split("-").reverse().join("/")}
          </span>
        ) : null}
        {v.cidade ? <span>{[v.cidade, v.uf].filter(Boolean).join("/")}</span> : null}
      </div>

      {linha.jaCadastrada ? (
        <p className="pl-13 text-xs text-atencao">
          Mesmo CPF de{" "}
          <Link
            href={`/pacientes/${linha.jaCadastrada.id}`}
            className="underline hover:text-primary"
          >
            {linha.jaCadastrada.nome}
          </Link>
          . Esta linha será pulada.
        </p>
      ) : null}

      {linha.erros.map((erro) => (
        <p key={erro} className="flex items-start gap-1.5 pl-13 text-xs text-negativo">
          <CircleAlert aria-hidden="true" size={12} className="mt-0.5 shrink-0" />
          {erro}
        </p>
      ))}

      {linha.avisos.map((aviso) => (
        <p
          key={aviso}
          className="flex items-start gap-1.5 pl-13 text-xs text-on-surface-variant"
        >
          <TriangleAlert aria-hidden="true" size={12} className="mt-0.5 shrink-0" />
          {aviso}
        </p>
      ))}
    </li>
  );
}

/**
 * Monta o que o formulário envia, com o valor do botão que o enviou.
 *
 * `new FormData(form)` não inclui o botão de envio; é o nome/valor dele
 * ("confirmar" = "nao" | "sim") que separa analisar de gravar.
 */
function dadosDoEnvio(form: HTMLFormElement, botao: unknown): FormData {
  const dados = new FormData(form);
  if (botao instanceof HTMLButtonElement && botao.name) {
    dados.set(botao.name, botao.value);
  }
  return dados;
}

export function Importador({ modeloCsv }: { modeloCsv: string }) {
  const [estado, enviar, enviando] = useActionState(importarPacientes, INICIAL);

  // O arquivo precisa sobreviver entre "Analisar" e "Importar": o servidor
  // lê de novo o mesmo arquivo na segunda etapa. Com `<form action={...}>`,
  // o React 19 reinicia o formulário quando a ação termina — o campo de
  // arquivo (obrigatório) voltava vazio e "Importar" era barrado pela
  // validação do navegador, sem aviso nenhum. Enviando pelo `onSubmit`, o
  // formulário não é reiniciado. A validação nativa (`required`) continua
  // valendo: ela roda antes do evento de envio.
  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const nativo = evento.nativeEvent;
    const botao = "submitter" in nativo ? nativo.submitter : null;
    const dados = dadosDoEnvio(evento.currentTarget, botao);
    startTransition(() => enviar(dados));
  }

  // Trocar o arquivo depois da análise invalida a prévia: "Importar" gravaria
  // o arquivo novo, que ninguém conferiu. Guarda-se o estado em que a troca
  // aconteceu; quando chega uma análise nova, o estado é outro e o aviso some.
  const [trocadoEm, setTrocadoEm] = useState<EstadoImportacao | null>(null);
  const arquivoTrocado = trocadoEm !== null && trocadoEm === estado;

  const analisado = estado.etapa === "analisado";
  const concluido = estado.etapa === "concluido";

  // Só o que precisa de atenção aparece por padrão; o resto fica atrás do
  // "mostrar todas", para uma planilha de 800 linhas não virar uma parede.
  // Linha pronta com aviso também precisa de atenção: o aviso conta o que a
  // importação interpretou nela (data de dois dígitos, só o primeiro nome).
  const [mostrarTodas, setMostrarTodas] = useState(false);
  const comProblema = estado.linhas.filter(
    (l) => l.situacao !== "pronta" || l.avisos.length > 0,
  );
  const visiveis = mostrarTodas ? estado.linhas : comProblema;

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={aoEnviar} className="flex flex-col gap-6">
        <Card>
          <CardCabecalho
            titulo="Escolher a planilha"
            descricao="Arquivo CSV. No Excel: Arquivo › Salvar como › CSV."
          />

          <CardCorpo className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="arquivo" className="rotulo">
                Arquivo
              </label>
              <input
                id="arquivo"
                name="arquivo"
                type="file"
                accept=".csv,text/csv,text/plain"
                required
                onChange={() => {
                  if (estado.etapa === "analisado") setTrocadoEm(estado);
                }}
                className={cn(
                  ENTRADA,
                  "h-auto py-2.5 file:mr-3 file:cursor-pointer file:rounded-[var(--radius-tag)] file:border-0 file:bg-secondary-fixed file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary",
                )}
              />
              <p className="text-xs text-outline">
                A primeira linha precisa ser o cabeçalho, com uma coluna chamada
                &quot;Nome&quot;. As demais colunas são reconhecidas pelo nome —
                &quot;Celular&quot;, &quot;Data de Nascimento&quot;,
                &quot;E-mail&quot; e assim por diante. Limite de 2 MB por arquivo.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Enviar
                rotulo="Analisar arquivo"
                valor="nao"
                variante={analisado ? "contorno" : "primaria"}
                ocupadoRotulo="Lendo…"
                pending={enviando}
              />

              <a
                href={modeloCsv}
                download="modelo-pacientes.csv"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-controle)] px-4 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
              >
                <FileSpreadsheet aria-hidden="true" size={18} strokeWidth={1.75} />
                Baixar modelo
              </a>
            </div>

            {estado.falha ? (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-[var(--radius-cartao)] border border-error bg-error-container px-3.5 py-2.5 text-sm text-on-error-container"
              >
                <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
                {estado.falha}
              </p>
            ) : null}
          </CardCorpo>
        </Card>

        {/* Prévia --------------------------------------------------------- */}
        {analisado && !estado.falha ? (
          <Card>
            <CardCabecalho
              titulo="Confira antes de importar"
              descricao={`${estado.arquivo} · separado por ${
                NOME_DO_SEPARADOR[estado.separador ?? ";"] ?? "ponto-e-vírgula"
              }`}
            />

            <CardCorpo className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Contagem valor={estado.resumo.total} rotulo="linhas no arquivo" tom="neutro" />
                <Contagem valor={estado.resumo.prontas} rotulo="vão entrar" tom="bom" />
                <Contagem
                  valor={estado.resumo.jaCadastradas}
                  rotulo="já cadastradas"
                  tom="atencao"
                />
                <Contagem valor={estado.resumo.comErro} rotulo="com erro" tom="erro" />
              </div>

              {estado.codificacao === "windows-1252" ? (
                <p className="flex items-start gap-2 rounded-[var(--radius-cartao)] border border-outline-variant bg-surface-container-low px-3.5 py-2.5 text-xs text-on-surface-variant">
                  <TriangleAlert aria-hidden="true" size={14} className="mt-0.5 shrink-0" />
                  O arquivo não está em UTF-8. Li como Windows-1252, que é o que o
                  Excel grava por padrão. Confira os acentos na lista abaixo antes
                  de confirmar.
                </p>
              ) : null}

              <div>
                <p className="rotulo mb-2">Colunas reconhecidas</p>
                <div className="flex flex-wrap gap-2">
                  {estado.colunas.map((coluna) => (
                    <span
                      key={coluna.rotulo}
                      className="rounded-[var(--radius-tag)] bg-secondary-fixed px-2 py-1 text-xs text-primary"
                    >
                      {coluna.rotulo} → {coluna.campo}
                    </span>
                  ))}
                </div>

                {estado.colunasIgnoradas.length > 0 ? (
                  <p className="mt-3 text-xs text-outline">
                    Ignoradas, porque o sistema ainda não tem onde guardar:{" "}
                    {estado.colunasIgnoradas.join(", ")}.
                  </p>
                ) : null}
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="rotulo">
                    {mostrarTodas
                      ? `Todas as ${estado.linhas.length} linhas`
                      : `${comProblema.length} ${
                          comProblema.length === 1
                            ? "linha que precisa de atenção"
                            : "linhas que precisam de atenção"
                        }`}
                  </p>
                  <button
                    type="button"
                    onClick={() => setMostrarTodas((v) => !v)}
                    className="text-xs font-medium text-primary underline"
                  >
                    {mostrarTodas ? "Mostrar só as que precisam de atenção" : "Mostrar todas"}
                  </button>
                </div>

                {visiveis.length === 0 ? (
                  <p className="flex items-center gap-2 rounded-[var(--radius-cartao)] border border-card-border bg-surface px-4 py-4 text-sm text-on-surface-variant">
                    <CircleCheck
                      aria-hidden="true"
                      size={16}
                      className="shrink-0 text-primary"
                    />
                    Nenhum problema encontrado. Todas as linhas estão prontas.
                  </p>
                ) : (
                  <ul className="rolagem-esmaecida max-h-[28rem] overflow-y-auto rounded-[var(--radius-cartao)] border border-card-border bg-surface">
                    {visiveis.map((linha) => (
                      <LinhaDaPrevia key={linha.numero} linha={linha} />
                    ))}
                  </ul>
                )}
              </div>
            </CardCorpo>

            <CardRodape className="flex flex-wrap items-center gap-3">
              {arquivoTrocado ? (
                <span role="status" className="text-sm text-on-surface-variant">
                  O arquivo foi trocado depois da análise. Analise de novo antes de importar.
                </span>
              ) : estado.resumo.prontas > 0 ? (
                <>
                  <Enviar
                    rotulo={`Importar ${estado.resumo.prontas} ${
                      estado.resumo.prontas === 1 ? "paciente" : "pacientes"
                    }`}
                    valor="sim"
                    variante="primaria"
                    ocupadoRotulo="Gravando…"
                    pending={enviando}
                  />
                  <span className="text-xs text-outline">
                    As linhas com erro e as já cadastradas não serão gravadas.
                  </span>
                </>
              ) : (
                <span className="text-sm text-on-surface-variant">
                  Nenhuma linha está pronta. Corrija a planilha e analise de novo.
                </span>
              )}
            </CardRodape>
          </Card>
        ) : null}
      </form>

      {/* Resultado -------------------------------------------------------- */}
      {concluido ? (
        <Card>
          <CardCabecalho titulo="Importação concluída" />
          <CardCorpo className="flex flex-col gap-4">
            <p className="flex items-start gap-2 text-sm text-on-surface">
              <UserRoundCheck
                aria-hidden="true"
                size={18}
                strokeWidth={1.75}
                className="mt-0.5 shrink-0 text-primary"
              />
              <span>
                <strong className="tabular">{estado.gravadas}</strong>{" "}
                {estado.gravadas === 1 ? "paciente foi cadastrada" : "pacientes foram cadastradas"}
                .{" "}
                {estado.resumo.jaCadastradas > 0 ? (
                  <>
                    {estado.resumo.jaCadastradas}{" "}
                    {estado.resumo.jaCadastradas === 1 ? "já existia" : "já existiam"} e{" "}
                    {estado.resumo.jaCadastradas === 1 ? "foi pulada" : "foram puladas"}.{" "}
                  </>
                ) : null}
                {estado.resumo.comErro > 0 ? (
                  <>
                    {estado.resumo.comErro}{" "}
                    {estado.resumo.comErro === 1
                      ? "linha ficou de fora por erro"
                      : "linhas ficaram de fora por erro"}
                    .
                  </>
                ) : null}
              </span>
            </p>

            {estado.recusadas.length > 0 ? (
              <div>
                <p className="rotulo mb-2 text-negativo">Recusadas pelo banco</p>
                <ul className="flex flex-col gap-1">
                  {estado.recusadas.map((r) => (
                    <li key={r.numero} className="text-xs text-negativo">
                      Linha {r.numero} — {r.nome}: {r.motivo}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/pacientes"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-controle)] bg-primary-container px-6 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover"
              >
                Ver a lista de pacientes
              </Link>
              {/* `useActionState` não tem reset: recarregar é o jeito honesto
                  de voltar ao começo sem fingir um estado que não existe. */}
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex h-11 items-center justify-center px-6 text-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
              >
                Importar outra planilha
              </button>
            </div>
          </CardCorpo>
        </Card>
      ) : null}
    </div>
  );
}
