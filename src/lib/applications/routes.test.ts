import { describe, expect, it } from "vitest";
import {
  APPLICATIONS_PATH,
  BOARD_PATH,
  NEW_APPLICATION_PATH,
  editApplicationPath,
} from "./routes";
import { isPrivatePath } from "@/lib/auth/routes";

describe("rutas de candidaturas", () => {
  it("cuelgan del dashboard, así que el proxy las protege", () => {
    expect(APPLICATIONS_PATH).toBe("/dashboard");
    expect(NEW_APPLICATION_PATH).toBe("/dashboard/candidaturas/nueva");
    expect(BOARD_PATH).toBe("/dashboard/tablero");
    expect(isPrivatePath(NEW_APPLICATION_PATH)).toBe(true);
    expect(isPrivatePath(BOARD_PATH)).toBe(true);
    expect(isPrivatePath(editApplicationPath("abc"))).toBe(true);
  });

  it("construye la ruta de edición codificando el id", () => {
    expect(editApplicationPath("3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b")).toBe(
      "/dashboard/candidaturas/3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b/editar",
    );
    expect(editApplicationPath("a/b?c")).toBe(
      "/dashboard/candidaturas/a%2Fb%3Fc/editar",
    );
  });
});
