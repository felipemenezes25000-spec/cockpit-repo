"use client";

import {
  CalendarCheck,
  Check,
  CircleAlert,
  Copy,
  Link2,
  Link2Off,
  LoaderCircle,
  MailCheck,
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
import { cn } from "@/lib/cn";
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
  pacienteEmail = null,
  emailDisponivel = false,
}: {
  documentoId: string;
  links: LinkDeAssinatura[];
  tipo: TipoDocumento;
  pacienteNome: string;
  pacienteTelefone: string | null;
  /** Mascarado. Sem ele não há para onde mandar o código. */
  pacienteEmail?: string | null;
  /** O servidor tem como enviar e-mail (SMTP ou pasta de testes). */
  emailDisponivel?: boolean;
}) {
  const podeCodigo = Boolean(pacienteEmail) && emailDisponivel;
  const [gerando, setGerando] = useState(false);
  const [endereco, setEndereco] = useState<string | null>(null);
  const [linkId, setLinkId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [dias, setDias] = useState(15);
  const [validadeGerada, setValidadeGerada] = useState<Date | null>(null);
  // O mais forte disponível vem marcado: o código por e-mail prova posse da
  // caixa de e-mail da paciente, além de saber a data de nascimento.
  const [verificacao, setVerificacao] = useState<"nascimento" | "nascimento_email">(
    podeCodigo ? "nascimento_email" : "nascimento",
  );
  const [verificacaoGerada, setVerificacaoGerada] = useState<"nascimento" | "nascimento_email">("nascimento");

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
    const modo = podeCodigo ? verificacao : "nascimento";
    try {
      const resposta = await criarLinkAssinatura({ documentoId, dias: diasPedidos, verificacao: modo });
      if (resposta.ok) {
        setEndereco(resposta.endereco);
        setLinkId(resposta.linkId);
        setVerificacaoGerada(modo);
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
        A paciente abre o link, confirma a própria identidade, lê, rubrica e assina. A assinatura aparece aqui assim que ela terminar, com carimbo de tempo e código de verificação.
      </p>

      {endereco ? (
        <div className="relative flex flex-col gap-4 overflow-hidden rounded-[var(--radius-painel)] border border-positivo-borda bg-positivo-fundo p-4 sm:p-5">
          <div className="relative flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-cartao)] border border-positivo-borda bg-surface text-positivo"><Check aria-hidden="true" size={18} strokeWidth={1.8} /></span>
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
              className={`group inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-controle)] border px-4 text-sm font-semibold transition-[transform,background-color,border-color,color] duration-180 active:scale-[0.985] ${copiado ? "border-positivo-borda bg-positivo text-on-primary" : "border-primary-fixed-dim bg-surface text-primary hover:bg-selecao"}`}
            >
              {copiado ? <Check aria-hidden="true" size={16} strokeWidth={1.9} /> : <Copy aria-hidden="true" size={16} strokeWidth={1.75} className="transition-transform duration-150" />}
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
                className="group relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-[var(--radius-controle)] border border-positivo-borda bg-positivo px-5 text-sm font-semibold text-on-primary transition-[transform,filter] duration-180 hover:brightness-[0.92] active:translate-y-px active:scale-[0.985]"
              >
                <span aria-hidden="true" className="absolute inset-x-6 top-0 h-px bg-surface" />
                <MessageCircle aria-hidden="true" size={18} strokeWidth={1.75} className="relative transition-transform duration-150" />
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

          <p className="relative flex items-start gap-1.5 border-t border-positivo-borda pt-3 text-xs leading-5 text-positivo">
            <TriangleAlert aria-hidden="true" size={12} className="mt-0.5 shrink-0" />
            {verificacaoGerada === "nascimento_email"
              ? `Além da data de nascimento, o link pede um código enviado para ${pacienteEmail ?? "o e-mail da paciente"}. Mesmo assim, mande só para ela.`
              : "Quem tiver este endereço e souber a data de nascimento da paciente consegue ler e assinar. Mande só para ela."}
          </p>
        </div>
      ) : null}

      {ativo && !endereco ? (
        <div className="relative overflow-hidden rounded-[var(--radius-painel)] border border-card-border bg-surface p-4">
          <div className="relative">
            <p className="flex items-center gap-2 text-sm font-semibold text-on-surface"><span className="flex size-8 items-center justify-center rounded-[var(--radius-controle)] bg-primary-fixed text-primary"><Link2 aria-hidden="true" size={15} strokeWidth={1.75} /></span>Já existe um link válido</p>
            <p className="tabular mt-2 text-xs leading-5 text-outline">Criado em {formatarData(ativo.criadoEm)} às {formatarHora(ativo.criadoEm)}{ativo.criadoPor ? ` por ${ativo.criadoPor}` : ""} · vale até {formatarData(ativo.expiraEm)}{ativo.canalEnvio ? ` · enviado por ${ativo.canalEnvio}` : " · ainda não enviado"}</p>
            <p className="mt-1 text-xs text-outline">{ativo.abertoEm ? `Aberto ${ativo.aberturas === 1 ? "1 vez" : `${ativo.aberturas} vezes`}, a primeira em ${formatarData(ativo.abertoEm)}.` : "Ainda não foi aberto."}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-outline">
              {ativo.verificacao === "nascimento_email" ? <MailCheck aria-hidden="true" size={12} strokeWidth={1.9} className="shrink-0 text-positivo" /> : <CalendarCheck aria-hidden="true" size={12} strokeWidth={1.9} className="shrink-0" />}
              {ativo.verificacao === "nascimento_email"
                ? `Pede data de nascimento e código por e-mail${ativo.emailDestino ? ` (${ativo.emailDestino})` : ""}${ativo.codigosEnviados > 0 ? ` · ${ativo.codigosEnviados === 1 ? "1 código enviado" : `${ativo.codigosEnviados} códigos enviados`}` : ""}.`
                : "Pede a data de nascimento."}
            </p>

            {ativo.bloqueado ? <p className="mt-3 flex items-start gap-1.5 rounded-[var(--radius-controle)] bg-negativo-fundo px-2.5 py-2 text-xs text-negativo"><CircleAlert aria-hidden="true" size={12} className="mt-0.5 shrink-0" />Fechado por dez tentativas erradas de data de nascimento ou código. Gere outro.</p> : ativo.tentativas > 0 ? <p className="mt-3 rounded-[var(--radius-controle)] bg-atencao-fundo px-2.5 py-2 text-xs text-atencao">{ativo.tentativas} tentativa(s) erradas de data de nascimento ou código. No décimo erro o link se fecha.</p> : null}

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-card-border pt-3">
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

        <fieldset className="min-w-0">
          <legend className="text-sm font-semibold text-on-surface">Como a paciente se identifica</legend>
          <div className="mt-2 grid gap-2.5 md:grid-cols-2">
            <OpcaoDeVerificacao
              nome="link-verificacao"
              valor="nascimento"
              marcada={verificacao === "nascimento" || !podeCodigo}
              aoMarcar={() => setVerificacao("nascimento")}
              icone={<CalendarCheck aria-hidden="true" size={16} strokeWidth={1.8} />}
              titulo="Data de nascimento"
              texto="Ela confirma a data de nascimento do cadastro."
            />
            <OpcaoDeVerificacao
              nome="link-verificacao"
              valor="nascimento_email"
              marcada={podeCodigo && verificacao === "nascimento_email"}
              aoMarcar={() => setVerificacao("nascimento_email")}
              desabilitada={!podeCodigo}
              icone={<MailCheck aria-hidden="true" size={16} strokeWidth={1.8} />}
              titulo="Data + código por e-mail"
              selo={podeCodigo ? "Mais segura" : undefined}
              texto={
                !pacienteEmail
                  ? "A paciente não tem e-mail no cadastro. Cadastre um na ficha para usar."
                  : !emailDisponivel
                    ? "O envio de e-mail do sistema não está configurado."
                    : `Também confirma um código de 6 números enviado para ${pacienteEmail}.`
              }
            />
          </div>
        </fieldset>

        {erro ? <p role="alert" className="flex items-start gap-2 rounded-[var(--radius-cartao)] border border-error bg-error-container px-3.5 py-2.5 text-sm text-on-error-container"><CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />{erro}</p> : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={gerar}
            disabled={gerando}
            className="group relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-[var(--radius-controle)] border border-primary-container bg-primary-container px-6 text-sm font-semibold text-on-primary transition-[transform,filter] duration-180 active:translate-y-px active:scale-[0.985] disabled:cursor-wait disabled:opacity-55 disabled:hover:translate-y-0"
          >
            {gerando ? <><LoaderCircle aria-hidden="true" size={18} className="animate-spin" /><span className="relative">Gerando…</span></> : <><Link2 aria-hidden="true" size={18} strokeWidth={1.75} className="relative transition-transform duration-150" /><span className="relative">{ativo ? "Gerar novo link" : "Gerar link"}</span></>}
          </button>
          {ativo ? <span className="text-xs text-outline">O link anterior é revogado automaticamente.</span> : null}
        </div>
      </div>
    </CardCorpo>
  );
}

function OpcaoDeVerificacao({
  nome,
  valor,
  marcada,
  aoMarcar,
  desabilitada = false,
  icone,
  titulo,
  texto,
  selo,
}: {
  nome: string;
  valor: string;
  marcada: boolean;
  aoMarcar: () => void;
  desabilitada?: boolean;
  icone: React.ReactNode;
  titulo: string;
  texto: string;
  selo?: string;
}) {
  return (
    <label
      className={cn(
        "relative flex min-w-0 items-start gap-3 rounded-[var(--radius-cartao)] border px-3.5 py-3 transition-[border-color,background-color,box-shadow] duration-150",
        desabilitada
          ? "cursor-not-allowed border-card-border bg-surface-container-low opacity-70"
          : marcada
            ? "cursor-pointer border-primary-container bg-selecao shadow-[0_0_0_3px_rgba(10,110,209,.1)]"
            : "cursor-pointer border-card-border bg-surface hover:border-primary-fixed-dim",
      )}
    >
      <input
        type="radio"
        name={nome}
        value={valor}
        checked={marcada}
        disabled={desabilitada}
        onChange={aoMarcar}
        className="mt-1 size-4 shrink-0 accent-[var(--color-primary-container)]"
      />
      <span className="min-w-0">
        <span className={cn("flex flex-wrap items-center gap-1.5 text-sm font-semibold", marcada && !desabilitada ? "text-primary" : "text-on-surface")}>
          {icone}
          {titulo}
          {selo ? <span className="rounded-full border border-positivo-borda bg-positivo-fundo px-2 py-0.5 text-[0.62rem] font-semibold tracking-[0.03em] text-positivo">{selo}</span> : null}
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-outline">{texto}</span>
      </span>
    </label>
  );
}
