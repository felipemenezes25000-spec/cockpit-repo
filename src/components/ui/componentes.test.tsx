import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Archive } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { falha, sucesso, type ResultadoAcao } from "@/lib/acao";
import { BotaoIndisponivel } from "./button";
import { AREA_TEXTO, Campo, ENTRADA, ENTRADA_ERRO } from "./field";
import { BotaoDeAcao, FormularioDeAcao } from "./formulario-acao";
import { ESTILO_SITUACAO, SituacaoChip, SITUACOES_EM_ORDEM } from "./status-chip";
import { EstadoVazio } from "./empty-state";
import { NavegacaoEmAbas } from "./abas";
import { Paginacao } from "./paginacao";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

describe("Campo — rótulo, erro e obrigatório ligados ao controle", () => {
  it("o rótulo nomeia o controle", () => {
    render(
      <Campo id="nome" rotulo="Nome completo" obrigatorio>
        <input id="nome" className={ENTRADA} />
      </Campo>,
    );
    expect(screen.getByLabelText(/Nome completo/)).toBeInstanceOf(HTMLInputElement);
  });

  it("erro vira aria-invalid e aria-describedby, e é anunciado", () => {
    render(
      <Campo id="cpf" rotulo="CPF" erro="CPF inválido.">
        <input id="cpf" />
      </Campo>,
    );
    const campo = screen.getByLabelText(/CPF/);
    expect(campo).toHaveAttribute("aria-invalid", "true");
    expect(campo).toHaveAttribute("aria-describedby", "cpf-erro");
    expect(screen.getByRole("alert")).toHaveTextContent("CPF inválido.");
  });

  it("dica descreve o controle quando não há erro; obrigatório vira aria-required", () => {
    render(
      <Campo id="valor" rotulo="Valor" dica="Use 150 ou 150,00." obrigatorio>
        <input id="valor" />
      </Campo>,
    );
    const campo = screen.getByLabelText(/Valor/);
    expect(campo).toHaveAttribute("aria-describedby", "valor-dica");
    expect(campo).toHaveAttribute("aria-required", "true");
    expect(campo).not.toHaveAttribute("aria-invalid");
  });

  it("preserva o aria-describedby que o controle já tinha, sem duplicar", () => {
    render(
      <Campo id="obs" rotulo="Observações" erro="Longo demais.">
        <textarea id="obs" className={AREA_TEXTO} aria-describedby="obs-contador obs-erro" />
      </Campo>,
    );
    expect(screen.getByLabelText(/Observações/)).toHaveAttribute("aria-describedby", "obs-contador obs-erro");
  });

  it("filho composto não é tocado — quem compõe decide", () => {
    render(
      <Campo id="composto" rotulo="Composto" erro="Erro.">
        <div data-testid="grupo">
          <input id="composto" />
        </div>
      </Campo>,
    );
    expect(screen.getByTestId("grupo")).not.toHaveAttribute("aria-invalid");
  });
});

describe("Controles — foco visível independe da cor da borda (WCAG 2.4.7)", () => {
  const classes = (texto: string) => texto.split(/\s+/);

  it("a base não apaga o anel de foco e desenha um anel com recuo", () => {
    for (const classe of [ENTRADA, AREA_TEXTO]) {
      expect(classes(classe)).not.toContain("outline-none");
      expect(classes(classe)).not.toContain("outline-hidden");
      expect(classes(classe)).toEqual(
        expect.arrayContaining([
          "focus-visible:outline-2",
          "focus-visible:outline-offset-2",
          "focus-visible:outline-primary",
        ]),
      );
    }
  });

  it("a classe de erro só pinta a borda, sem anular o sinal de foco", () => {
    expect(classes(ENTRADA_ERRO)).toEqual(["border-error!"]);
    expect(ENTRADA_ERRO).not.toMatch(/focus|outline/);
  });
});

