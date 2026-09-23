import { describe, expect, it } from "vitest";
import {
  canalDeEnvioValido,
  enderecoDoLink,
  obrigatoriasPendentes,
  origemPublica,
  tokenPlausivel,
  rotuloDaSituacao,
  seAssina,
  situacaoDaAnamnese,
  validarAssinatura,
  validarCampos,
  validarResposta,
  type CampoDoModelo,
  type CampoRespondido,
} from "./documento";
import { formatarData, formatarHora, formatarMoeda, iniciais, descreverPrazo, capitalizar } from "./format";
import { PRONTUARIO_EM_BRANCO, normalizarProntuario, validarProntuario } from "./prontuario";
import {
  caminhoCoerente,
  dimensoesSanas,
  legendaNormalizada,
  motivoDaRecusa,
  motivoDataInvalida,
  TAMANHO_MAXIMO,
  tipoPeloConteudo,
} from "./prontuario-imagens";

const campo = (mudancas: Partial<CampoDoModelo>): CampoDoModelo => ({
  chave: "c1",
  rotulo: "Pergunta",
  tipo: "texto",
  obrigatorio: false,
  ajuda: "",
  opcoes: [],
  ...mudancas,
});

describe("documento", () => {
  it("anamnese não se assina; em aberto ela está em preenchimento", () => {
    expect(seAssina("anamnese")).toBe(false);
    expect(seAssina("contrato")).toBe(true);
    expect(rotuloDaSituacao("emitido", "anamnese")).toBe("Em preenchimento");
    expect(rotuloDaSituacao("emitido", "contrato")).not.toBe("Em preenchimento");
  });

  it("assinatura: nome obrigatório; CPF opcional, mas válido quando informado", () => {
    expect(validarAssinatura({ nome: "Ana Maria", cpf: "", verificacao: "RG conferido" })).toEqual({});
    expect(validarAssinatura({ nome: "Ana Maria", cpf: "52998224725", verificacao: "RG conferido" })).toEqual({});
    expect(validarAssinatura({ nome: "An", cpf: "52998224726", verificacao: "" })).toEqual({
      nome: expect.any(String),
      cpf: expect.any(String),
      verificacao: expect.any(String),
    });
  });

  it("perguntas do modelo: enunciado, duplicata e alternativas", () => {
    expect(validarCampos([campo({})])).toBeNull();
    expect(validarCampos([campo({ rotulo: " " })])).toMatch(/sem enunciado/);
    expect(validarCampos([campo({}), campo({})])).toMatch(/duplicada/);
    expect(validarCampos([campo({ tipo: "escolha_unica", opcoes: [" "] })])).toMatch(/alternativa/);
    expect(validarCampos([campo({ tipo: "escolha_multipla", opcoes: ["A", "A"] })])).toMatch(/repetidas/);
    expect(validarCampos(Array.from({ length: 121 }, (_, i) => campo({ chave: `c${i}` })))).toMatch(/120/);
  });

  it("resposta conferida como o banco confere", () => {
    expect(validarResposta(campo({ tipo: "data" }), "2026-02-31")).toBe("Data inválida.");
    expect(validarResposta(campo({ tipo: "data" }), "2026-02-28")).toBeNull();
    expect(validarResposta(campo({ tipo: "numero" }), "1,5")).toBeNull();
    expect(validarResposta(campo({ tipo: "numero" }), "abc")).toMatch(/número/);
    expect(validarResposta(campo({ tipo: "escolha_unica", opcoes: ["Sim"] }), "Talvez")).toMatch(/alternativas/);
    expect(validarResposta(campo({}), "")).toBeNull();
  });

  it("situação da anamnese é derivada, nunca gravada", () => {
    const respondido = (m: Partial<CampoRespondido>): CampoRespondido => ({
      ...campo({}),
      resposta: null,
      respostas: null,
      ...m,
    });
    expect(situacaoDaAnamnese([])).toBe("vazia");
    expect(situacaoDaAnamnese([respondido({ obrigatorio: true })])).toBe("vazia");
    expect(
      situacaoDaAnamnese([
        respondido({ chave: "a", obrigatorio: true, resposta: "sim" }),
        respondido({ chave: "b", obrigatorio: true }),
      ]),
    ).toBe("parcial");
    expect(
      situacaoDaAnamnese([
        respondido({ chave: "a", obrigatorio: true, resposta: "sim" }),
        respondido({ chave: "b", tipo: "escolha_multipla", respostas: ["A"] }),
      ]),
    ).toBe("completa");
    expect(obrigatoriasPendentes([respondido({ obrigatorio: true, resposta: "  " })])).toBe(1);
  });
});

