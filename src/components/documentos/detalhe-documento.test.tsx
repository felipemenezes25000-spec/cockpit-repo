import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SituacaoDocumento } from "@/lib/documento";
import type { AssinaturaDoDocumento, DocumentoCompleto } from "@/server/consultas/documentos";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/server/acoes/documentos", () => ({
  assinarDocumento: vi.fn(),
  cancelarDocumento: vi.fn(),
  responderAnamnese: vi.fn(),
}));
vi.mock("@/server/acoes/assinatura-link", () => ({
  criarLinkAssinatura: vi.fn(),
  registrarCanalDoLink: vi.fn(),
  revogarLinkAssinatura: vi.fn(),
  responderPorLink: vi.fn(),
  carimbarAgora: vi.fn(),
}));

const { DetalheDocumento } = await import("./detalhe-documento");

function anamnese(situacao: SituacaoDocumento): DocumentoCompleto {
  return {
    id: "d0000000-0000-4000-8000-000000000001",
    tipo: "anamnese",
    titulo: "Anamnese facial",
    situacao,
    pacienteId: "p0000000-0000-4000-8000-000000000001",
    paciente: "Maria Souza",
    pacienteTelefone: null,
    pacienteEmail: null,
    corpo: "Responda com atenção.",
    hash: "f".repeat(64),
    modeloId: null,
    modeloNome: null,
    modeloVersao: null,
    documentoAnteriorId: null,
    motivoCancelamento: situacao === "cancelado" ? "Emitida para a paciente errada." : "",
    emitidoEm: new Date("2026-09-20T12:00:00Z"),
    emitidoPor: null,
    exemplo: false,
    assinatura: null,
    campos: [
      {
        chave: "alergia",
        rotulo: "Tem alergia?",
        tipo: "sim_nao",
        obrigatorio: true,
        ajuda: "",
        opcoes: [],
        resposta: "nao",
        respostas: null,
      },
      {
        chave: "observacoes",
        rotulo: "Observações",
        tipo: "texto_longo",
        obrigatorio: false,
        ajuda: "",
        opcoes: [],
        resposta: "Nenhuma.",
        respostas: null,
      },
    ],
  };
}

describe("DetalheDocumento — só a anamnese em vigor aceita resposta", () => {
  it("emitida: formulário editável, com Salvar", () => {
    render(<DetalheDocumento documento={anamnese("emitido")} links={[]} />);

    expect(screen.getByRole("heading", { name: "Preencher na consulta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Salvar respostas/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Não" })).toBeEnabled();
  });

  it.each([
    ["cancelado", /cancelada, não aceita mais respostas/],
    ["substituido", /substituída por uma correção, não aceita mais respostas/],
  ] as const)("%s: respostas à vista, só para leitura, sem Salvar", (situacao, frase) => {
    render(<DetalheDocumento documento={anamnese(situacao)} links={[]} />);

    expect(screen.getByRole("heading", { name: "Respostas registradas" })).toBeInTheDocument();
    expect(screen.getByText(frase)).toBeInTheDocument();
    expect(screen.queryByText(/podem ser corrigidas/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Salvar respostas/ })).toBeNull();

    // As respostas continuam legíveis, mas nada se altera.
    expect(screen.getByRole("radio", { name: "Não" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Não" })).toBeDisabled();
    expect(screen.getByLabelText(/Observações/)).toBeDisabled();
  });
});

function contratoAssinado(mudanca: Partial<AssinaturaDoDocumento>): DocumentoCompleto {
  return {
    ...anamnese("assinado"),
    tipo: "contrato",
    titulo: "Contrato de prestação de serviços",
    campos: [],
    assinatura: {
      nome: "Maria Souza",
      cpf: null,
      assinadoEm: new Date("2026-09-23T15:00:00Z"),
      hashAssinado: "f".repeat(64),
      ip: "200.1.2.3",
      dispositivo: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36",
      verificacao: "Data de nascimento e código por e-mail conferidos pelo link",
      operador: null,
      canal: "link",
      provedor: "interno",
      referenciaExterna: null,
      urlComprovante: null,
      rubrica: "M100 200L300 220L500 180",
      rubricaDispensada: false,
      leituraSegundos: 134,
      leituraCompleta: true,
      localizacao: "São Paulo, SP, BR",
      fatores: ["posse_do_link", "data_de_nascimento", "codigo_por_email"],
      codigoVerificacao: "ABCD-EFGH-JKLM",
      manifesto: "Manifesto de assinatura eletrônica — Cockpit (v1)",
      manifestoHash: "e".repeat(64),
      carimboEm: null,
      carimboAutoridade: null,
      ...mudanca,
    },
  };
}

describe("DetalheDocumento — evidências da assinatura", () => {
  it("mostra rubrica, fatores, leitura, local, aparelho e o código que abre a verificação", () => {
    render(<DetalheDocumento documento={contratoAssinado({})} links={[]} />);

    expect(screen.getByRole("img", { name: "Rubrica de quem assinou" })).toBeInTheDocument();
    expect(screen.getByText("Código por e-mail confirmado")).toBeInTheDocument();
    expect(screen.getByText(/aberto por 2 min 14 s antes de assinar · rolou o texto até o fim/)).toBeInTheDocument();
    expect(screen.getByText("São Paulo, SP, BR (pela rede)")).toBeInTheDocument();
    expect(screen.getByText(/^Android · Chrome — /)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ABCD-EFGH-JKLM/ })).toHaveAttribute("href", "/verificar/ABCD-EFGH-JKLM");
    expect(screen.getByText("Texto idêntico ao assinado")).toBeInTheDocument();
  });

  it("sem carimbo: oferece carimbar agora; com carimbo: mostra a autoridade e o arquivo .tsr", () => {
    const { unmount } = render(<DetalheDocumento documento={contratoAssinado({})} links={[]} />);
    expect(screen.getByRole("button", { name: /Carimbar agora/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Carimbo de tempo \(.tsr\)/ })).toBeNull();
    unmount();

    render(
      <DetalheDocumento
        documento={contratoAssinado({ carimboEm: new Date("2026-09-23T15:00:02Z"), carimboAutoridade: "DigiCert" })}
        links={[]}
      />,
    );
    expect(screen.queryByRole("button", { name: /Carimbar agora/ })).toBeNull();
    expect(screen.getByText(/DigiCert · RFC 3161/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Carimbo de tempo \(.tsr\)/ })).toHaveAttribute(
      "href",
      "/formularios/d0000000-0000-4000-8000-000000000001/prova/carimbo",
    );
  });

  it("assinatura pelo nome: diz que a rubrica foi dispensada", () => {
    render(<DetalheDocumento documento={contratoAssinado({ rubrica: null, rubricaDispensada: true })} links={[]} />);
    expect(screen.getByText("Assinou pelo nome (rubrica dispensada)")).toBeInTheDocument();
  });
});
