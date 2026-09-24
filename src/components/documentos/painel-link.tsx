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
import { CardCorpo } from "@/components/ui/card";
import { BotaoDeAcao, FormularioDeAcao } from "@/components/ui/formulario-acao";
import { Campo, classeDeEntrada, ENTRADA } from "@/components/ui/field";
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
  const [validadeGerada, setValidadeGerada] = useState<Date | null>(null);

  const ativo = links.find((link) => link.ativo) ?? null;
  const numero = numeroWhatsapp(pacienteTelefone);
  const validade = (linkId ? links.find((link) => link.id === linkId)?.expiraEm : undefined) ?? validadeGerada;

  const enderecoDaConversa = endereco && numero && validade
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
    setValidadeGerada(null);
    const diasPedidos = dias;
    try {
      const resposta = await criarLinkAssinatura({ documentoId, dias: diasPedidos });
      if (resposta.ok) {
        setEndereco(resposta.endereco);
        setLinkId(resposta.linkId);
        setValidadeGerada(new Date(Date.now() + diasPedidos * 24 * 60 * 60 * 1000));
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
      setCopiado(false);
    }
  }

  function marcarEnvioWhatsapp() {
    if (!linkId || !numero) return;
    registrarCanalDoLink({
      linkId,
      documentoId,
      canal: `WhatsApp ${formatarTelefone(pacienteTelefone ?? "")}`,
    }).catch(() => undefined);
  }

  return (
    <CardCorpo className="flex flex-col gap-5">
      <p className="text-sm leading-6 text-on-surface-variant">
        A paciente abre o link, confirma a própria data de nascimento e assina. A assinatura aparece aqui assim que ela terminar.
      </p>

      {endereco ? (
        <div className="relative flex flex-col gap-4 overflow-hidden rounded-[18px] border border-positivo-borda/85 bg-[linear-gradient(145deg,rgba(238,249,241,0.96),rgba(255,255,255,0.88))] p-4 shadow-[0_12px_28px_-22px_rgba(14,118,57,0.4),inset_0_1px_0_rgba(255,255,255,0.92)] sm:p-5">
          <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-12 size-36 rounded-full bg-positivo-fundo blur-3xl" />
          <div className="relative flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[13px] border border-positivo-borda/70 bg-white/70 text-positivo shadow-[var(--shadow-cartao)]"><Check aria-hidden="true" size={18} strokeWidth={1.8} /></span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-positivo">Link gerado com segurança</p>
              <p className="mt-1 text-xs leading-5 text-on-surface-variant">Envie ou copie agora — por segurança, o endereço completo não aparece novamente depois.</p>
              {validade ? <p className="tabular mt-1.5 text-xs font-medium text-positivo">Válido até {formatarData(validade)}</p> : null}
            </div>
          </div>

          <div className="relative flex flex-col gap-2 sm:flex-row">
            <input readOnly value={endereco} onFocus={(evento) => evento.currentTarget.select()} aria-label="Endereço do link de assinatura" className={`${classeDeEntrada({ texto: "xs" })} min-w-0 font-mono`} />
            <button
              type="button"
              onClick={copiar}
              aria-live="polite"
              className={`group inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-controle)] border px-4 text-sm font-semibold transition-[transform,background-color,border-color,color,box-shadow] duration-180 active:scale-[0.985] ${copiado ? "border-positivo-borda bg-positivo text-on-primary shadow-[0_8px_18px_-12px_rgba(14,118,57,0.6)]" : "border-primary/20 bg-white/75 text-primary shadow-[var(--shadow-cartao)] hover:-translate-y-px hover:bg-white hover:shadow-[var(--shadow-realce)]"}`}
            >
              {copiado ? <Check aria-hidden="true" size={16} strokeWidth={1.9} /> : <Copy aria-hidden="true" size={16} strokeWidth={1.75} className="transition-transform duration-150 group-hover:scale-[1.05]" />}
              {copiado ? "Copiado ✓" : "Copiar link"}
            </button>
          </div>

          {enderecoDaConversa ? (
            <div className="relative">
              <a
                href={enderecoDaConversa}
                target="_blank"
                rel="noopener noreferrer"
                onClick={marcarEnvioWhatsapp}
                className="group relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-[var(--radius-controle)] border border-positivo-borda bg-[linear-gradient(135deg,var(--color-positivo),#0b8f45)] px-5 text-sm font-semibold text-on-primary shadow-[0_12px_26px_-16px_rgba(14,118,57,0.62)] transition-[transform,box-shadow,filter] duration-180 hover:-translate-y-0.5 hover:brightness-[1.02] hover:shadow-[0_16px_32px_-16px_rgba(14,118,57,0.68)] active:translate-y-px active:scale-[0.985]"
              >
                <span aria-hidden="true" className="absolute inset-x-6 top-0 h-px bg-white/45" />
                <MessageCircle aria-hidden="true" size={18} strokeWidth={1.75} className="relative transition-transform duration-150 group-hover:scale-[1.05]" />
                <span className="relative">Enviar pelo WhatsApp</span>
              </a>
              <p className="mt-2 max-w-2xl text-xs leading-5 text-positivo">Abre a conversa com {formatarTelefone(pacienteTelefone ?? "")} e a mensagem pronta. Confira e aperte enviar — quem manda é você, não o sistema.</p>
            </div>
          ) : (
            <p className="relative flex items-start gap-1.5 text-xs leading-5 text-atencao">
              <TriangleAlert aria-hidden="true" size={12} className="mt-0.5 shrink-0" />
              {pacienteTelefone ? "O telefone cadastrado não parece um celular válido, então não dá para abrir o WhatsApp. Copie o link e envie como preferir." : "A paciente não tem telefone cadastrado. Copie o link e envie como preferir."}
            </p>
          )}

          <p className="relative flex items-start gap-1.5 border-t border-positivo-borda/70 pt-3 text-xs leading-5 text-positivo">
            <TriangleAlert aria-hidden="true" size={12} className="mt-0.5 shrink-0" />
            Quem tiver este endereço e souber a data de nascimento da paciente consegue ler e assinar. Mande só para ela.
          </p>
        </div>
      ) : null}

      {ativo && !endereco ? (
        <div className="relative overflow-hidden rounded-[18px] border border-card-border/85 bg-white/72 p-4 shadow-[var(--shadow-cartao)]">
          <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-12 size-32 rounded-full bg-primary-fixed/32 blur-3xl" />
          <div className="relative">
            <p className="flex items-center gap-2 text-sm font-semibold text-on-surface"><span className="flex size-8 items-center justify-center rounded-[10px] bg-primary-fixed/55 text-primary"><Link2 aria-hidden="true" size={15} strokeWidth={1.75} /></span>Já existe um link válido</p>
            <p className="tabular mt-2 text-xs leading-5 text-outline">Criado em {formatarData(ativo.criadoEm)} às {formatarHora(ativo.criadoEm)}{ativo.criadoPor ? ` por ${ativo.criadoPor}` : ""} · vale até {formatarData(ativo.expiraEm)}{ativo.canalEnvio ? ` · enviado por ${ativo.canalEnvio}` : " · ainda não enviado"}</p>
            <p className="mt-1 text-xs text-outline">{ativo.abertoEm ? `Aberto ${ativo.aberturas === 1 ? "1 vez" : `${ativo.aberturas} vezes`}, a primeira em ${formatarData(ativo.abertoEm)}.` : "Ainda não foi aberto."}</p>

            {ativo.bloqueado ? <p className="mt-3 flex items-start gap-1.5 rounded-[10px] bg-negativo-fundo/72 px-2.5 py-2 text-xs text-negativo"><CircleAlert aria-hidden="true" size={12} className="mt-0.5 shrink-0" />Fechado por dez tentativas erradas de data de nascimento. Gere outro.</p> : ativo.tentativas > 0 ? <p className="mt-3 rounded-[10px] bg-atencao-fundo/72 px-2.5 py-2 text-xs text-atencao">{ativo.tentativas} tentativa(s) de data de nascimento erradas. No décimo erro o link se fecha.</p> : null}

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-card-border/75 pt-3">
              <FormularioDeAcao acao={revogarLinkAssinatura} campos={{ link_id: ativo.id, documento_id: documentoId }} confirmacao="Revogar este link? Quem o tiver não consegue mais abrir o documento. Dá para gerar outro depois.">
                <BotaoDeAcao tom="negativo" tamanho="xs" icone={<Link2Off size={14} strokeWidth={1.75} />} rotuloPendente="Revogando…">Revogar link</BotaoDeAcao>
              </FormularioDeAcao>
              <span className="text-xs text-outline">O endereço não pode ser mostrado de novo — só substituído.</span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 border-t border-card-border pt-5">
        <div className="max-w-xs">
          <Campo id="link-validade" rotulo="Validade do link" obrigatorio dica="Passado o prazo, o link para de funcionar.">
            <select id="link-validade" value={dias} onChange={(evento) => setDias(Number(evento.target.value))} className={ENTRADA}>{VALIDADES.map((opcao) => <option key={opcao.dias} value={opcao.dias}>{opcao.rotulo}</option>)}</select>
          </Campo>
        </div>

        {erro ? <p role="alert" className="flex items-start gap-2 rounded-[var(--radius-cartao)] border border-error/25 bg-error-container px-3.5 py-2.5 text-sm text-on-error-container"><CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />{erro}</p> : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={gerar}
            disabled={gerando}
            className="group relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-[var(--radius-controle)] border border-primary-container bg-[linear-gradient(135deg,var(--color-primary-container),var(--color-primary))] px-6 text-sm font-semibold text-on-primary shadow-[var(--shadow-primary)] transition-[transform,box-shadow,filter] duration-180 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-12px_rgba(8,84,160,0.72)] active:translate-y-px active:scale-[0.985] disabled:cursor-wait disabled:opacity-55 disabled:hover:translate-y-0"
          >
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-7 top-0 h-px bg-white/55" />
            {gerando ? <><LoaderCircle aria-hidden="true" size={18} className="animate-spin" /><span className="relative">Gerando…</span></> : <><Link2 aria-hidden="true" size={18} strokeWidth={1.75} className="relative transition-transform duration-150 group-hover:scale-[1.05]" /><span className="relative">{ativo ? "Gerar novo link" : "Gerar link"}</span></>}
          </button>
          {ativo ? <span className="text-xs text-outline">O link anterior é revogado automaticamente.</span> : null}
        </div>
      </div>
    </CardCorpo>
  );
}