describe("link público", () => {
  const token = "A".repeat(43);

  it("token só no formato gerado", () => {
    expect(tokenPlausivel(token)).toBe(true);
    expect(tokenPlausivel("%E0%A4%A")).toBe(false);
    expect(tokenPlausivel("../../etc")).toBe(false);
    expect(tokenPlausivel("A".repeat(129))).toBe(false);
    expect(tokenPlausivel(undefined)).toBe(false);
  });

  it("origem configurada: só protocolo, domínio e porta, https fora do localhost", () => {
    const com = (configurada: string) => origemPublica({ configurada, host: "atacante.exemplo", protocolo: "http" });
    expect(com("https://cockpit.exemplo.com.br/")).toEqual({ ok: true, origem: "https://cockpit.exemplo.com.br" });
    expect(com("http://localhost:3000")).toEqual({ ok: true, origem: "http://localhost:3000" });
    expect(com("http://cockpit.exemplo.com.br").ok).toBe(false);
    expect(com("https://cockpit.exemplo.com.br/assinar").ok).toBe(false);
    expect(com("https://usuario:senha@cockpit.exemplo.com.br").ok).toBe(false);
    expect(com("https://cockpit.exemplo.com.br?x=1").ok).toBe(false);
    expect(com("javascript:alert(1)").ok).toBe(false);
    expect(com("não é url").ok).toBe(false);
  });

  it("sem configuração, o Host é conferido e http só fica em localhost", () => {
    const sem = (host: string | null, protocolo: string | null = null) =>
      origemPublica({ configurada: undefined, host, protocolo });
    expect(sem("localhost:3000")).toEqual({ ok: true, origem: "http://localhost:3000" });
    expect(sem("Cockpit.Exemplo.com.br", "https,http")).toEqual({ ok: true, origem: "https://cockpit.exemplo.com.br" });
    expect(sem("cockpit.exemplo.com.br", "http")).toEqual({ ok: true, origem: "https://cockpit.exemplo.com.br" });
    expect(sem("cockpit.exemplo.com.br", "javascript")).toEqual({ ok: true, origem: "https://cockpit.exemplo.com.br" });
    expect(sem(null).ok).toBe(false);
    expect(sem("evil.com/phish").ok).toBe(false);
    expect(sem("user@evil.com").ok).toBe(false);
    expect(sem("evil.com\\@bom.com").ok).toBe(false);
  });

  it("em produção, sem ORIGEM_PUBLICA, o Host de fora não vira origem do link", () => {
    const producao = (host: string, configurada?: string) =>
      origemPublica({ configurada, host, protocolo: "https", producao: true });
    expect(producao("preview-123.exemplo.app").ok).toBe(false);
    expect(producao("localhost:3000")).toEqual({ ok: true, origem: "https://localhost:3000" });
    expect(producao("preview-123.exemplo.app", "https://cockpit.exemplo.com.br")).toEqual({
      ok: true,
      origem: "https://cockpit.exemplo.com.br",
    });
  });

  it("endereço só com token válido; canal no formato da CHECK", () => {
    expect(enderecoDoLink("https://x.com.br", token)).toBe(`https://x.com.br/assinar/${token}`);
    expect(enderecoDoLink("https://x.com.br", "curto")).toBeNull();
    expect(canalDeEnvioValido("")).toBe(true);
    expect(canalDeEnvioValido("WhatsApp (11) 91234-5678")).toBe(true);
    expect(canalDeEnvioValido("E-mail ana@x.com")).toBe(false);
  });
});

describe("prontuário", () => {
  const valido = {
    ...PRONTUARIO_EM_BRANCO,
    paciente_id: "c0000000-0000-4000-8000-000000000001",
    data_registro: "2026-09-22",
    titulo: "Avaliação",
    queixa: "Queixa",
  };

  it("pelo menos um campo clínico, data real e título", () => {
    expect(validarProntuario(valido)).toEqual({});
    expect(validarProntuario({ ...valido, queixa: "" })).toHaveProperty("queixa");
    expect(validarProntuario({ ...valido, data_registro: "2026-02-30" })).toHaveProperty("data_registro");
    expect(validarProntuario({ ...valido, titulo: "A" })).toHaveProperty("titulo");
  });

  it("limites com par no banco recusam no campo, sem cortar", () => {
    expect(validarProntuario({ ...valido, evolucao: "x".repeat(6000) })).toEqual({});
    expect(validarProntuario({ ...valido, evolucao: "x".repeat(6001) })).toHaveProperty("evolucao");
    expect(validarProntuario({ ...valido, titulo: "x".repeat(161) })).toHaveProperty("titulo");
    expect(
      validarProntuario({ ...valido, motivo: "x".repeat(241) }, { exigirMotivo: true }),
    ).toHaveProperty("motivo");
  });

  it("quebras CRLF do envio contam como 1 caractere, como no maxLength", () => {
    // 150 linhas: 5.999 no textarea (quebra = 1), 6.148 se o CR contasse.
    const digitado = Array.from({ length: 150 }, () => "x".repeat(39)).join("\r\n");
    expect(digitado.length).toBeGreaterThan(6000);
    const valores = normalizarProntuario({ ...valido, evolucao: digitado });
    expect(valores.evolucao).not.toContain("\r");
    expect(valores.evolucao.length).toBeLessThanOrEqual(6000);
    expect(validarProntuario(valores)).toEqual({});
    expect(normalizarProntuario({ ...valido, conduta: "a\rb\r\nc" }).conduta).toBe("a\nb\nc");
  });

  it("nova versão exige motivo", () => {
    expect(validarProntuario(valido, { exigirMotivo: true })).toHaveProperty("motivo");
    expect(validarProntuario({ ...valido, motivo: "corrigir dose" }, { exigirMotivo: true })).toEqual({});
  });
});

