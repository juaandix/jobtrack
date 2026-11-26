import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KanbanBoard } from "./kanban-board";
import { updateStatusAction } from "@/lib/applications/actions";
import {
  APPLICATION_ERROR_MESSAGES,
  notFoundError,
  type ApplicationResult,
} from "@/lib/applications/errors";
import type { Application } from "@/lib/applications/repository";

vi.mock("@/lib/applications/actions", () => ({
  updateStatusAction: vi.fn(),
}));

const updateMock = vi.mocked(updateStatusAction);

const ACME: Application = {
  id: "3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b",
  user_id: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
  company: "Acme",
  position: "Frontend",
  offer_url: null,
  portal: "linkedin",
  applied_at: "2026-11-25",
  salary_min: null,
  salary_max: null,
  status: "enviada",
  notes: null,
  created_at: "2026-11-25T10:00:00Z",
  updated_at: "2026-11-25T10:00:00Z",
};

const GLOBEX: Application = {
  ...ACME,
  id: "1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
  company: "Globex",
  position: "Backend",
  status: "entrevista",
};

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (reason: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function column(name: string) {
  return screen.getByRole("region", { name: new RegExp(`^${name}, `) });
}

function companiesIn(name: string): string[] {
  return within(column(name))
    .queryAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent ?? "");
}

/** The board's own live region (dnd-kit adds another `role="status"`). */
async function findNotice(text: string) {
  return screen.findByText((content) => content.includes(text));
}

function statusSelect(name: string) {
  return screen.getByLabelText(`Cambiar estado de ${name}`);
}

function setup(applications: readonly Application[] = [ACME, GLOBEX]) {
  const user = userEvent.setup();
  const view = render(<KanbanBoard applications={applications} />);
  return { user, ...view };
}

