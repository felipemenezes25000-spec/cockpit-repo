import { IdCard, Mail, MapPin, MessageCircle, NotebookPen, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { formatarCep, formatarCpf, formatarEndereco, formatarTelefone, linkWhatsapp, enderecoVazio } from "@/lib/paciente";
import type { PacienteCompleto } from "@/server/consultas/pacientes";

function Dado({
  icone,
  rotulo,
  children,
}: {
  icone: ReactNode;
  rotulo: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-controle)] border border-card-border bg-surface px-3.5 py-3">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-controle)] bg-selecao text-primary">{icone}</span>
        <div className="min-w-0 flex-1">
          <p className="rotulo mb-1.5 text-[0.64rem] text-outline">{rotulo}</p>
          <div className="text-sm leading-6 break-words text-on-surface">{children}</div>
        </div>
      </div>
    </div>
  );
}

const VAZIO = <span className="text-outline">Não informado</span>;

export function PainelCadastro({ paciente }: { paciente: PacienteCompleto }) {
  const whatsapp = linkWhatsapp(paciente.telefone);
  const temEndereco = !enderecoVazio(paciente.endereco);

  return (
    <Card>
      <CardCabecalho titulo="Cadastro" descricao="Contato, identificação e informações administrativas." />
      <CardCorpo className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <Dado icone={<Phone size={16} strokeWidth={1.65} />} rotulo="Telefone">
          {paciente.telefone ? (
            <div className="flex flex-wrap items-center gap-2.5">
              <a href={`tel:+55${paciente.telefone}`} className="tabular inline-flex min-h-6 items-center font-medium hover:text-primary hover:underline">
                {formatarTelefone(paciente.telefone)}
              </a>
              {whatsapp ? (
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-7 items-center gap-1.5 rounded-[var(--radius-controle)] border border-positivo-borda bg-positivo-fundo px-2.5 text-xs font-semibold text-positivo transition-[transform,background-color] duration-150 hover:bg-positivo-fundo">
                  <MessageCircle aria-hidden="true" size={12} strokeWidth={1.8} />
                  WhatsApp
                </a>
              ) : null}
            </div>
          ) : VAZIO}
        </Dado>

        <Dado icone={<Mail size={16} strokeWidth={1.65} />} rotulo="E-mail">
          {paciente.email ? (
            <a href={`mailto:${paciente.email}`} className="inline-block py-0.5 font-medium break-all hover:text-primary hover:underline">{paciente.email}</a>
          ) : VAZIO}
        </Dado>

        <Dado icone={<IdCard size={16} strokeWidth={1.65} />} rotulo="CPF">
          {paciente.cpf ? <span className="tabular font-medium">{formatarCpf(paciente.cpf)}</span> : VAZIO}
        </Dado>

        <Dado icone={<MapPin size={16} strokeWidth={1.65} />} rotulo="Endereço">
          {temEndereco ? (
            <>
              {formatarEndereco(paciente.endereco)}
              {paciente.endereco.cep ? <span className="tabular mt-0.5 block text-outline">CEP {formatarCep(paciente.endereco.cep)}</span> : null}
            </>
          ) : VAZIO}
        </Dado>

        {paciente.observacoes ? (
          <div className="sm:col-span-2 xl:col-span-1 2xl:col-span-2">
            <Dado icone={<NotebookPen size={16} strokeWidth={1.65} />} rotulo="Observações administrativas">
              <p className="whitespace-pre-line">{paciente.observacoes}</p>
            </Dado>
          </div>
        ) : null}
      </CardCorpo>
    </Card>
  );
}
