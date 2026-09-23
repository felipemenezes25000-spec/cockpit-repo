import { Cake, CalendarCheck, ClipboardList, Repeat2, Star, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BuscarConvite } from "@/components/relacionamento/buscar-convite";
import { ConviteContato } from "@/components/relacionamento/convite-contato";
import { NavegacaoEmAbas } from "@/components/ui/abas";
import { BotaoDeAcao, FormularioDeAcao } from "@/components/ui/formulario-acao";
import { BotaoLink } from "@/components/ui/button";
import { recortarFila } from "@/components/relacionamento/fila";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { EstadoVazio } from "@/components/ui/empty-state";
import { classeDeEntrada } from "@/components/ui/field";
import { SituacaoChip } from "@/components/ui/status-chip";
import { diferencaEmDias, partesDoDia } from "@/lib/dates";
import { descreverPrazo, formatarData, formatarHora } from "@/lib/format";
import type { SituacaoAcompanhamento } from "@/lib/dominio";
import { ROTULO_TAREFA } from "@/lib/relacionamento";
import {
  confirmarPelaLista,
  mudarSituacaoRetorno,
  mudarSituacaoTarefa,
} from "@/server/acoes/relacionamento";
import {
  aniversariosDoMes,
  candidatasAAvaliacao,
  confirmacoesParaContato,
  contatosRegistrados,
  retornosParaContato,
  tarefasDeContato,
  type RetornoRelacionamento,
  type TarefaRelacionamento,
} from "@/server/consultas/relacionamento";

export const metadata: Metadata = {
  title: "Relacionamento",
  description: "Confirmações, retornos, aniversários, convites de avaliação e tarefas de contato.",
};

const ABAS = ["visao", "confirmacoes", "retornos", "aniversarios", "avaliacoes", "tarefas"] as const;
type AbaDoModulo = (typeof ABAS)[number];

const ROTULO_ABA: Record<AbaDoModulo, string> = {
  visao: "Visão geral",
  confirmacoes: "Confirmações",
  retornos: "Retornos",
  aniversarios: "Aniversários",
  avaliacoes: "Avaliações",
  tarefas: "Tarefas",
};

const ROTULO_RETORNO = {
  nao_iniciado: "Não iniciado",
  em_contato: "Em contato",
  aguardando_resposta: "Aguardando resposta",
  agendado: "Agendado",
  recusado: "Recusado",
} as const;

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function abaDaUrl(valor: string | string[] | undefined): AbaDoModulo {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  return ABAS.find((aba) => aba === texto) ?? "visao";
}

function mesDaUrl(valor: string | string[] | undefined): number {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  const mes = Number(texto);
  return Number.isInteger(mes) && mes >= 1 && mes <= 12 ? mes : partesDoDia().mes;
}

/** Linha de lista com a informação à esquerda e as ações à direita (embaixo, no celular). */
function Linha({ children, acoes }: { children: React.ReactNode; acoes: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b border-card-border py-4 last:border-0">
      <div className="min-w-[12rem] flex-1">{children}</div>
      <div className="flex flex-wrap items-center gap-2">{acoes}</div>
    </li>
  );
}

