import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createApplicationAction,
  deleteApplicationAction,
  updateApplicationAction,
  updateStatusAction,
} from "./actions";
import {
  APPLICATION_ERROR_MESSAGES,
  applicationDatabaseError,
  notFoundError,
} from "./errors";
import { initialApplicationFormState } from "./form-state";
import type { Application } from "./repository";
import { APPLICATION_MESSAGES } from "@/lib/validation/application";

const getSessionUser = vi.hoisted(() => vi.fn());
const repository = vi.hoisted(() => ({
  createApplication: vi.fn(),
  updateApplication: vi.fn(),
  deleteApplication: vi.fn(),
}));
const redirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
);
const revalidatePath = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ getSessionUser }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("./repository", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./repository")>()),
  ...repository,
}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/cache", () => ({ revalidatePath }));

const ID = "3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b";
const USER = { id: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d", email: null };
const INITIAL = initialApplicationFormState({});

const ROW: Application = {
  id: ID,
  user_id: USER.id,
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

const VALID_FORM = {
  company: " Acme ",
  position: "Frontend",
  offer_url: "",
  portal: "linkedin",
  applied_at: "2026-11-25",
  salary_min: "30000",
  salary_max: "",
  status: "enviada",
  notes: "",
};

function formDataOf(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [name, value] of Object.entries(entries)) {
    formData.append(name, value);
  }
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  getSessionUser.mockResolvedValue(USER);
});

