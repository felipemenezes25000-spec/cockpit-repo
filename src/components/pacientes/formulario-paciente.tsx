"use client";

import { CircleAlert, Save } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { AREA_TEXTO, Campo, ENTRADA, ENTRADA_ERRO, GrupoDeCampos } from "@/components/ui/field";
import { BotaoDeAcao } from "@/components/ui/formulario-acao";
import { RodapeAcoesFormulario } from "@/components/ui/form-actions";
import { cn } from "@/lib/cn";
import { apenasDigitos, ORIGENS, PACIENTE_EM_BRANCO, UFS, type ValoresPaciente } from "@/lib/paciente";
import type { ErrosDoFormulario, EstadoPaciente } from "@/server/acoes/pacientes";

type Acao = (estado: EstadoPaciente, dados: FormData) => Promise<EstadoPaciente>;
const ESTADO_INICIAL: EstadoPaciente = { erros: {} };

function mascararCpf(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11);
  return d.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}
function mascararTelefone(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
function mascararCep(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

function BotaoSalvar({ rotulo }: { rotulo: string }) {
  return <BotaoDeAcao tom="primario" tamanho="md" icone={<Save size={18} strokeWidth={1.75} />} rotuloPendente="Salvando…">{rotulo}</BotaoDeAcao>;
}

export function FormularioPaciente({ acao, inicial, pacienteId, rotuloSalvar = "Salvar cadastro", cancelarPara }: { acao: Acao; inicial?: Partial<ValoresPaciente>; pacienteId?: string; rotuloSalvar?: string; cancelarPara: string }) {
  const [estado, enviar] = useActionState(acao, ESTADO_INICIAL);
  const partida: ValoresPaciente = { ...PACIENTE_EM_BRANCO, ...inicial };
  const de = (campo: keyof ValoresPaciente) => estado.valores?.[campo] ?? partida[campo];
  const origem = de("origem");
  const origemForaDaLista = origem !== "" && !(ORIGENS as readonly string[]).includes(origem);
  const [cpf, setCpf] = useState(() => mascararCpf(de("cpf")));
  const [telefone, setTelefone] = useState(() => mascararTelefone(de("telefone")));
  const [cep, setCep] = useState(() => mascararCep(de("cep")));
  const erros: ErrosDoFormulario = estado.erros;
  const marcar = (campo: keyof ErrosDoFormulario) => erros[campo] ? ({ "aria-invalid": true as const, "aria-describedby": `${campo}-erro` } as const) : {};

  return (
    <form action={enviar} className="flex flex-col gap-8" noValidate>
      {pacienteId ? <input type="hidden" name="id" value={pacienteId} /> : null}
      {erros.geral ? <p role="alert" className="flex items-start gap-2 rounded-[var(--radius-cartao)] border border-error/25 bg-error-container px-3.5 py-2.5 text-sm text-on-error-container"><CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />{erros.geral}</p> : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Campo id="nome" rotulo="Nome completo" obrigatorio erro={erros.nome}><input id="nome" name="nome" type="text" required autoComplete="name" maxLength={120} defaultValue={de("nome")} placeholder="Maria Aparecida da Silva" className={cn(ENTRADA, erros.nome && ENTRADA_ERRO)} {...marcar("nome")} /></Campo>
        <Campo id="nome_social" rotulo="Nome social" dica="Quando preenchido, é o nome que aparece em todo o sistema." erro={erros.nome_social}><input id="nome_social" name="nome_social" type="text" maxLength={120} defaultValue={de("nome_social")} className={cn(ENTRADA, erros.nome_social && ENTRADA_ERRO)} {...marcar("nome_social")} /></Campo>
        <Campo id="cpf" rotulo="CPF" erro={erros.cpf}><input id="cpf" name="cpf" type="text" inputMode="numeric" autoComplete="off" value={cpf} onChange={(e) => setCpf(mascararCpf(e.target.value))} placeholder="000.000.000-00" className={cn(ENTRADA, "tabular", erros.cpf && ENTRADA_ERRO)} {...marcar("cpf")} /></Campo>
        <Campo id="data_nascimento" rotulo="Data de nascimento" erro={erros.data_nascimento}><input id="data_nascimento" name="data_nascimento" type="date" autoComplete="bday" defaultValue={de("data_nascimento")} className={cn(ENTRADA, erros.data_nascimento && ENTRADA_ERRO)} {...marcar("data_nascimento")} /></Campo>
      </div>

      <GrupoDeCampos titulo="Contato" descricao="Usado para confirmar atendimento, avisar de retorno e enviar documento.">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Campo id="telefone" rotulo="Telefone" erro={erros.telefone}><input id="telefone" name="telefone" type="tel" inputMode="numeric" autoComplete="tel" value={telefone} onChange={(e) => setTelefone(mascararTelefone(e.target.value))} placeholder="(11) 98765-4321" className={cn(ENTRADA, "tabular", erros.telefone && ENTRADA_ERRO)} {...marcar("telefone")} /></Campo>
          <Campo id="email" rotulo="E-mail" erro={erros.email}><input id="email" name="email" type="email" autoComplete="email" maxLength={160} defaultValue={de("email")} placeholder="maria@email.com" className={cn(ENTRADA, erros.email && ENTRADA_ERRO)} {...marcar("email")} /></Campo>
        </div>
      </GrupoDeCampos>

      <GrupoDeCampos titulo="Endereço">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-6">
          <Campo id="cep" rotulo="CEP" erro={erros.cep} className="sm:col-span-2"><input id="cep" name="cep" type="text" inputMode="numeric" autoComplete="postal-code" value={cep} onChange={(e) => setCep(mascararCep(e.target.value))} placeholder="01310-100" className={cn(ENTRADA, "tabular", erros.cep && ENTRADA_ERRO)} {...marcar("cep")} /></Campo>
          <Campo id="logradouro" rotulo="Rua" className="sm:col-span-3"><input id="logradouro" name="logradouro" type="text" maxLength={120} autoComplete="address-line1" defaultValue={de("logradouro")} className={ENTRADA} /></Campo>
          <Campo id="numero" rotulo="Número" className="sm:col-span-1"><input id="numero" name="numero" type="text" maxLength={20} defaultValue={de("numero")} className={ENTRADA} /></Campo>
          <Campo id="complemento" rotulo="Complemento" className="sm:col-span-3"><input id="complemento" name="complemento" type="text" maxLength={60} defaultValue={de("complemento")} placeholder="Apto 32, bloco B" className={ENTRADA} /></Campo>
          <Campo id="bairro" rotulo="Bairro" className="sm:col-span-3"><input id="bairro" name="bairro" type="text" maxLength={120} defaultValue={de("bairro")} className={ENTRADA} /></Campo>
          <Campo id="cidade" rotulo="Cidade" className="sm:col-span-4"><input id="cidade" name="cidade" type="text" maxLength={120} autoComplete="address-level2" defaultValue={de("cidade")} className={ENTRADA} /></Campo>
          <Campo id="uf" rotulo="UF" erro={erros.uf} className="sm:col-span-2"><select id="uf" name="uf" defaultValue={de("uf")} className={cn(ENTRADA, erros.uf && ENTRADA_ERRO)} {...marcar("uf")}><option value="">—</option>{UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}</select></Campo>
        </div>
      </GrupoDeCampos>

      <GrupoDeCampos titulo="Acompanhamento">
        <div className="flex flex-col gap-5">
          <Campo id="origem" rotulo="Como conheceu a clínica" dica="Lista fechada de propósito: texto livre não vira relatório depois." className="sm:max-w-xs"><select id="origem" name="origem" defaultValue={origem} className={ENTRADA}><option value="">—</option>{origemForaDaLista ? <option value={origem}>{origem} (importada)</option> : null}{ORIGENS.map((o) => <option key={o} value={o}>{o}</option>)}</select></Campo>
          <Campo id="observacoes" rotulo="Observações administrativas" dica="Preferência de horário, forma de contato, quem indicou. Conteúdo clínico vai no prontuário, não aqui."><textarea id="observacoes" name="observacoes" maxLength={2000} defaultValue={de("observacoes")} className={AREA_TEXTO} /></Campo>
        </div>
      </GrupoDeCampos>

      <RodapeAcoesFormulario>
        <BotaoSalvar rotulo={rotuloSalvar} />
        <Link href={cancelarPara} className="inline-flex h-11 items-center justify-center rounded-[var(--radius-controle)] px-5 text-sm font-medium text-on-surface-variant transition-[transform,background-color,color] hover:bg-primary-fixed/35 hover:text-primary active:scale-[0.985]">Cancelar</Link>
      </RodapeAcoesFormulario>
    </form>
  );
}
