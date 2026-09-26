import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Envio de e-mail do sistema (código de verificação da assinatura, via
 * assinada).
 *
 * Dois caminhos, escolhidos pelo ambiente:
 * - `SMTP_URL` (produção): qualquer provedor SMTP —
 *   `smtps://usuario:senha@smtp.provedor.com:465`. O remetente vem de
 *   `SMTP_REMETENTE` ("Clínica <nao-responda@dominio.com.br>").
 * - `EMAIL_PASTA` (desenvolvimento e testes): grava cada mensagem como JSON
 *   numa pasta, e os testes E2E leem o código de lá. Recusado em produção.
 *
 * Sem nenhum dos dois, `emailDisponivel()` é falso e a tela não oferece o
 * código por e-mail — em vez de prometer um envio que não acontece.
 */

export type Mensagem = { para: string; assunto: string; texto: string; html: string };

function pasta(): string | null {
  const valor = (process.env.EMAIL_PASTA ?? "").trim();
  if (!valor || process.env.VERCEL_ENV === "production") return null;
  return valor;
}

export function emailDisponivel(): boolean {
  return Boolean((process.env.SMTP_URL ?? "").trim()) || pasta() !== null;
}

let transporte: Transporter | null = null;

export async function enviarEmail(mensagem: Mensagem): Promise<{ ok: true } | { ok: false; motivo: string }> {
  const url = (process.env.SMTP_URL ?? "").trim();
  const remetente = (process.env.SMTP_REMETENTE ?? "").trim();

  if (url) {
    if (!remetente) return { ok: false, motivo: "SMTP_REMETENTE não configurado" };
    try {
      transporte ??= nodemailer.createTransport(url);
      await transporte.sendMail({
        from: remetente,
        to: mensagem.para,
        subject: mensagem.assunto,
        text: mensagem.texto,
        html: mensagem.html,
      });
      return { ok: true };
    } catch (erro) {
      return { ok: false, motivo: erro instanceof Error ? erro.message.slice(0, 200) : "falha no SMTP" };
    }
  }

  const destino = pasta();
  if (destino) {
    try {
      await mkdir(destino, { recursive: true });
      const nome = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
      await writeFile(path.join(destino, nome), JSON.stringify({ ...mensagem, em: new Date().toISOString() }, null, 2));
      return { ok: true };
    } catch (erro) {
      return { ok: false, motivo: erro instanceof Error ? erro.message.slice(0, 200) : "falha na pasta" };
    }
  }

  return { ok: false, motivo: "envio de e-mail não configurado" };
}

/** Escapa texto para dentro do HTML do e-mail. */
export function html(texto: string): string {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
