import { ListChecks, ListTodo, UserRoundCheck } from "lucide-react";
import type { Metadata } from "next";
import { FormularioTarefa } from "@/components/relacionamento/formulario-tarefa";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";

export const metadata: Metadata = { title: "Nova tarefa de contato" };

export default function PaginaNovaTarefa() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <LinkDeVoltar href="/relacionamento?aba=tarefas">Voltar ao relacionamento</LinkDeVoltar>

      <CabecalhoDePagina
        icone={ListTodo}
        rotulo="Relacionamento"
        titulo="Criar tarefa de contato"
        descricao="Transforme um próximo passo em uma ação clara para a equipe, com paciente, contexto e prazo quando necessário."
        meta={
          <>
            <SeloHero tom="informativo">Acompanhamento manual</SeloHero>
            <SeloHero>Prazo opcional</SeloHero>
          </>
        }
      />

      <Card>
        <CardCabecalho
          titulo="Detalhes da tarefa"
          descricao="Registre o que precisa acontecer e deixe o próximo passo fácil de localizar na fila."
        />
        <CardCorpo className="py-7 sm:py-8">
          <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-w-0">
              <FormularioTarefa />
            </div>

            <aside className="integridade-cabine p-4 sm:p-5 xl:sticky xl:top-28">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-[var(--radius-controle)] bg-selecao text-primary">
                  <ListChecks aria-hidden="true" size={17} strokeWidth={1.75} />
                </span>
                <div>
                  <p className="rotulo text-primary">Fila operacional</p>
                  <h2 className="mt-1 text-base font-semibold text-on-surface">Uma tarefa, uma ação</h2>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                <div className="rounded-[var(--radius-controle)] border border-card-border bg-surface px-3.5 py-3">
                  <p className="text-xs font-semibold text-on-surface">Descrição objetiva</p>
                  <p className="mt-1 text-xs leading-5 text-outline">Escreva o próximo passo de forma que outra pessoa da equipe consiga executá-lo sem contexto extra.</p>
                </div>
                <div className="rounded-[var(--radius-controle)] border border-card-border bg-surface px-3.5 py-3">
                  <div className="flex items-center gap-2 text-primary">
                    <UserRoundCheck aria-hidden="true" size={14} strokeWidth={1.75} />
                    <p className="text-xs font-semibold">Paciente é opcional</p>
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-outline">Vincule quando a ação fizer parte do relacionamento com uma paciente específica.</p>
                </div>
                <div className="rounded-[var(--radius-controle)] border border-card-border bg-surface px-3.5 py-3">
                  <p className="text-xs font-semibold text-on-surface">Prioridade + prazo</p>
                  <p className="mt-1 text-xs leading-5 text-outline">Use prioridade para ordenar atenção e prazo somente quando houver uma data real a cumprir.</p>
                </div>
              </div>
            </aside>
          </div>
        </CardCorpo>
      </Card>
    </div>
  );
}
