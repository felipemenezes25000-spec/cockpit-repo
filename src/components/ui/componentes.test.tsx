import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Archive } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { falha, sucesso, type ResultadoAcao } from "@/lib/acao";
import { AREA_TEXTO, Campo, ENTRADA } from "./field";
import { BotaoDeAcao, FormularioDeAcao } from "./formulario-acao";
import { ESTILO_SITUACAO, SituacaoChip, SITUACOES_EM_ORDEM } from "./status-chip";
import { EstadoVazio } from "./empty-state";

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