describe("FormularioDeAcao — a resposta da ação volta para a tela", () => {
  it("recusa aparece ao lado do botão, anunciada", async () => {
    const acao = vi.fn(async (_: ResultadoAcao, dados: FormData) => {
      expect(dados.get("id")).toBe("123");
      return falha("A situação já tinha mudado.");
    });

    render(
      <FormularioDeAcao acao={acao} campos={{ id: "123" }}>
        <BotaoDeAcao icone={<Archive />}>Arquivar</BotaoDeAcao>
      </FormularioDeAcao>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Arquivar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("A situação já tinha mudado.");
    expect(acao).toHaveBeenCalledOnce();
  });

  it("sucesso é dito só ao leitor de tela", async () => {
    const acao = vi.fn(async () => sucesso("Paciente arquivada."));
    render(
      <FormularioDeAcao acao={acao} campos={{ id: "1" }}>
        <BotaoDeAcao>Arquivar</BotaoDeAcao>
      </FormularioDeAcao>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Arquivar" }));

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Paciente arquivada.");
    expect(status).toHaveClass("sr-only");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("confirmação negada não envia", async () => {
    const acao = vi.fn(async () => sucesso());
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(
      <FormularioDeAcao acao={acao} campos={{ id: "1" }} confirmacao="Cancelar mesmo?">
        <BotaoDeAcao>Cancelar</BotaoDeAcao>
      </FormularioDeAcao>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(window.confirm).toHaveBeenCalledWith("Cancelar mesmo?");
    await waitFor(() => expect(acao).not.toHaveBeenCalled());
  });

  it("nome acessível próprio quando o texto visível não basta", () => {
    render(
      <FormularioDeAcao acao={vi.fn(async () => sucesso())} campos={{}}>
        <BotaoDeAcao rotuloAcessivel="Arquivar a foto de 12/03">Arquivar</BotaoDeAcao>
      </FormularioDeAcao>,
    );
    expect(screen.getByRole("button", { name: "Arquivar a foto de 12/03" })).toBeTruthy();
  });
});

describe("estado nunca só por cor", () => {
  it("todo chip de situação tem texto e ícone", () => {
    for (const situacao of SITUACOES_EM_ORDEM) {
      const { container, unmount } = render(<SituacaoChip situacao={situacao} />);
      expect(container.textContent).toBe(ESTILO_SITUACAO[situacao].rotulo);
      expect(container.querySelector("svg")).not.toBeNull();
      unmount();
    }
  });

  it("estado vazio convida a agir", () => {
    render(
      <EstadoVazio
        icone={Archive}
        titulo="Nenhuma paciente"
        descricao="Cadastre a primeira."
        acao={<button type="button">Cadastrar</button>}
      />,
    );
    expect(screen.getByText("Nenhuma paciente")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cadastrar" })).toBeTruthy();
  });
});

describe("TelaDeErro", () => {
  it("não mostra o erro técnico, mostra o código e oferece tentar de novo", async () => {
    const { TelaDeErro } = await import("@/components/layout/tela-de-erro");
    const tentar = vi.fn();
    const erro = Object.assign(new Error('relation "pacientes" does not exist'), { digest: "abc123" });

    render(<TelaDeErro erro={erro} tentarDeNovo={tentar} />);

    expect(screen.queryByText(/relation/)).toBeNull();
    expect(screen.getByText("abc123")).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Não foi possível carregar/ })).toHaveFocus();

    await userEvent.click(screen.getByRole("button", { name: /Tentar de novo/ }));
    expect(tentar).toHaveBeenCalledOnce();
  });
});

describe("BotaoIndisponivel — indisponível e dizendo por quê", () => {
  it("o motivo entra no nome acessível, não só no title", () => {
    render(<BotaoIndisponivel motivo="A exportação chega em uma próxima etapa">Exportar</BotaoIndisponivel>);
    const botao = screen.getByRole("button", { name: /Exportar.*próxima etapa/ });
    expect(botao).toHaveAttribute("aria-disabled", "true");
    expect(botao).toHaveAttribute("title", "A exportação chega em uma próxima etapa");
  });

  it("sem motivo informado, usa o padrão em vez de ficar mudo", () => {
    render(<BotaoIndisponivel>Imprimir</BotaoIndisponivel>);
    expect(screen.getByRole("button", { name: /Imprimir.*Disponível em uma próxima etapa/ })).toBeTruthy();
  });
});

describe("Paginacao — uma só para as três listas", () => {
  it("com uma página, não aparece", () => {
    const { container } = render(
      <Paginacao pagina={1} paginas={1} parametros={{}} caminho="/pacientes" rotulo="Paginação dos pacientes" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("links levam o caminho da lista e preservam busca e filtro", () => {
    render(
      <Paginacao
        pagina={2}
        paginas={3}
        parametros={{ busca: "ana", situacao: "todas" }}
        caminho="/prontuarios"
        rotulo="Paginação dos prontuários"
      />,
    );
    expect(screen.getByRole("navigation", { name: "Paginação dos prontuários" })).toBeInTheDocument();
    // Voltar para a página 1 tira o parâmetro `pagina`, em vez de mandar `pagina=1`.
    expect(screen.getByRole("link", { name: /Anterior/ })).toHaveAttribute(
      "href",
      "/prontuarios?busca=ana&situacao=todas",
    );
    expect(screen.getByRole("link", { name: /Próxima/ })).toHaveAttribute(
      "href",
      "/prontuarios?busca=ana&situacao=todas&pagina=3",
    );
    expect(screen.getByText("Página 2 de 3")).toHaveAttribute("aria-current", "page");
  });

  it("na última página, 'Próxima' não é link", () => {
    render(<Paginacao pagina={2} paginas={2} parametros={{}} caminho="/formularios" rotulo="Paginação dos documentos" />);
    expect(screen.queryByRole("link", { name: /Próxima/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Anterior/ })).toHaveAttribute("href", "/formularios");
  });
});

describe("NavegacaoEmAbas — a área atual abre à vista", () => {
  it("rola a faixa até a aba atual, centralizando-a", () => {
    // O jsdom não calcula layout: as medidas vêm dos protótipos.
    const medidas = [
      vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockReturnValue(500),
      vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(120),
      vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(280),
    ];
    render(
      <NavegacaoEmAbas
        rotulo="Áreas do financeiro"
        abas={[
          { href: "/financeiro", rotulo: "Visão geral", ativa: false },
          { href: "/financeiro/fluxo", rotulo: "Fluxo mensal", ativa: true },
        ]}
      />,
    );
    const faixa = screen.getByRole("list").parentElement;
    // 500 + 120/2 − 280/2 = 420: o centro da aba no centro da faixa.
    expect(faixa?.scrollLeft).toBe(420);
    expect(screen.getByRole("link", { name: "Fluxo mensal" })).toHaveAttribute("aria-current", "page");
    for (const medida of medidas) medida.mockRestore();
  });
});
