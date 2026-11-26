import { describe, expect, it } from "vitest";
import { LOGIN_FIELDS, SIGNUP_FIELDS } from "./form-state";

describe("LOGIN_FIELDS y SIGNUP_FIELDS", () => {
  it("salen de los esquemas compartidos", () => {
    expect(LOGIN_FIELDS).toEqual(["email", "password"]);
    expect(SIGNUP_FIELDS).toEqual(["email", "password", "confirmPassword"]);
  });
});
