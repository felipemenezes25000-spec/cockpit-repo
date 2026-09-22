"use client";

import {
  Check,
  CircleAlert,
  Copy,
  Link2,
  Link2Off,
  LoaderCircle,
  MessageCircle,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { CardCorpo } from "@/components/ui/card";
import { FormularioDeAcao } from "@/components/ui/formulario-acao";
import { Campo, ENTRADA } from "@/components/ui/field";
import {
  enderecoWhatsapp,
  mensagemDoConvite,
  numeroWhatsapp,
  type TipoDocumento,
} from "@/lib/documento";
import { formatarData, formatarHora } from "@/lib/format";
import { CLINICA } from "@/lib/nav";
import { formatarTelefone } from "@/lib/paciente";
import {
  criarLinkAssinatura,
  registrarCanalDoLink,
  revogarLinkAssinatura,
} from "@/server/acoes/assinatura-link";
import type { LinkDeAssinatura } from "@/server/consultas/documentos";

const VALIDADES = [
  { dias: 7, rotulo: "7 dias" },
  { dias: 15, rotulo: "15 dias" },
  { dias: 30, rotulo: "30 dias" },
];

function Revogar() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-tag)] px-2.5 text-xs font-medium text-outline transition-colors hover:bg-negativo-fundo hover:text-negativo disabled:opacity-55"
    >
      {pending ? (
        <LoaderCircle aria-hidden="true" size={14} className="animate-spin" />
      ) : (
        <Link2Off aria-hidden="true" size={14} strokeWidth={1.75} />
      )}
      Revogar
    </button>
  );
}

/**
 * Gera o link e entrega à paciente.
 *
 * O endereço aparece **uma vez só**, logo depois de gerado. O banco guarda
 * apenas o hash do token, então nem o sistema consegue remontá-lo depois — é a
 * mesma razão pela qual ninguém recupera uma senha, só troca. Perdido o
 * endereço, gera-se outro, e o anterior é revogado na mesma transação.
 *
 * O envio pelo WhatsApp é um link `wa.me`: abre a conversa com a mensagem
 * escrita, e **quem aperta enviar é a pessoa**. O sistema não manda mensagem
 * em nome de ninguém, e por isso não precisa de integração, número de negócio
 * nem aprovação de modelo.
 */
