import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteApplicationButton } from "./delete-application-button";
import { DeletionAnnouncer } from "./deletion-announcer";
import { deleteApplicationAction } from "@/lib/applications/actions";
import type { DeleteApplicationState } from "@/lib/applications/form-state";

vi.mock("@/lib/applications/actions", () => ({
  createApplicationAction: vi.fn(),
  updateApplicationAction: vi.fn(),
  deleteApplicationAction: vi.fn(),
}));

const deleteMock = vi.mocked(deleteApplicationAction);
const ID = "3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b";

/*
 * jsdom does not implement the modal methods of <dialog>. This minimal
 * stand-in toggles `open` and fires `close` like the browser does; focus
 * trapping and Escape are covered by the e2e test in a real browser.
 */
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function setup() {
  const user = userEvent.setup();
  render(
    <DeleteApplicationButton id={ID} company="Acme" position="Frontend" />,
  );
  const trigger = screen.getByRole("button", {
    name: "Borrar la candidatura de Frontend en Acme",
  });
  return { user, trigger };
}

describe("DeleteApplicationButton", () => {
  beforeEach(() => {
    deleteMock.mockReset();
  });

  it("no muestra el diálogo hasta pulsar Borrar", () => {
    setup();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("abre un diálogo con título, descripción y el foco en Cancelar", async () => {
    const { user, trigger } = setup();

    await user.click(trigger);

    const dialog = screen.getByRole("dialog", {
      name: "¿Borrar la candidatura?",
    });
    expect(dialog).toHaveAccessibleDescription(
      "Se borrará la candidatura de Frontend en Acme. Esta acción no se puede deshacer.",
    );
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
  });

  it("al cancelar cierra el diálogo, no borra y devuelve el foco", async () => {
    const { user, trigger } = setup();

    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(deleteMock).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it("al confirmar llama a la acción con el id y cierra el diálogo", async () => {
    const pending = deferred<DeleteApplicationState>();
    deleteMock.mockReturnValue(pending.promise);
    const { user, trigger } = setup();

    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Sí, borrar" }));

    expect(
      await screen.findByRole("button", { name: "Borrando…" }),
    ).toBeDisabled();
    expect(deleteMock).toHaveBeenCalledTimes(1);
    const formData = deleteMock.mock.calls[0]![1];
    expect(formData.get("id")).toBe(ID);

    pending.resolve({ ok: true, data: { id: ID } });
    expect(
      await screen.findByRole("button", { name: "Sí, borrar", hidden: true }),
    ).toBeEnabled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("si falla muestra el error con role alert y deja el diálogo abierto", async () => {
    deleteMock.mockResolvedValue({
      ok: false,
      message: "No se ha encontrado la candidatura",
    });
    const { user, trigger } = setup();

    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Sí, borrar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se ha encontrado la candidatura",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  describe("dentro de la página de la lista", () => {
    function setupInPage() {
      const user = userEvent.setup();
      render(
        <DeletionAnnouncer>
          <h1 tabIndex={-1}>Mis candidaturas</h1>
          <DeleteApplicationButton id={ID} company="Acme" position="Frontend" />
        </DeletionAnnouncer>,
      );
      const trigger = screen.getByRole("button", {
        name: "Borrar la candidatura de Frontend en Acme",
      });
      return { user, trigger };
    }

    it("tras borrar anuncia «Candidatura borrada» y lleva el foco al h1", async () => {
      deleteMock.mockResolvedValue({ ok: true, data: { id: ID } });
      const { user, trigger } = setupInPage();

      await user.click(trigger);
      await user.click(screen.getByRole("button", { name: "Sí, borrar" }));

      const message = await screen.findByText(
        "Candidatura borrada: Frontend en Acme.",
      );
      const region = message.closest("[aria-live]");
      expect(region).toHaveAttribute("aria-live", "polite");
      expect(region).toHaveClass("sr-only");
      expect(
        screen.getByRole("heading", { level: 1, name: "Mis candidaturas" }),
      ).toHaveFocus();
      expect(trigger).not.toHaveFocus();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("si el borrado falla no anuncia nada y el foco sigue en el diálogo", async () => {
      deleteMock.mockResolvedValue({
        ok: false,
        message: "No se ha podido borrar la candidatura",
      });
      const { user, trigger } = setupInPage();

      await user.click(trigger);
      const confirm = screen.getByRole("button", { name: "Sí, borrar" });
      await user.click(confirm);

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "No se ha podido borrar la candidatura",
      );
      expect(screen.queryByText(/Candidatura borrada/)).not.toBeInTheDocument();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { level: 1, name: "Mis candidaturas" }),
      ).not.toHaveFocus();
    });

    it("al cancelar el foco vuelve al botón, no al h1", async () => {
      const { user, trigger } = setupInPage();

      await user.click(trigger);
      await user.click(screen.getByRole("button", { name: "Cancelar" }));

      expect(trigger).toHaveFocus();
      expect(screen.queryByText(/Candidatura borrada/)).not.toBeInTheDocument();
    });
  });
});