describe("KanbanBoard", () => {
  beforeEach(() => {
    updateMock.mockReset();
  });

  it("muestra todas las columnas en el orden del enum con su contador", () => {
    setup();

    const names = [
      "Enviada, 1 candidatura",
      "En proceso, 0 candidaturas",
      "Entrevista, 1 candidatura",
      "Oferta, 0 candidaturas",
      "Descartada, 0 candidaturas",
      "Rechazada por mí, 0 candidaturas",
    ];
    const regions = screen.getAllByRole("region");
    expect(regions).toHaveLength(names.length);
    regions.forEach((region, index) => {
      expect(region).toHaveAccessibleName(names[index]);
    });
    expect(
      screen.getByRole("region", { name: "Oferta, 0 candidaturas" }),
    ).toHaveTextContent("Sin candidaturas");
  });

  it("cada tarjeta muestra empresa, puesto, estado en texto y enlace a editar", () => {
    setup();

    const card = within(column("Enviada")).getByRole("listitem");
    expect(
      within(card).getByRole("heading", { level: 3, name: "Acme" }),
    ).toBeInTheDocument();
    expect(within(card).getByText("Frontend")).toBeInTheDocument();
    expect(
      within(card).getByText("Enviada", { ignore: "option" }),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole("link", {
        name: "Editar la candidatura de Frontend en Acme",
      }),
    ).toHaveAttribute(
      "href",
      "/dashboard/candidaturas/3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b/editar",
    );
    expect(statusSelect("Frontend en Acme")).toHaveValue("enviada");
  });

  it("el asa de arrastre es un botón con nombre y descripción para el teclado", () => {
    setup();

    const handle = screen.getByRole("button", {
      name: "Mover la candidatura de Frontend en Acme",
    });
    expect(handle).toHaveAttribute("aria-roledescription", "arrastrable");
    expect(handle).toHaveAccessibleDescription(
      /pulsa Espacio o Intro\. Usa las flechas izquierda y derecha/,
    );
  });

  it("cambiar el estado con el selector mueve la tarjeta al instante y llama a la acción", async () => {
    const pending = deferred<ApplicationResult<Application>>();
    updateMock.mockReturnValue(pending.promise);
    const { user } = setup();

    await user.selectOptions(statusSelect("Frontend en Acme"), "Oferta");

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith(ACME.id, "oferta");
    expect(companiesIn("Oferta")).toEqual(["Acme"]);
    expect(companiesIn("Enviada")).toEqual([]);
    expect(
      screen.getByRole("region", { name: "Oferta, 1 candidatura" }),
    ).toBeInTheDocument();

    // While saving, only that card says so; the others stay usable.
    const saving = within(column("Oferta")).getByRole("listitem");
    expect(saving).toHaveAttribute("aria-busy", "true");
    expect(within(saving).getByText("Guardando…")).toBeInTheDocument();
    expect(statusSelect("Frontend en Acme")).toHaveFocus();
    const other = statusSelect("Backend en Globex");
    expect(other).not.toHaveAttribute("aria-disabled", "true");

    pending.resolve({ ok: true, data: { ...ACME, status: "oferta" } });

    expect(
      await findNotice(
        "La candidatura de Frontend en Acme está ahora en Oferta.",
      ),
    ).toHaveAttribute("role", "status");
    expect(screen.queryByText("Guardando…")).not.toBeInTheDocument();
    expect(companiesIn("Oferta")).toEqual(["Acme"]);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("mientras guarda, otra tarjeta puede cambiar y la misma no se cambia dos veces", async () => {
    const first = deferred<ApplicationResult<Application>>();
    updateMock.mockReturnValueOnce(first.promise);
    updateMock.mockResolvedValueOnce({
      ok: true,
      data: { ...GLOBEX, status: "descartada" },
    });
    const { user } = setup();

    await user.selectOptions(statusSelect("Frontend en Acme"), "Oferta");
    await user.selectOptions(statusSelect("Frontend en Acme"), "Descartada");
    await user.selectOptions(statusSelect("Backend en Globex"), "Descartada");

    expect(updateMock).toHaveBeenCalledTimes(2);
    expect(updateMock).toHaveBeenLastCalledWith(GLOBEX.id, "descartada");
    expect(
      await findNotice("Backend en Globex está ahora en Descartada"),
    ).toHaveAttribute("role", "status");
    expect(companiesIn("Oferta")).toEqual(["Acme"]);
    expect(companiesIn("Descartada")).toEqual(["Globex"]);

    first.resolve({ ok: true, data: { ...ACME, status: "oferta" } });
    expect(
      await screen.findByText(
        "La candidatura de Frontend en Acme está ahora en Oferta.",
      ),
    ).toBeInTheDocument();
  });

  it("si la acción falla la tarjeta vuelve a su columna y se avisa con un alert", async () => {
    updateMock.mockResolvedValue({ ok: false, error: notFoundError() });
    const { user } = setup();

    await user.selectOptions(statusSelect("Frontend en Acme"), "Entrevista");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se ha podido mover la candidatura de Frontend en Acme; sigue en Enviada. No se ha encontrado la candidatura",
    );
    expect(companiesIn("Enviada")).toEqual(["Acme"]);
    expect(companiesIn("Entrevista")).toEqual(["Globex"]);
    expect(statusSelect("Frontend en Acme")).toHaveValue("enviada");
    expect(statusSelect("Frontend en Acme")).toHaveFocus();
    expect(screen.queryByText("Guardando…")).not.toBeInTheDocument();
  });

  it("si la llamada se rechaza (red) también revierte y avisa", async () => {
    const call = deferred<ApplicationResult<Application>>();
    updateMock.mockReturnValue(call.promise);
    const { user } = setup();

    await user.selectOptions(statusSelect("Backend en Globex"), "Oferta");
    expect(companiesIn("Oferta")).toEqual(["Globex"]);
    call.reject(new TypeError("Failed to fetch"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      APPLICATION_ERROR_MESSAGES.unknown.update,
    );
    expect(companiesIn("Entrevista")).toEqual(["Globex"]);
    expect(companiesIn("Oferta")).toEqual([]);
  });

  it("un cambio correcto posterior quita el aviso de error", async () => {
    updateMock.mockResolvedValueOnce({ ok: false, error: notFoundError() });
    updateMock.mockResolvedValueOnce({
      ok: true,
      data: { ...ACME, status: "oferta" },
    });
    const { user } = setup();

    await user.selectOptions(statusSelect("Frontend en Acme"), "Entrevista");
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await user.selectOptions(statusSelect("Frontend en Acme"), "Oferta");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(await findNotice("está ahora en Oferta")).toHaveAttribute(
      "role",
      "status",
    );
  });

  it("elegir el mismo estado no llama a la acción", async () => {
    const { user } = setup();

    await user.selectOptions(statusSelect("Frontend en Acme"), "Enviada");

    expect(updateMock).not.toHaveBeenCalled();
    expect(companiesIn("Enviada")).toEqual(["Acme"]);
  });

  it("con datos nuevos del servidor muestra su estado", () => {
    const { rerender } = setup();

    rerender(
      <KanbanBoard
        applications={[{ ...ACME, status: "en_proceso" }, GLOBEX]}
      />,
    );

    expect(companiesIn("En proceso")).toEqual(["Acme"]);
    expect(companiesIn("Enviada")).toEqual([]);
  });

  it("con datos nuevos del servidor mantiene encima el cambio que aún se guarda", async () => {
    updateMock.mockReturnValue(
      deferred<ApplicationResult<Application>>().promise,
    );
    const { user, rerender } = setup();

    await user.selectOptions(statusSelect("Frontend en Acme"), "Oferta");
    rerender(
      <KanbanBoard
        applications={[ACME, { ...GLOBEX, company: "Globex Corp" }]}
      />,
    );

    expect(companiesIn("Oferta")).toEqual(["Acme"]);
    expect(companiesIn("Entrevista")).toEqual(["Globex Corp"]);
  });
});