export function PainelLink({
  documentoId,
  links,
  tipo,
  pacienteNome,
  pacienteTelefone,
}: {
  documentoId: string;
  links: LinkDeAssinatura[];
  tipo: TipoDocumento;
  pacienteNome: string;
  pacienteTelefone: string | null;
}) {
  const [gerando, setGerando] = useState(false);
  const [endereco, setEndereco] = useState<string | null>(null);
  const [linkId, setLinkId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [dias, setDias] = useState(15);

  const ativo = links.find((link) => link.ativo) ?? null;
  const numero = numeroWhatsapp(pacienteTelefone);

  const validade = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);

  const enderecoDaConversa =
    endereco && numero
      ? enderecoWhatsapp(
          numero,
          mensagemDoConvite({
            primeiroNome: pacienteNome.split(" ")[0] ?? pacienteNome,
            clinica: CLINICA.nome,
            tipo,
            endereco,
            validade: formatarData(validade),
          }),
        )
      : null;

  async function gerar() {
    setGerando(true);
    setErro(null);
    setEndereco(null);
    setLinkId(null);

    try {
      const resposta = await criarLinkAssinatura({ documentoId, dias });

      if (resposta.ok) {
        setEndereco(resposta.endereco);
        setLinkId(resposta.linkId);
      } else {
        setErro(resposta.erro);
      }
    } catch {
      setErro("Não foi possível falar com o servidor. Confira a conexão e tente de novo.");
    } finally {
      setGerando(false);
    }
  }

  async function copiar() {
    if (!endereco) return;
    try {
      await navigator.clipboard.writeText(endereco);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sem permissão de área de transferência: o endereço continua na tela
      // para selecionar à mão, que é o que resta e funciona.
      setCopiado(false);
    }
  }

  /**
   * Registra o canal no clique, não na criação: evidência que descreve
   * intenção não é evidência. Falhar aqui não pode atrapalhar o envio — a
   * conversa já está abrindo em outra aba.
   */
  function marcarEnvioWhatsapp() {
    if (!linkId || !numero) return;
    registrarCanalDoLink({
      linkId,
      documentoId,
      canal: `WhatsApp ${formatarTelefone(pacienteTelefone ?? "")}`,
    }).catch(() => {
      // De propósito: perder o rótulo do canal é menos ruim do que atrapalhar
      // um envio que já começou em outra aba. O link continua valendo.
      return undefined;
    });
  }

  return (
    <CardCorpo className="flex flex-col gap-5">
      <p className="text-sm text-on-surface-variant">
        A paciente abre o link, confirma a própria data de nascimento e assina.
        A assinatura aparece aqui assim que ela terminar.
      </p>

      {endereco ? (
        <div className="flex flex-col gap-3 rounded-[var(--radius-cartao)] border border-positivo-borda bg-positivo-fundo p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-positivo">
            <Check aria-hidden="true" size={16} strokeWidth={1.75} />
            Link gerado. Envie ou copie agora — ele não aparece de novo.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={endereco}
              onFocus={(evento) => evento.currentTarget.select()}
              aria-label="Endereço do link de assinatura"
              className="h-11 w-full min-w-0 rounded-[var(--radius-cartao)] border border-outline-variant bg-surface px-3 text-xs text-on-surface outline-none"
            />
            <button
              type="button"
              onClick={copiar}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-cartao)] border border-primary bg-surface px-4 text-sm font-medium text-primary transition-colors hover:bg-surface-container-low"
            >
              {copiado ? (
                <Check aria-hidden="true" size={16} strokeWidth={1.75} />
              ) : (
                <Copy aria-hidden="true" size={16} strokeWidth={1.75} />
              )}
              {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>

          {enderecoDaConversa ? (
            <div>
              <a
                href={enderecoDaConversa}
                target="_blank"
                rel="noopener noreferrer"
                onClick={marcarEnvioWhatsapp}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-controle)] bg-primary-container px-6 text-sm font-medium text-on-primary transition-colors hover:bg-primary"
              >
                <MessageCircle aria-hidden="true" size={18} strokeWidth={1.75} />
                Enviar pelo WhatsApp
              </a>
              <p className="mt-2 text-xs text-positivo">
                Abre a conversa com {formatarTelefone(pacienteTelefone ?? "")} e a
                mensagem pronta. Confira e aperte enviar — quem manda é você, não
                o sistema.
              </p>
            </div>
          ) : (
            <p className="flex items-start gap-1.5 text-xs text-atencao">
              <TriangleAlert aria-hidden="true" size={12} className="mt-0.5 shrink-0" />
              {pacienteTelefone
                ? "O telefone cadastrado não parece um celular válido, então não dá para abrir o WhatsApp. Copie o link e envie como preferir."
                : "A paciente não tem telefone cadastrado. Copie o link e envie como preferir."}
            </p>
          )}

          <p className="flex items-start gap-1.5 border-t border-positivo-borda pt-2 text-xs text-positivo">
            <TriangleAlert aria-hidden="true" size={12} className="mt-0.5 shrink-0" />
            Quem tiver este endereço e souber a data de nascimento da paciente
            consegue ler e assinar. Mande só para ela.
          </p>
        </div>
      ) : null}

      {ativo && !endereco ? (
        <div className="rounded-[var(--radius-cartao)] border border-card-border bg-surface p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-on-surface">
            <Link2 aria-hidden="true" size={16} strokeWidth={1.75} className="text-primary" />
            Já existe um link válido
          </p>
          <p className="tabular mt-1 text-xs text-outline">
            Criado em {formatarData(ativo.criadoEm)} às {formatarHora(ativo.criadoEm)}
            {ativo.criadoPor ? ` por ${ativo.criadoPor}` : ""} · vale até{" "}
            {formatarData(ativo.expiraEm)}
            {ativo.canalEnvio ? ` · enviado por ${ativo.canalEnvio}` : " · ainda não enviado"}
          </p>
          <p className="mt-1 text-xs text-outline">
            {ativo.abertoEm
              ? `Aberto ${ativo.aberturas === 1 ? "1 vez" : `${ativo.aberturas} vezes`}, a primeira em ${formatarData(ativo.abertoEm)}.`
              : "Ainda não foi aberto."}
          </p>

          {ativo.bloqueado ? (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-negativo">
              <CircleAlert aria-hidden="true" size={12} className="mt-0.5 shrink-0" />
              Fechado por dez tentativas erradas de data de nascimento. Gere outro.
            </p>
          ) : ativo.tentativas > 0 ? (
            <p className="mt-2 text-xs text-atencao">
              {ativo.tentativas} tentativa(s) de data de nascimento erradas. No
              décimo erro o link se fecha.
            </p>
          ) : null}

          <div className="mt-3 flex items-center gap-2 border-t border-card-border pt-3">
            <FormularioDeAcao
              acao={revogarLinkAssinatura}
              campos={{ link_id: ativo.id, documento_id: documentoId }}
              confirmacao="Revogar este link? Quem o tiver não consegue mais abrir o documento. Dá para gerar outro depois."
            >
              <Revogar />
            </FormularioDeAcao>
            <span className="text-xs text-outline-variant">
              O endereço não pode ser mostrado de novo — só substituído.
            </span>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 border-t border-card-border pt-5">
        <div className="max-w-xs">
          <Campo
            id="link-validade"
            rotulo="Validade do link"
            obrigatorio
            dica="Passado o prazo, o link para de funcionar."
          >
            <select
              id="link-validade"
              value={dias}
              onChange={(evento) => setDias(Number(evento.target.value))}
              className={ENTRADA}
            >
              {VALIDADES.map((opcao) => (
                <option key={opcao.dias} value={opcao.dias}>
                  {opcao.rotulo}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        {erro ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-[var(--radius-cartao)] border border-error/25 bg-error-container px-3.5 py-2.5 text-sm text-on-error-container"
          >
            <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
            {erro}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={gerar}
            disabled={gerando}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-controle)] bg-primary-container px-6 text-sm font-medium text-on-primary transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-55"
          >
            {gerando ? (
              <>
                <LoaderCircle aria-hidden="true" size={18} className="animate-spin" />
                Gerando…
              </>
            ) : (
              <>
                <Link2 aria-hidden="true" size={18} strokeWidth={1.75} />
                {ativo ? "Gerar novo link" : "Gerar link"}
              </>
            )}
          </button>

          {ativo ? (
            <span className="text-xs text-outline">
              O link anterior é revogado automaticamente.
            </span>
          ) : null}
        </div>
      </div>
    </CardCorpo>
  );
}
