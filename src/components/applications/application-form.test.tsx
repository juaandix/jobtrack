import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationForm } from "./application-form";
import {
  newApplicationValues,
  type ApplicationFormMode,
  type ApplicationFormState,
} from "@/lib/applications/form-state";
import {
  APPLICATION_MESSAGES,
  applicationCreateSchema,
  applicationUpdateSchema,
} from "@/lib/validation/application";

const action =
  vi.fn<
    (
      state: ApplicationFormState,
      formData: FormData,
    ) => Promise<ApplicationFormState>
  >();

function setup(
  values = newApplicationValues("2026-11-25"),
  mode: ApplicationFormMode = "create",
) {
  const user = userEvent.setup();
  render(
    <ApplicationForm
      mode={mode}
      action={action}
      initialValues={values}
      submitLabel="Guardar candidatura"
      pendingLabel="Guardando…"
    />,
  );
  return {
    user,
    company: screen.getByLabelText("Empresa"),
    position: screen.getByLabelText("Puesto"),
    status: screen.getByLabelText("Estado"),
    portal: screen.getByLabelText("Portal"),
    appliedAt: screen.getByLabelText("Fecha de la candidatura"),
    offerUrl: screen.getByLabelText(/Enlace a la oferta/),
    salaryMin: screen.getByLabelText(/Salario mínimo/),
    salaryMax: screen.getByLabelText(/Salario máximo/),
    notes: screen.getByLabelText(/Notas/),
    submit: screen.getByRole("button", { name: "Guardar candidatura" }),
  };
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function failedState(
  overrides: Partial<ApplicationFormState>,
): ApplicationFormState {
  return { fieldErrors: {}, formError: null, values: {}, ...overrides };
}

describe("ApplicationForm", () => {
  beforeEach(() => {
    action.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("al crear precarga la fecha de hoy y los valores por defecto", () => {
    const { appliedAt, status, portal, company } = setup();

    expect(appliedAt).toHaveValue("2026-11-25");
    expect(status).toHaveValue("enviada");
    expect(portal).toHaveValue("otro");
    expect(company).toHaveValue("");
    expect(
      within(status).getByRole("option", { name: "Rechazada por mí" }),
    ).toBeInTheDocument();
    expect(
      within(portal).getByRole("option", { name: "Web de la empresa" }),
    ).toBeInTheDocument();
  });

  it("al editar muestra los valores de la candidatura", () => {
    const { company, position, status, salaryMin, notes } = setup({
      company: "Acme",
      position: "Frontend",
      status: "entrevista",
      portal: "linkedin",
      applied_at: "2026-11-01",
      salary_min: "30000",
      notes: "Segunda ronda",
    });

    expect(company).toHaveValue("Acme");
    expect(position).toHaveValue("Frontend");
    expect(status).toHaveValue("entrevista");
    expect(salaryMin).toHaveValue("30000");
    expect(notes).toHaveValue("Segunda ronda");
  });

  it("enviado vacío marca los obligatorios, enfoca el primero y no llama a la acción", async () => {
    const { user, company, position, submit } = setup();

    await user.click(submit);

    expect(action).not.toHaveBeenCalled();
    expect(company).toHaveAttribute("aria-invalid", "true");
    expect(company).toHaveAccessibleDescription(
      APPLICATION_MESSAGES.companyRequired,
    );
    expect(position).toHaveAccessibleDescription(
      APPLICATION_MESSAGES.positionRequired,
    );
    expect(company).toHaveFocus();
    expect(screen.getByRole("alert")).toHaveTextContent(
      APPLICATION_MESSAGES.invalidForm,
    );
  });

  it("con salarios inválidos muestra el error junto al campo y conserva lo escrito", async () => {
    const { user, company, position, salaryMin, salaryMax, submit } = setup();

    await user.type(company, "Acme");
    await user.type(position, "Frontend");
    await user.type(salaryMin, "50000");
    await user.type(salaryMax, "40000");
    await user.click(submit);

    expect(action).not.toHaveBeenCalled();
    expect(salaryMax).toHaveAttribute("aria-invalid", "true");
    expect(salaryMax).toHaveAccessibleDescription(
      expect.stringContaining(APPLICATION_MESSAGES.salaryOrder),
    );
    expect(salaryMin).not.toHaveAttribute("aria-invalid");
    expect(salaryMin).toHaveValue("50000");
    expect(salaryMax).toHaveValue("40000");
    expect(company).toHaveValue("Acme");
    expect(salaryMax).toHaveFocus();
  });

  it("con datos válidos llama a la acción con los campos del formulario", async () => {
    action.mockResolvedValue(failedState({}));
    const { user, company, position, status, portal, offerUrl, submit } =
      setup();

    await user.type(company, "Acme");
    await user.type(position, "Frontend");
    await user.selectOptions(status, "En proceso");
    await user.selectOptions(portal, "LinkedIn");
    await user.type(offerUrl, "https://acme.example/oferta");
    await user.click(submit);

    expect(action).toHaveBeenCalledTimes(1);
    const formData = action.mock.calls[0]![1];
    expect(Object.fromEntries(formData)).toEqual({
      company: "Acme",
      position: "Frontend",
      status: "en_proceso",
      portal: "linkedin",
      applied_at: "2026-11-25",
      offer_url: "https://acme.example/oferta",
      salary_min: "",
      salary_max: "",
      notes: "",
    });
    expect(formData.has("user_id")).toBe(false);
  });

  it("muestra el error de la base de datos en el salario máximo y conserva los valores", async () => {
    const values = {
      company: "Acme",
      position: "Frontend",
      status: "enviada",
      portal: "otro",
      applied_at: "2026-11-25",
      salary_min: "30000",
      salary_max: "40000",
    };
    action.mockResolvedValue(
      failedState({
        fieldErrors: { salary_max: APPLICATION_MESSAGES.salaryOrder },
        formError: APPLICATION_MESSAGES.invalidForm,
        values,
      }),
    );
    const { user, company, position, salaryMin, salaryMax, submit } = setup();

    await user.type(company, "Acme");
    await user.type(position, "Frontend");
    await user.type(salaryMin, "30000");
    await user.type(salaryMax, "40000");
    await user.click(submit);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      APPLICATION_MESSAGES.invalidForm,
    );
    expect(salaryMax).toHaveAttribute("aria-invalid", "true");
    expect(salaryMax).toHaveAccessibleDescription(
      expect.stringContaining(APPLICATION_MESSAGES.salaryOrder),
    );
    expect(company).toHaveValue("Acme");
    expect(salaryMin).toHaveValue("30000");
    expect(salaryMax).toHaveValue("40000");
  });

  it("muestra el error global del servidor con role alert", async () => {
    action.mockResolvedValue(
      failedState({
        formError: "No se ha encontrado la candidatura",
        values: { company: "Acme", position: "Frontend" },
      }),
    );
    const { user, company, position, submit } = setup();

    await user.type(company, "Acme");
    await user.type(position, "Frontend");
    await user.click(submit);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se ha encontrado la candidatura",
    );
    expect(company).toHaveValue("Acme");
  });

  it("deshabilita el botón mientras envía", async () => {
    const pending = deferred<ApplicationFormState>();
    action.mockReturnValue(pending.promise);
    const { user, company, position, submit } = setup();

    await user.type(company, "Acme");
    await user.type(position, "Frontend");
    await user.click(submit);

    const button = await screen.findByRole("button", { name: "Guardando…" });
    expect(button).toBeDisabled();

    pending.resolve(failedState({ values: { company: "Acme" } }));
    expect(
      await screen.findByRole("button", { name: "Guardar candidatura" }),
    ).toBeEnabled();
  });

  it("tiene un enlace para cancelar que vuelve a la lista", () => {
    setup();

    expect(screen.getByRole("link", { name: "Cancelar" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });

  it("al crear valida en el navegador con el esquema de creación", async () => {
    const createParse = vi.spyOn(applicationCreateSchema, "safeParse");
    const updateParse = vi.spyOn(applicationUpdateSchema, "safeParse");
    const { user, submit } = setup();

    await user.click(submit);

    expect(createParse).toHaveBeenCalledTimes(1);
    expect(updateParse).not.toHaveBeenCalled();
  });

  it("al editar valida en el navegador con el esquema de edición", async () => {
    const createParse = vi.spyOn(applicationCreateSchema, "safeParse");
    const updateParse = vi.spyOn(applicationUpdateSchema, "safeParse");
    action.mockResolvedValue(failedState({}));
    const { user, company, submit } = setup(
      {
        company: "Acme",
        position: "Frontend",
        status: "entrevista",
        portal: "linkedin",
        applied_at: "2026-11-01",
      },
      "update",
    );

    await user.clear(company);
    await user.click(submit);

    expect(updateParse).toHaveBeenCalledTimes(1);
    expect(createParse).not.toHaveBeenCalled();
    expect(action).not.toHaveBeenCalled();
    expect(company).toHaveAccessibleDescription(
      APPLICATION_MESSAGES.companyRequired,
    );

    await user.type(company, "Globex");
    await user.click(submit);

    expect(updateParse).toHaveBeenCalledTimes(2);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("dos formularios montados a la vez no repiten ids", () => {
    const values = newApplicationValues("2026-11-25");
    render(
      <>
        {(["create", "update"] as const).map((mode) => (
          <ApplicationForm
            key={mode}
            mode={mode}
            action={action}
            initialValues={values}
            submitLabel="Guardar"
            pendingLabel="Guardando…"
          />
        ))}
      </>,
    );

    const statuses = screen.getAllByLabelText("Estado");
    expect(statuses).toHaveLength(2);
    const ids = new Set(
      [...document.querySelectorAll("[id]")].map((element) => element.id),
    );
    expect(ids.size).toBe(document.querySelectorAll("[id]").length);
    expect(statuses[0]?.id).not.toBe(statuses[1]?.id);
  });
});