describe("fotos de evolução", () => {
  const id = "c0000000-0000-4000-8000-000000000001";

  it("caminho tem a forma <prontuario>/<uuid>.<ext> e pertence ao prontuário", () => {
    expect(caminhoCoerente(id, `${id}/0b2f8a3e-4c1d-4f2a-9b3c-1d2e3f4a5b6c.jpg`)).toBe(true);
    expect(caminhoCoerente(id, `outro/0b2f8a3e-4c1d-4f2a-9b3c-1d2e3f4a5b6c.jpg`)).toBe(false);
    expect(caminhoCoerente(id, `${id}/maria-antes.jpg`)).toBe(false);
    expect(caminhoCoerente(id, `${id}/0b2f8a3e-4c1d-4f2a-9b3c-1d2e3f4a5b6c.gif`)).toBe(false);
    // O ponto é literal, e maiúscula não passa: o banco só aceita minúsculo.
    expect(caminhoCoerente(id, `${id}/0b2f8a3e-4c1d-4f2a-9b3c-1d2e3f4a5b6cXjpg`)).toBe(false);
    expect(caminhoCoerente(id, `${id}/0B2F8A3E-4C1D-4F2A-9B3C-1D2E3F4A5B6C.jpg`)).toBe(false);
    expect(caminhoCoerente(id, `${id}/0b2f8a3e-4c1d-4f2a-9b3c-1d2e3f4a5b6c.JPG`)).toBe(false);
  });

  it("tipo pelo conteúdo: os primeiros bytes, não o nome", () => {
    expect(tipoPeloConteudo(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(
      tipoPeloConteudo(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toBe("image/png");
    expect(tipoPeloConteudo(new TextEncoder().encode("RIFF\u0000\u0000\u0000\u0000WEBPVP8 "))).toBe("image/webp");
    expect(tipoPeloConteudo(new TextEncoder().encode("GIF89a"))).toBeNull();
    expect(tipoPeloConteudo(new TextEncoder().encode("<svg onload=x>"))).toBeNull();
    expect(tipoPeloConteudo(new Uint8Array([]))).toBeNull();
  });

  it("tipo, tamanho e data de captura", () => {
    expect(motivoDaRecusa({ tipo: "image/jpeg", tamanho: 1000 })).toBeNull();
    expect(motivoDaRecusa({ tipo: "image/gif", tamanho: 1000 })).toMatch(/Formato/);
    expect(motivoDaRecusa({ tipo: "image/png", tamanho: 0 })).toMatch(/vazio/);
    expect(motivoDaRecusa({ tipo: "image/png", tamanho: TAMANHO_MAXIMO + 1 })).toMatch(/limite/);
    expect(motivoDataInvalida("2026-09-23", "2026-09-22")).toMatch(/futuro/);
    expect(motivoDataInvalida("2026-02-30", "2026-09-22")).toBe("Data inválida.");
    expect(motivoDataInvalida("2026-09-22", "2026-09-22")).toBeNull();
  });

  it("dimensões só quando fazem sentido; legenda normalizada", () => {
    expect(dimensoesSanas(800, 600)).toEqual({ largura: 800, altura: 600 });
    expect(dimensoesSanas(0, 600)).toBeNull();
    expect(dimensoesSanas("abc", 600)).toBeNull();
    expect(legendaNormalizada("  antes   da\n sessão ")).toBe("antes da sessão");
  });
});

describe("formatação pt-BR no fuso da clínica", () => {
  const semEspacoFixo = (t: string) => t.replace(/\s/g, " ");

  it("moeda e data", () => {
    expect(semEspacoFixo(formatarMoeda(1250.5))).toBe("R$ 1.250,50");
    expect(formatarData(new Date("2026-09-23T02:00:00Z"))).toBe("22/09/2026");
    expect(formatarHora(new Date("2026-09-22T17:30:00Z"))).toBe("14:30");
  });

  it("iniciais, prazo e maiúscula", () => {
    expect(iniciais("Dra. Érika Passos")).toBe("ÉP");
    expect(iniciais("Ana")).toBe("AN");
    expect(descreverPrazo(0)).toBe("hoje");
    expect(descreverPrazo(1)).toBe("amanhã");
    expect(descreverPrazo(-1)).toBe("ontem");
    expect(descreverPrazo(3)).toBe("em 3 dias");
    expect(descreverPrazo(-2)).toBe("há 2 dias");
    expect(capitalizar("érika")).toBe("Érika");
  });
});
