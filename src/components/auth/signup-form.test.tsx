import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { signup } from "@/lib/auth/actions";
import { AUTH_ERROR_MESSAGES } from "@/lib/auth/errors";
import {
  AUTH_NOTICES,
  INITIAL_SIGNUP_STATE,
  type SignupFormState,
} from "@/lib/auth/form-state";
import { AUTH_MESSAGES } from "@/lib/validation/auth";
import { SignupForm } from "./signup-form";

vi.mock("@/lib/auth/actions", () => ({
  login: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn(),
}));

const signupMock = vi.mocked(signup);
const PASSWORD = "clave-de-prueba-1";

function setup(next = "/dashboard") {
  const user = userEvent.setup();
  render(<SignupForm next={next} />);
  return {
    user,
    email: screen.getByLabelText("Email"),
    password: screen.getByLabelText("Contraseña"),
    confirmPassword: screen.getByLabelText("Repite la contraseña"),
    submit: screen.getByRole("button", { name: "Crear cuenta" }),
  };
}

describe("SignupForm", () => {
  beforeEach(() => {
    signupMock.mockReset();
    signupMock.mockResolvedValue(INITIAL_SIGNUP_STATE);
  });

  it("usa new-password en las contraseñas y describe la política", () => {
    const { email, password, confirmPassword } = setup();

    expect(email).toHaveAttribute("type", "email");
    expect(email).toHaveAttribute("autocomplete", "email");
    expect(password).toHaveAttribute("type", "password");
    expect(password).toHaveAttribute("autocomplete", "new-password");
    expect(confirmPassword).toHaveAttribute("autocomplete", "new-password");
    expect(password).toHaveAccessibleDescription(
      "Al menos 8 caracteres, con una letra y un número.",
    );
  });

  it("enviado vacío marca los tres campos y no llama a la acción", async () => {
    const { user, email, password, confirmPassword, submit } = setup();

    await user.click(submit);

    expect(signupMock).not.toHaveBeenCalled();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription(AUTH_MESSAGES.emailRequired);
    expect(password).toHaveAttribute("aria-invalid", "true");
    expect(password).toHaveAccessibleDescription(
      expect.stringContaining(AUTH_MESSAGES.passwordRequired),
    );
    expect(confirmPassword).toHaveAttribute("aria-invalid", "true");
    expect(confirmPassword).toHaveAccessibleDescription(
      AUTH_MESSAGES.confirmPasswordRequired,
    );
    expect(email).toHaveFocus();
  });

  it("con contraseña débil y sin coincidir conserva lo escrito y no llama a la acción", async () => {
    const { user, email, password, confirmPassword, submit } = setup();

    await user.type(email, "nueva@example.com");
    await user.type(password, "corta");
    await user.type(confirmPassword, "otra");
    await user.click(submit);

    expect(signupMock).not.toHaveBeenCalled();
    expect(email).not.toHaveAttribute("aria-invalid");
    expect(password).toHaveAccessibleDescription(
      expect.stringContaining(AUTH_MESSAGES.passwordTooShort),
    );
    expect(confirmPassword).toHaveAccessibleDescription(
      AUTH_MESSAGES.passwordsDoNotMatch,
    );
    expect(email).toHaveValue("nueva@example.com");
    expect(password).toHaveValue("corta");
    expect(confirmPassword).toHaveValue("otra");
    expect(password).toHaveFocus();
  });

  it("con datos válidos llama a la acción y limpia los errores previos", async () => {
    const { user, email, password, confirmPassword, submit } =
      setup("/dashboard/x");

    await user.click(submit);
    expect(email).toHaveAttribute("aria-invalid", "true");

    await user.type(email, "nueva@example.com");
    await user.type(password, PASSWORD);
    await user.type(confirmPassword, PASSWORD);
    await user.click(submit);

    expect(signupMock).toHaveBeenCalledTimes(1);
    const formData = signupMock.mock.calls[0]![1];
    expect(formData.get("email")).toBe("nueva@example.com");
    expect(formData.get("confirmPassword")).toBe(PASSWORD);
    expect(formData.get("next")).toBe("/dashboard/x");
    expect(email).not.toHaveAttribute("aria-invalid");
  });

  it("muestra el error global con role alert y conserva el email", async () => {
    const result: SignupFormState = {
      ...INITIAL_SIGNUP_STATE,
      formError: AUTH_ERROR_MESSAGES.emailTaken,
      values: { email: "nueva@example.com" },
    };
    signupMock.mockResolvedValue(result);
    const { user, email, password, confirmPassword, submit } = setup();

    await user.type(email, "nueva@example.com");
    await user.type(password, PASSWORD);
    await user.type(confirmPassword, PASSWORD);
    await user.click(submit);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      AUTH_ERROR_MESSAGES.emailTaken,
    );
    expect(email).toHaveValue("nueva@example.com");
  });

  it("muestra el aviso de confirmación con role status", async () => {
    signupMock.mockResolvedValue({
      ...INITIAL_SIGNUP_STATE,
      notice: AUTH_NOTICES.confirmEmail,
      values: { email: "nueva@example.com" },
    });
    const { user, email, password, confirmPassword, submit } = setup();

    await user.type(email, "nueva@example.com");
    await user.type(password, PASSWORD);
    await user.type(confirmPassword, PASSWORD);
    await user.click(submit);

    expect(await screen.findByRole("status")).toHaveTextContent(
      AUTH_NOTICES.confirmEmail,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("deshabilita el botón mientras crea la cuenta", async () => {
    let finish: (state: SignupFormState) => void = () => {};
    signupMock.mockReturnValue(
      new Promise<SignupFormState>((resolve) => {
        finish = resolve;
      }),
    );
    const { user, email, password, confirmPassword, submit } = setup();

    await user.type(email, "nueva@example.com");
    await user.type(password, PASSWORD);
    await user.type(confirmPassword, PASSWORD);
    await user.click(submit);

    expect(
      await screen.findByRole("button", { name: "Creando cuenta…" }),
    ).toBeDisabled();
    finish(INITIAL_SIGNUP_STATE);
    expect(
      await screen.findByRole("button", { name: "Crear cuenta" }),
    ).toBeEnabled();
  });

  it("enlaza al login conservando el next", () => {
    setup("/dashboard/x");

    expect(screen.getByRole("link", { name: "Inicia sesión" })).toHaveAttribute(
      "href",
      "/login?next=%2Fdashboard%2Fx",
    );
  });

  it("sin next propio enlaza al login sin parámetros", () => {
    setup();

    expect(screen.getByRole("link", { name: "Inicia sesión" })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});