describe("createApplicationAction", () => {
  it("sin sesión redirige a /login sin tocar la base de datos", async () => {
    getSessionUser.mockResolvedValue(null);

    await expect(
      createApplicationAction(INITIAL, formDataOf(VALID_FORM)),
    ).rejects.toThrow("NEXT_REDIRECT /login");
    expect(repository.createApplication).not.toHaveBeenCalled();
  });

  it("con datos inválidos devuelve errores por campo y conserva lo escrito", async () => {
    const form = { ...VALID_FORM, company: "  ", salary_min: "30.000" };

    const state = await createApplicationAction(INITIAL, formDataOf(form));

    expect(repository.createApplication).not.toHaveBeenCalled();
    expect(state.fieldErrors).toEqual({
      company: APPLICATION_MESSAGES.companyRequired,
      salary_min: APPLICATION_MESSAGES.salaryInvalid,
    });
    expect(state.formError).toBe(APPLICATION_MESSAGES.invalidForm);
    expect(state.values).toEqual(form);
  });

  it("valida el orden de salarios y lo muestra en el máximo", async () => {
    const form = { ...VALID_FORM, salary_min: "50000", salary_max: "40000" };

    const state = await createApplicationAction(INITIAL, formDataOf(form));

    expect(repository.createApplication).not.toHaveBeenCalled();
    expect(state.fieldErrors).toEqual({
      salary_max: APPLICATION_MESSAGES.salaryOrder,
    });
  });

  it("con datos válidos crea sin user_id, revalida la lista y redirige", async () => {
    repository.createApplication.mockResolvedValue({ ok: true, data: ROW });

    await expect(
      createApplicationAction(
        INITIAL,
        formDataOf({ ...VALID_FORM, user_id: "otro-usuario", id: ID }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT /dashboard");

    expect(repository.createApplication).toHaveBeenCalledTimes(1);
    const input: unknown = repository.createApplication.mock.calls[0]![0];
    expect(input).toEqual({
      company: "Acme",
      position: "Frontend",
      offer_url: null,
      portal: "linkedin",
      applied_at: "2026-11-25",
      salary_min: 30000,
      salary_max: null,
      status: "enviada",
      notes: null,
    });
    expect(input).not.toHaveProperty("user_id");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("si la base de datos rechaza el orden de salarios, el error va al máximo", async () => {
    repository.createApplication.mockResolvedValue({
      ok: false,
      error: applicationDatabaseError(
        {
          code: "23514",
          message:
            'new row for relation "applications" violates check constraint "applications_salary_order"',
        },
        "create",
      ),
    });

    const state = await createApplicationAction(
      INITIAL,
      formDataOf(VALID_FORM),
    );

    expect(state.fieldErrors).toEqual({
      salary_max: APPLICATION_MESSAGES.salaryOrder,
    });
    expect(state.formError).toBe(APPLICATION_ERROR_MESSAGES.invalidData);
    expect(state.values).toEqual(VALID_FORM);
    expect(redirect).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("con un error inesperado devuelve el mensaje global", async () => {
    repository.createApplication.mockResolvedValue({
      ok: false,
      error: applicationDatabaseError({ code: "XX000" }, "create"),
    });

    const state = await createApplicationAction(
      INITIAL,
      formDataOf(VALID_FORM),
    );

    expect(state.formError).toBe(APPLICATION_ERROR_MESSAGES.unknown.create);
    expect(state.fieldErrors).toEqual({});
  });
});

describe("updateApplicationAction", () => {
  it("sin sesión redirige a /login sin tocar la base de datos", async () => {
    getSessionUser.mockResolvedValue(null);

    await expect(
      updateApplicationAction(ID, INITIAL, formDataOf(VALID_FORM)),
    ).rejects.toThrow("NEXT_REDIRECT /login");
    expect(repository.updateApplication).not.toHaveBeenCalled();
  });

  it("con datos inválidos no actualiza y devuelve errores por campo", async () => {
    const form = { ...VALID_FORM, status: "aceptada", offer_url: "acme.es" };

    const state = await updateApplicationAction(ID, INITIAL, formDataOf(form));

    expect(repository.updateApplication).not.toHaveBeenCalled();
    expect(state.fieldErrors).toEqual({
      status: APPLICATION_MESSAGES.statusInvalid,
      offer_url: APPLICATION_MESSAGES.offerUrlInvalid,
    });
    expect(state.values).toEqual(form);
  });

  it("sin campos devuelve 'no hay cambios'", async () => {
    const state = await updateApplicationAction(ID, INITIAL, new FormData());

    expect(repository.updateApplication).not.toHaveBeenCalled();
    expect(state.formError).toBe(APPLICATION_MESSAGES.noChanges);
  });

  it("con datos válidos actualiza esa candidatura y redirige a la lista", async () => {
    repository.updateApplication.mockResolvedValue({ ok: true, data: ROW });

    await expect(
      updateApplicationAction(
        ID,
        INITIAL,
        formDataOf({ ...VALID_FORM, user_id: USER.id }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT /dashboard");

    expect(repository.updateApplication).toHaveBeenCalledWith(
      ID,
      expect.not.objectContaining({ user_id: expect.anything() }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("si no existe o es ajena devuelve 'no encontrada', nunca éxito", async () => {
    repository.updateApplication.mockResolvedValue({
      ok: false,
      error: notFoundError(),
    });

    const state = await updateApplicationAction(
      ID,
      INITIAL,
      formDataOf(VALID_FORM),
    );

    expect(state.formError).toBe(APPLICATION_ERROR_MESSAGES.notFound);
    expect(redirect).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("deleteApplicationAction", () => {
  it("sin sesión redirige a /login sin tocar la base de datos", async () => {
    getSessionUser.mockResolvedValue(null);

    await expect(
      deleteApplicationAction(null, formDataOf({ id: ID })),
    ).rejects.toThrow("NEXT_REDIRECT /login");
    expect(repository.deleteApplication).not.toHaveBeenCalled();
  });

  it.each([
    ["sin id", {}],
    ["con un id que no es un uuid", { id: "1 or 1=1" }],
  ])("%s devuelve 'no encontrada' sin consultar", async (_case, entries) => {
    const state = await deleteApplicationAction(null, formDataOf(entries));

    expect(repository.deleteApplication).not.toHaveBeenCalled();
    expect(state).toEqual({
      ok: false,
      message: APPLICATION_ERROR_MESSAGES.notFound,
    });
  });

  it("borra la candidatura y revalida la lista", async () => {
    repository.deleteApplication.mockResolvedValue({
      ok: true,
      data: { id: ID },
    });

    const state = await deleteApplicationAction(null, formDataOf({ id: ID }));

    expect(repository.deleteApplication).toHaveBeenCalledWith(ID);
    expect(state).toEqual({ ok: true, data: { id: ID } });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("si no existe o es ajena devuelve 'no encontrada' sin revalidar", async () => {
    repository.deleteApplication.mockResolvedValue({
      ok: false,
      error: notFoundError(),
    });

    const state = await deleteApplicationAction(null, formDataOf({ id: ID }));

    expect(state).toEqual({
      ok: false,
      message: APPLICATION_ERROR_MESSAGES.notFound,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("updateStatusAction", () => {
  it("sin sesión redirige a /login sin tocar la base de datos", async () => {
    getSessionUser.mockResolvedValue(null);

    await expect(updateStatusAction(ID, "entrevista")).rejects.toThrow(
      "NEXT_REDIRECT /login",
    );
    expect(repository.updateApplication).not.toHaveBeenCalled();
  });

  it("con un estado fuera del enum devuelve error de validación sin consultar", async () => {
    const result = await updateStatusAction(ID, "aceptada");

    expect(repository.updateApplication).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      error: {
        kind: "validation",
        message: APPLICATION_MESSAGES.invalidForm,
        fieldErrors: { status: APPLICATION_MESSAGES.statusInvalid },
      },
    });
  });

  it.each([
    ["vacío", ""],
    ["que no es un uuid", "1 or 1=1"],
  ])(
    "con un id %s devuelve error de validación sin consultar",
    async (_case, id) => {
      const result = await updateStatusAction(id, "entrevista");

      expect(repository.updateApplication).not.toHaveBeenCalled();
      expect(result).toEqual({
        ok: false,
        error: {
          kind: "validation",
          message: APPLICATION_MESSAGES.invalidForm,
          fieldErrors: {},
        },
      });
    },
  );

  it("actualiza solo el estado, sin user_id, y revalida la lista", async () => {
    const updated: Application = { ...ROW, status: "entrevista" };
    repository.updateApplication.mockResolvedValue({ ok: true, data: updated });

    const result = await updateStatusAction(ID, "entrevista");

    expect(repository.updateApplication).toHaveBeenCalledTimes(1);
    expect(repository.updateApplication).toHaveBeenCalledWith(ID, {
      status: "entrevista",
    });
    expect(result).toEqual({ ok: true, data: updated });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("si no existe o es ajena devuelve 'no encontrada', nunca éxito", async () => {
    repository.updateApplication.mockResolvedValue({
      ok: false,
      error: notFoundError(),
    });

    const result = await updateStatusAction(ID, "oferta");

    expect(result).toEqual({ ok: false, error: notFoundError() });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("con un error de base de datos devuelve un mensaje en español sin detalles", async () => {
    repository.updateApplication.mockResolvedValue({
      ok: false,
      error: applicationDatabaseError(
        { code: "XX000", message: 'relation "applications" is broken' },
        "update",
      ),
    });

    const result = await updateStatusAction(ID, "oferta");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toBe(
      APPLICATION_ERROR_MESSAGES.unknown.update,
    );
    expect(result.error.message).not.toContain("applications");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
