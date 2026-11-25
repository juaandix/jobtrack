import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { login } from "@/lib/auth/actions";
import {
  INITIAL_LOGIN_STATE,
  type LoginFormState,
} from "@/lib/auth/form-state";
import { AUTH_MESSAGES } from "@/lib/validation/auth";
import { LoginForm } from "./login-form";

vi.mock("@/lib/auth/actions", () => ({
  login: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn(),
}));

const loginMock = vi.mocked(login);
const PASSWORD = "clave-de-prueba-1";

function setup(next = "/dashboard") {
  const user = userEvent.setup();
  render(<LoginForm next={next} />);
  return {
    user,
    email: screen.getByLabelText("Email"),
    password: screen.getByLabelText("Contraseña"),
    submit: screen.getByRole("button", { name: "Iniciar sesión" }),
  };
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("LoginForm", () => {
  beforeEach(() => {
    loginMock.mockReset();
    loginMock.mockResolvedValue(INITIAL_LOGIN_STATE);
  });

  it("tiene campos etiquetados con el tipo y autocompletado adecuados", () => {
    const { email, password } = setup();

    expect(email).toHaveAttribute("type", "email");
    expect(email).toHaveAttribute("autocomplete", "email");
    expect(password).toHaveAttribute("type", "password");
    expect(password).toHaveAttribute("autocomplete", "current-password");
    expect(email).not.toHaveAttribute("aria-invalid");
  });

  it("enviado vacío muestra los errores junto a cada campo y no llama a la acción", async () => {
    const { user, email, password, submit } = setup();

    await user.click(submit);

    expect(loginMock).not.toHaveBeenCalled();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription(AUTH_MESSAGES.emailRequired);
    expect(password).toHaveAttribute("aria-invalid", "true");
    expect(password).toHaveAccessibleDescription(
      AUTH_MESSAGES.passwordRequired,
    );
    expect(email).toHaveFocus();
  });

  it("con un email inválido conserva lo escrito y no llama a la acción", async () => {
    const { user, email, password, submit } = setup();

    await user.type(email, "ana@");
    await user.type(password, PASSWORD);
    await user.click(submit);

    expect(loginMock).not.toHaveBeenCalled();
    expect(email).toHaveAccessibleDescription(AUTH_MESSAGES.emailInvalid);
    expect(email).toHaveValue("ana@");
    expect(password).toHaveValue(PASSWORD);
    expect(password).not.toHaveAttribute("aria-invalid");
    expect(password).not.toHaveAttribute("aria-describedby");
  });

  it("con datos válidos llama a la acción con los campos y el next", async () => {
    const { user, email, password, submit } = setup("/dashboard/123");

    await user.type(email, "ana@example.com");
    await user.type(password, PASSWORD);
    await user.click(submit);

    expect(loginMock).toHaveBeenCalledTimes(1);
    const formData = loginMock.mock.calls[0]![1];
    expect(formData.get("email")).toBe("ana@example.com");
    expect(formData.get("password")).toBe(PASSWORD);
    expect(formData.get("next")).toBe("/dashboard/123");
  });

  it("muestra el error global devuelto con role alert y conserva el email", async () => {
    const result: LoginFormState = {
      ...INITIAL_LOGIN_STATE,
      formError: "Email o contraseña incorrectos",
      values: { email: "ana@example.com" },
    };
    loginMock.mockResolvedValue(result);
    const { user, email, password, submit } = setup();

    await user.type(email, "ana@example.com");
    await user.type(password, PASSWORD);
    await user.click(submit);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email o contraseña incorrectos",
    );
    expect(email).toHaveValue("ana@example.com");
  });

  it("muestra los errores por campo que devuelve el servidor", async () => {
    loginMock.mockResolvedValue({
      ...INITIAL_LOGIN_STATE,
      fieldErrors: { email: AUTH_MESSAGES.emailTooLong },
      values: { email: "ana@example.com" },
    });
    const { user, email, password, submit } = setup();

    await user.type(email, "ana@example.com");
    await user.type(password, PASSWORD);
    await user.click(submit);

    expect(
      await screen.findByText(AUTH_MESSAGES.emailTooLong),
    ).toBeInTheDocument();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription(AUTH_MESSAGES.emailTooLong);
  });

  it("deshabilita el botón mientras envía", async () => {
    const pending = deferred<LoginFormState>();
    loginMock.mockReturnValue(pending.promise);
    const { user, email, password } = setup();

    await user.type(email, "ana@example.com");
    await user.type(password, PASSWORD);
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    const button = await screen.findByRole("button", { name: "Entrando…" });
    expect(button).toBeDisabled();

    pending.resolve(INITIAL_LOGIN_STATE);
    expect(
      await screen.findByRole("button", { name: "Iniciar sesión" }),
    ).toBeEnabled();
  });

  it("enlaza al registro conservando el next", () => {
    setup("/dashboard/123");

    expect(screen.getByRole("link", { name: "Regístrate" })).toHaveAttribute(
      "href",
      "/registro?next=%2Fdashboard%2F123",
    );
  });
});