function Tarefa({ tarefa }: { tarefa: TarefaRelacionamento }) {
  const aberta = tarefa.situacao === "aberta";
  const atrasada = aberta && tarefa.prazo !== null && diferencaEmDias(tarefa.prazo) < 0;
  const situacao = aberta ? "Aberta" : tarefa.situacao === "resolvida" ? "Resolvida" : "Cancelada";

  return (
    <Linha
      acoes={
        <>
          <FormularioDeAcao
            acao={mudarSituacaoTarefa}
            campos={{ id: tarefa.id, para: aberta ? "resolvida" : "aberta" }}
            alinhamento="fim"
          >
            <BotaoDeAcao
              tamanho="xs"
              tom={aberta ? "positivo" : "neutro"}
              rotuloAcessivel={`${aberta ? "Concluir" : "Reabrir"} tarefa: ${tarefa.descricao}`}
            >
              {aberta ? "Concluir" : "Reabrir"}
            </BotaoDeAcao>
          </FormularioDeAcao>
          {aberta ? (
            <FormularioDeAcao
              acao={mudarSituacaoTarefa}
              campos={{ id: tarefa.id, para: "cancelada" }}
              alinhamento="fim"
            >
              <BotaoDeAcao tamanho="xs" tom="negativo" rotuloAcessivel={`Cancelar tarefa: ${tarefa.descricao}`}>
                Cancelar
              </BotaoDeAcao>
            </FormularioDeAcao>
          ) : null}
        </>
      }
    >
      <p className="text-sm font-medium text-on-surface">{tarefa.descricao}</p>
      <p className="mt-1 text-xs text-outline">
        {ROTULO_TAREFA[tarefa.tipo as keyof typeof ROTULO_TAREFA] ?? "Tarefa"} ·{" "}
        {tarefa.paciente ?? "Sem paciente"} · {tarefa.prazo ? formatarData(tarefa.prazo) : "Sem prazo"} · {situacao}
      </p>
      {atrasada ? <p className="mt-1 text-xs font-medium text-negativo">Atrasada</p> : null}
    </Linha>
  );
}

/** Um botão de passo do retorno; o nome da paciente vai para o leitor de tela. */
function PassoRetorno({
  retorno,
  para,
  rotulo,
  tom = "neutro",
}: {
  retorno: RetornoRelacionamento;
  para: SituacaoAcompanhamento;
  rotulo: string;
  tom?: "neutro" | "positivo" | "negativo" | "informativo";
}) {
  return (
    <FormularioDeAcao acao={mudarSituacaoRetorno} campos={{ id: retorno.id, para }} alinhamento="fim">
      <BotaoDeAcao tamanho="xs" tom={tom} rotuloAcessivel={`${rotulo}: retorno de ${retorno.paciente}`}>
        {rotulo}
      </BotaoDeAcao>
    </FormularioDeAcao>
  );
}

function Retorno({ retorno }: { retorno: RetornoRelacionamento }) {
  const aberto = retorno.situacao !== "agendado" && retorno.situacao !== "recusado";

  return (
    <Linha
      acoes={
        aberto ? (
          <>
            {retorno.situacao !== "em_contato" ? (
              <PassoRetorno retorno={retorno} para="em_contato" rotulo="Em contato" tom="informativo" />
            ) : null}
            {retorno.situacao !== "aguardando_resposta" ? (
              <PassoRetorno retorno={retorno} para="aguardando_resposta" rotulo="Aguardar resposta" />
            ) : null}
            <PassoRetorno retorno={retorno} para="agendado" rotulo="Agendado" tom="positivo" />
            <PassoRetorno retorno={retorno} para="recusado" rotulo="Recusou" tom="negativo" />
          </>
        ) : (
          <PassoRetorno retorno={retorno} para="em_contato" rotulo="Reabrir" />
        )
      }
    >
      <Link href={`/pacientes/${retorno.pacienteId}`} className="inline-flex min-h-6 items-center text-sm font-medium text-primary hover:underline">
        {retorno.paciente}
      </Link>
      <p className="mt-1 text-xs text-outline">
        {retorno.procedimento ? `${retorno.procedimento} · ` : ""}
        Contato {descreverPrazo(diferencaEmDias(retorno.sugeridoPara))} · {formatarData(retorno.sugeridoPara)} ·{" "}
        {ROTULO_RETORNO[retorno.situacao]}
      </p>
      {retorno.telefone ? <p className="mt-1 text-xs text-outline">{retorno.telefone}</p> : null}
      {retorno.observacoes ? <p className="mt-1 text-xs text-on-surface-variant">{retorno.observacoes}</p> : null}
    </Linha>
  );
}

function Indicador({
  href,
  titulo,
  valor,
  icone: Icone,
}: {
  href: string;
  titulo: string;
  valor: string | number;
  icone: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-3 rounded-[var(--radius-painel)] border border-card-border bg-card p-4 transition-colors hover:border-primary sm:p-5"
    >
      <Icone aria-hidden="true" size={19} strokeWidth={1.75} className="text-primary" />
      <span>
        <span className="tabular block text-2xl font-semibold text-on-surface">{valor}</span>
        <span className="mt-1 block text-xs text-on-surface-variant">{titulo}</span>
      </span>
    </Link>
  );
}

