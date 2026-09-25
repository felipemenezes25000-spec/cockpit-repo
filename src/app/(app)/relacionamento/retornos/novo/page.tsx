import { CalendarCheck, MessageCircleMore, Repeat2 } from "lucide-react";
import type { Metadata } from "next";
import { FormularioRetorno } from "@/components/relacionamento/formulario-retorno";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";

export const metadata: Metadata = { title: "Novo retorno" };

export default function PaginaNovoRetorno() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <LinkDeVoltar href="/relacionamento?aba=retornos">Voltar ao relacionamento</LinkDeVoltar>

      <CabecalhoDePagina
        icone={Repeat2}
        rotulo="Relacionamento"
        titulo="Registrar retorno"
        descricao="Guarde a data combinada e o contexto do acompanhamento para que a próxima conversa aconteça na hora certa."
        meta={
          <>
            <SeloHero tom="informativo">Data combinada pela equipe</SeloHero>
            <SeloHero>Fila de acompanhamento</SeloHero>
          </>
        }
      />

      <Card>
        <CardCabecalho
          titulo="Detalhes do retorno"
          descricao="A data não é uma recomendação automática: ela registra o que foi combinado pela equipe com a paciente."
        />
        <CardCorpo className="py-7 sm:py-8">
          <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-w-0">
              <FormularioRetorno />
            </div>

            <aside className="integridade-cabine p-4 sm:p-5 xl:sticky xl:top-28">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-[var(--radius-controle)] bg-selecao text-primary">
                  <CalendarCheck aria-hidden="true" size={17} strokeWidth={1.75} />
                </span>
                <div>
                  <p className="rotulo text-primary">Bom acompanhamento</p>
                  <h2 className="mt-1 text-base font-semibold text-on-surface">Próximo passo explícito</h2>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                <div className="rounded-[var(--radius-controle)] border border-card-border bg-surface px-3.5 py-3">
                  <p className="text-xs font-semibold text-on-surface">Paciente certa</p>
                  <p className="mt-1 text-xs leading-5 text-outline">Associe o retorno à ficha para a equipe encontrar histórico e contato sem retrabalho.</p>
                </div>
                <div className="rounded-[var(--radius-controle)] border border-card-border bg-surface px-3.5 py-3">
                  <p className="text-xs font-semibold text-on-surface">Data combinada</p>
                  <p className="mt-1 text-xs leading-5 text-outline">O sistema organiza a fila; quem define o prazo é a equipe, conforme o caso.</p>
                </div>
                <div className="rounded-[var(--radius-controle)] border border-card-border bg-surface px-3.5 py-3">
                  <div className="flex items-center gap-2 text-primary">
                    <MessageCircleMore aria-hidden="true" size={14} strokeWidth={1.75} />
                    <p className="text-xs font-semibold">Contexto útil</p>
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-outline">Anote apenas o que ajuda a próxima conversa. Informação clínica continua no prontuário.</p>
                </div>
              </div>
            </aside>
          </div>
        </CardCorpo>
      </Card>
    </div>
  );
}
