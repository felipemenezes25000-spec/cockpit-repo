import { ListTodo } from "lucide-react";
import type { Metadata } from "next";
import { FormularioTarefa } from "@/components/relacionamento/formulario-tarefa";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";

export const metadata: Metadata = { title: "Nova tarefa de contato" };

export default function PaginaNovaTarefa() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
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
          <FormularioTarefa />
        </CardCorpo>
      </Card>
    </div>
  );
}
