import { describe, expect, it } from "vitest";
import { readFormFields, readStringField } from "./fields";

const FIELDS = ["email", "password"] as const;

function formDataOf(entries: Record<string, string | Blob>): FormData {
  const formData = new FormData();
  for (const [name, value] of Object.entries(entries)) {
    formData.append(name, value);
  }
  return formData;
}

describe("readStringField", () => {
  it("devuelve el texto del campo", () => {
    expect(readStringField(formDataOf({ next: "/dashboard" }), "next")).toBe(
      "/dashboard",
    );
  });

  it("devuelve una cadena vacía si el campo está vacío", () => {
    expect(readStringField(formDataOf({ next: "" }), "next")).toBe("");
  });

  it("devuelve null si el campo no existe", () => {
    expect(readStringField(new FormData(), "next")).toBeNull();
  });

  it("devuelve null si el campo es un fichero", () => {
    const formData = formDataOf({ next: new Blob(["x"]) });
    expect(readStringField(formData, "next")).toBeNull();
  });
});

describe("readFormFields", () => {
  it("lee solo los campos pedidos", () => {
    const formData = formDataOf({
      email: "ana@example.com",
      password: "secreta1",
      $ACTION_ID_123: "",
    });
    expect(readFormFields(formData, FIELDS)).toEqual({
      email: "ana@example.com",
      password: "secreta1",
    });
  });

  it("omite los campos ausentes o que son ficheros", () => {
    const formData = formDataOf({ email: "", password: new Blob(["x"]) });
    expect(readFormFields(formData, [...FIELDS, "confirmPassword"])).toEqual({
      email: "",
    });
  });

  it("devuelve un objeto vacío sin campos", () => {
    expect(readFormFields(new FormData(), FIELDS)).toEqual({});
  });
});