export default async function PaginaRelacionamento({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametros = await searchParams;
  const aba = abaDaUrl(parametros.aba);
  const [confirmacoes, retornos, tarefas, candidatas] = await Promise.all([
    confirmacoesParaContato(),
    retornosParaContato(),
    tarefasDeContato(),
    // Só a visão geral mostra o total; a aba de avaliações busca a lista dela.
    aba === "visao" ? candidatasAAvaliacao() : Promise.resolve([]),
  ]);

  const abertas = tarefas.filter((t) => t.situacao === "aberta");
  const retornosNoPrazo = retornos.filter(
    (r) => r.situacao !== "agendado" && r.situacao !== "recusado" && diferencaEmDias(r.sugeridoPara) <= 0,
  );
  const fila = recortarFila(abertas, retornosNoPrazo);

  const contagens: Partial<Record<AbaDoModulo, number>> = {
    confirmacoes: confirmacoes.length,
    retornos: retornosNoPrazo.length,
    tarefas: abertas.length,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-on-surface-variant">
          Contatos antes e depois do atendimento, organizados para a equipe.
        </p>
        <div className="flex flex-wrap gap-2">
          <BotaoLink href="/relacionamento/retornos/novo" tamanho="sm">
            Novo retorno
          </BotaoLink>
          <BotaoLink href="/relacionamento/tarefas/nova" variante="primaria" tamanho="sm">
            Criar tarefa
          </BotaoLink>
        </div>
      </div>

      <NavegacaoEmAbas
        rotulo="Seções de relacionamento"
        abas={ABAS.map((item) => ({
          href: `/relacionamento?aba=${item}`,
          rotulo: ROTULO_ABA[item],
          ativa: aba === item,
          contagem: contagens[item],
        }))}
      />

      {aba === "visao" ? (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Indicador href="/relacionamento?aba=confirmacoes" titulo="A confirmar" valor={confirmacoes.length} icone={CalendarCheck} />
            <Indicador href="/relacionamento?aba=retornos" titulo="Retornos na data" valor={retornosNoPrazo.length} icone={Repeat2} />
            <Indicador href="/relacionamento?aba=tarefas" titulo="Tarefas abertas" valor={abertas.length} icone={ClipboardList} />
            <Indicador href="/relacionamento?aba=avaliacoes" titulo="Convites de avaliação" valor={candidatas.length} icone={Star} />
          </div>

          <Card>
            <CardCabecalho
              titulo="Fila de acompanhamento"
              descricao="Tarefas abertas e retornos que chegaram à data combinada."
            />
            <CardCorpo>
              {abertas.length + retornosNoPrazo.length === 0 ? (
                <EstadoVazio
                  icone={ClipboardList}
                  titulo="Acompanhamento em dia"
                  descricao="As próximas ações aparecerão aqui."
                />
              ) : (
                <ul>
                  {fila.tarefas.map((t) => (
                    <Tarefa key={t.id} tarefa={t} />
                  ))}
                  {fila.retornos.map((r) => (
                    <Retorno key={r.id} retorno={r} />
                  ))}
                </ul>
              )}
            </CardCorpo>
            {fila.tarefasOcultas + fila.retornosOcultos > 0 ? (
              <CardRodape className="flex flex-wrap gap-x-4 gap-y-2 text-on-surface-variant">
                {fila.tarefasOcultas > 0 ? (
                  <Link href="/relacionamento?aba=tarefas" className="inline-flex min-h-6 items-center font-medium text-primary hover:underline">
                    Ver mais {fila.tarefasOcultas} {fila.tarefasOcultas === 1 ? "tarefa aberta" : "tarefas abertas"}
                  </Link>
                ) : null}
                {fila.retornosOcultos > 0 ? (
                  <Link href="/relacionamento?aba=retornos" className="inline-flex min-h-6 items-center font-medium text-primary hover:underline">
                    Ver mais {fila.retornosOcultos} {fila.retornosOcultos === 1 ? "retorno na data" : "retornos na data"}
                  </Link>
                ) : null}
              </CardRodape>
            ) : null}
          </Card>
        </>
      ) : null}

      {aba === "confirmacoes" ? (
        <Card>
          <CardCabecalho titulo="Confirmações" descricao="Atendimentos dos próximos 15 dias ainda sem confirmação." />
          <CardCorpo>
            {confirmacoes.length === 0 ? (
              <EstadoVazio icone={CalendarCheck} titulo="Tudo confirmado" descricao="Não há atendimentos aguardando confirmação." />
            ) : (
              <ul>
                {confirmacoes.map((item) => (
                  <Linha
                    key={item.id}
                    acoes={
                      <>
                        <SituacaoChip situacao={item.situacao} compacto />
                        {item.situacao === "agendado" ? (
                          <FormularioDeAcao
                            acao={confirmarPelaLista}
                            campos={{ id: item.id, para: "aguardando_confirmacao" }}
                            alinhamento="fim"
                          >
                            <BotaoDeAcao tamanho="xs" rotuloAcessivel={`Aguardando resposta: ${item.paciente}`}>
                              Aguardando resposta
                            </BotaoDeAcao>
                          </FormularioDeAcao>
                        ) : null}
                        <FormularioDeAcao acao={confirmarPelaLista} campos={{ id: item.id, para: "confirmado" }} alinhamento="fim">
                          <BotaoDeAcao tamanho="xs" tom="positivo" rotuloAcessivel={`Confirmar: ${item.paciente}`}>
                            Confirmar
                          </BotaoDeAcao>
                        </FormularioDeAcao>
                      </>
                    }
                  >
                    <Link href={`/pacientes/${item.pacienteId}`} className="inline-flex min-h-6 items-center text-sm font-medium text-primary hover:underline">
                      {item.paciente}
                    </Link>
                    <p className="mt-1 text-xs text-outline">
                      {item.procedimento} · {formatarData(item.inicio)} às {formatarHora(item.inicio)}
                    </p>
                    <p className="mt-1 text-xs text-outline">{item.telefone || item.email || "Sem contato cadastrado"}</p>
                  </Linha>
                ))}
              </ul>
            )}
          </CardCorpo>
        </Card>
      ) : null}

      {aba === "retornos" ? (
        <Card>
          <CardCabecalho
            titulo="Retornos"
            descricao="Datas combinadas pela equipe e situação de cada contato."
          />
          <CardCorpo>
            {retornos.length === 0 ? (
              <EstadoVazio icone={Repeat2} titulo="Nenhum retorno" descricao="Registre uma data combinada para acompanhar a paciente." />
            ) : (
              <ul>
                {retornos.map((r) => (
                  <Retorno key={r.id} retorno={r} />
                ))}
              </ul>
            )}
          </CardCorpo>
        </Card>
      ) : null}

      {aba === "tarefas" ? (
        <Card>
          <CardCabecalho
            titulo="Tarefas de contato"
            descricao={`${abertas.length} em aberto · ${tarefas.length - abertas.length} resolvidas ou canceladas`}
          />
          <CardCorpo>
            {tarefas.length === 0 ? (
              <EstadoVazio icone={ClipboardList} titulo="Nenhuma tarefa" descricao="Crie uma tarefa para não perder um contato importante." />
            ) : (
              <ul>
                {[...abertas, ...tarefas.filter((t) => t.situacao !== "aberta")].map((t) => (
                  <Tarefa key={t.id} tarefa={t} />
                ))}
              </ul>
            )}
          </CardCorpo>
        </Card>
      ) : null}

      {aba === "aniversarios" ? <Aniversarios mes={mesDaUrl(parametros.mes)} /> : null}
      {aba === "avaliacoes" ? <Avaliacoes /> : null}
    </div>
  );
}

async function Aniversarios({ mes }: { mes: number }) {
  const pessoas = await aniversariosDoMes(mes);

  return (
    <Card>
      <CardCabecalho
        titulo="Aniversários"
        descricao="Prepare a mensagem e registre o envio manual."
        acao={
          // GET: o mês vai para a URL e o Enter funciona sem JavaScript.
          <form method="get" className="flex items-center gap-2">
            <input type="hidden" name="aba" value="aniversarios" />
            <label htmlFor="mes" className="sr-only">
              Mês
            </label>
            <select id="mes" name="mes" defaultValue={mes} className={classeDeEntrada({ altura: "compacta", largura: "auto" })}>
              {MESES.map((nome, i) => (
                <option key={nome} value={i + 1}>
                  {nome}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-[var(--radius-cartao)] border border-card-border bg-surface px-3 text-sm font-medium text-primary transition-colors hover:bg-surface-container-low"
            >
              Ver
            </button>
          </form>
        }
      />
      <CardCorpo>
        {pessoas.length === 0 ? (
          <EstadoVazio icone={Cake} titulo="Nenhum aniversário neste mês" descricao="Escolha outro mês para consultar." />
        ) : (
          <ul>
            {pessoas.map((p) => (
              <Linha
                key={p.id}
                acoes={<ConviteContato pacienteId={p.id} nome={p.nome} telefone={p.telefone} tipo="aniversario" />}
              >
                <Link href={`/pacientes/${p.id}`} className="inline-flex min-h-6 items-center text-sm font-medium text-primary hover:underline">
                  {p.nome}
                </Link>
                <p className="mt-1 text-xs text-outline">
                  Dia {p.dia} de {MESES[mes - 1]} ·{" "}
                  <span className="whitespace-nowrap">{p.telefone || "Sem telefone cadastrado"}</span>
                </p>
              </Linha>
            ))}
          </ul>
        )}
      </CardCorpo>
    </Card>
  );
}

async function Avaliacoes() {
  const [pessoas, contatos] = await Promise.all([candidatasAAvaliacao(), contatosRegistrados()]);
  const convites = contatos.filter((c) => c.tipo === "avaliacao");

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardCabecalho titulo="Convidar uma paciente" descricao="Busque qualquer paciente ativa para preparar o link de avaliação." />
        <CardCorpo>
          <BuscarConvite />
        </CardCorpo>
      </Card>

      <Card>
        <CardCabecalho
          titulo="Convites para avaliar no Google"
          descricao="Pacientes atendidas recentemente. Abra a mensagem e marque o envio depois de concluí-lo."
        />
        <CardCorpo>
          {pessoas.length === 0 ? (
            <EstadoVazio icone={Star} titulo="Nenhum atendimento concluído" descricao="Pacientes atendidas aparecerão aqui." />
          ) : (
            <ul>
              {pessoas.map((p) => (
                <Linha
                  key={p.id}
                  acoes={<ConviteContato pacienteId={p.id} nome={p.nome} telefone={p.telefone} tipo="avaliacao" />}
                >
                  <Link href={`/pacientes/${p.id}`} className="inline-flex min-h-6 items-center text-sm font-medium text-primary hover:underline">
                    {p.nome}
                  </Link>
                  <p className="mt-1 text-xs text-outline">
                    Último atendimento em {formatarData(p.ultimoAtendimento)} ·{" "}
                    <span className="whitespace-nowrap">{p.telefone || "Sem telefone cadastrado"}</span>
                  </p>
                </Linha>
              ))}
            </ul>
          )}
        </CardCorpo>
      </Card>

      <Card>
        <CardCabecalho
          titulo="Convites registrados"
          descricao="O sistema registra o envio informado pela equipe, sem consultar a avaliação no Google."
        />
        <CardCorpo>
          {convites.length === 0 ? (
            <EstadoVazio icone={Star} titulo="Nenhum convite registrado" descricao="Após o envio, marque a paciente na lista acima." />
          ) : (
            <ul>
              {convites.map((c) => (
                <li key={c.id} className="flex flex-wrap justify-between gap-2 border-b border-card-border py-3 text-sm last:border-0">
                  <Link href={`/pacientes/${c.pacienteId}`} className="inline-flex min-h-6 items-center font-medium text-primary hover:underline">
                    {c.paciente}
                  </Link>
                  <time dateTime={c.quando.toISOString()} className="text-xs text-outline">
                    {formatarData(c.quando)} às {formatarHora(c.quando)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </CardCorpo>
      </Card>
    </div>
  );
}
