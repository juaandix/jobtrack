import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// `server-only` throws outside a React Server Components bundle, which is
// what it is for. Unit tests import server modules directly, so it is
// replaced by an empty module here (the build still enforces it).
vi.mock("server-only", () => ({}));
