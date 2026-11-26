import { describe, expect, it } from "vitest";
import {
  applicationFormErrors,
  applicationFormValues,
  initialApplicationFormState,
  newApplicationValues,
  readApplicationForm,
} from "./form-state";
import type { Application } from "./repository";
import { APPLICATION_MESSAGES } from "@/lib/validation/application";

const ROW: Application = {
  id: "3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b",
  user_id: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
  company: "Acme",
  position: "Frontend",
  offer_url: "https://acme.example/oferta",
  portal: "linkedin",
  applied_at: "2026-11-25",
  salary_min: 30000,
  salary_max: 0,
  status: "entrevista",
  notes: "Segunda ronda",
  created_at: "2026-11-25T10:00:00Z",
  updated_at: "2026-11-25T10:00:00Z",
};

describe("newApplicationValues", () => {
  it("precarga hoy y los valores por defecto de la tabla", () => {
    expect(newApplicationValues("2026-11-25")).toEqual({
      applied_at: "2026-11-25",
      portal: "otro",
      status: "enviada",
    });
  });
});

describe("applicationFormValues", () => {
  it("convierte la fila en texto de formulario sin user_id ni id", () => {
    const values = applicationFormValues(ROW);
    expect(values).toEqual({
      company: "Acme",
      position: "Frontend",
      offer_url: "https://acme.example/oferta",
      portal: "linkedin",
      applied_at: "2026-11-25",
      salary_min: "30000",
      salary_max: "0",
      status: "entrevista",
      notes: "Segunda ronda",
    });
    expect(values).not.toHaveProperty("user_id");
    expect(values).not.toHaveProperty("id");
  });

  it("deja vacíos los campos opcionales nulos", () => {
    const values = applicationFormValues({
      ...ROW,
      offer_url: null,
      salary_min: null,
      salary_max: null,
      notes: null,
    });
    expect(values.offer_url).toBe("");
    expect(values.salary_min).toBe("");
    expect(values.salary_max).toBe("");
    expect(values.notes).toBe("");
  });
});

describe("initialApplicationFormState", () => {
  it("empieza sin errores y con los valores dados", () => {
    expect(initialApplicationFormState({ company: "Acme" })).toEqual({
      fieldErrors: {},
      formError: null,
      values: { company: "Acme" },
    });
  });
});

describe("readApplicationForm", () => {
  it("lee solo los campos de la candidatura e ignora user_id e id", () => {
    const formData = new FormData();
    formData.append("company", "Acme");
    formData.append("salary_min", "");
    formData.append("user_id", "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d");
    formData.append("id", "otro-id");
    formData.append("notes", new Blob(["x"]));

    expect(readApplicationForm(formData)).toEqual({
      company: "Acme",
      salary_min: "",
    });
  });

  it("devuelve un objeto vacío sin campos", () => {
    expect(readApplicationForm(new FormData())).toEqual({});
  });
});

describe("applicationFormErrors", () => {
  const valid = {
    company: "Acme",
    position: "Frontend",
    status: "enviada",
    portal: "linkedin",
    applied_at: "2026-11-25",
    salary_min: "",
    salary_max: "",
  };

  it("con datos válidos devuelve null en los dos modos", () => {
    expect(applicationFormErrors("create", valid)).toBeNull();
    expect(applicationFormErrors("update", valid)).toBeNull();
  });

  it("al crear exige los campos obligatorios", () => {
    expect(applicationFormErrors("create", {})).toEqual({
      company: APPLICATION_MESSAGES.companyRequired,
      position: APPLICATION_MESSAGES.positionRequired,
      applied_at: APPLICATION_MESSAGES.appliedAtRequired,
    });
  });

  it("al editar usa el esquema de edición: los campos ausentes no se exigen", () => {
    // Nothing to change is an error of the whole form, not of a field.
    expect(applicationFormErrors("update", {})).toEqual({});
    expect(applicationFormErrors("update", { notes: "Llamar" })).toBeNull();
  });

  it("al editar valida igual que al crear los campos presentes", () => {
    expect(
      applicationFormErrors("update", {
        ...valid,
        company: "  ",
        salary_min: "50000",
        salary_max: "40000",
      }),
    ).toEqual({
      company: APPLICATION_MESSAGES.companyRequired,
      salary_max: APPLICATION_MESSAGES.salaryOrder,
    });
  });
});
