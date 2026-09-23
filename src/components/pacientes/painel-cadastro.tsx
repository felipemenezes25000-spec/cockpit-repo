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
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0 text-outline-variant">{icone}</span>
      <div className="min-w-0">
        <p className="rotulo mb-1">{rotulo}</p>
        <div className="text-sm break-words text-on-surface">{children}</div>
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
      <CardCabecalho titulo="Cadastro" />
      <CardCorpo className="flex flex-col gap-6">
        <Dado icone={<Phone size={16} strokeWidth={1.5} />} rotulo="Telefone">
          {paciente.telefone ? (
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={`tel:+55${paciente.telefone}`}
                className="tabular inline-flex min-h-6 items-center hover:text-primary hover:underline"
              >
                {formatarTelefone(paciente.telefone)}
              </a>

              {whatsapp ? (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-6 items-center gap-1.5 rounded-[var(--radius-tag)] bg-secondary-fixed px-2 py-0.5 text-xs font-medium text-primary transition-opacity hover:opacity-80"
                >
                  <MessageCircle aria-hidden="true" size={12} strokeWidth={1.75} />
                  WhatsApp
                </a>
              ) : null}
            </div>
          ) : (
            VAZIO
          )}
        </Dado>

        <Dado icone={<Mail size={16} strokeWidth={1.5} />} rotulo="E-mail">
          {paciente.email ? (
            <a
              href={`mailto:${paciente.email}`}
              className="inline-block py-0.5 break-all hover:text-primary hover:underline"
            >
              {paciente.email}
            </a>
          ) : (
            VAZIO
          )}
        </Dado>

        <Dado icone={<IdCard size={16} strokeWidth={1.5} />} rotulo="CPF">
          {paciente.cpf ? (
            <span className="tabular">{formatarCpf(paciente.cpf)}</span>
          ) : (
            VAZIO
          )}
        </Dado>

        <Dado icone={<MapPin size={16} strokeWidth={1.5} />} rotulo="Endereço">
          {temEndereco ? (
            <>
              {formatarEndereco(paciente.endereco)}
              {paciente.endereco.cep ? (
                <span className="tabular block text-outline">
                  CEP {formatarCep(paciente.endereco.cep)}
                </span>
              ) : null}
            </>
          ) : (
            VAZIO
          )}
        </Dado>

        {paciente.observacoes ? (
          <Dado
            icone={<NotebookPen size={16} strokeWidth={1.5} />}
            rotulo="Observações administrativas"
          >
            <p className="whitespace-pre-line">{paciente.observacoes}</p>
          </Dado>
        ) : null}
      </CardCorpo>
    </Card>
  );
}
