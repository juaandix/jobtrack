import { DASHBOARD_PATH } from "@/lib/auth/routes";

export const APPLICATIONS_PATH = DASHBOARD_PATH;
export const NEW_APPLICATION_PATH = `${DASHBOARD_PATH}/candidaturas/nueva`;

/** Edit page of one application; the id is URL-encoded. */
export function editApplicationPath(id: string): string {
  return `${DASHBOARD_PATH}/candidaturas/${encodeURIComponent(id)}/editar`;
}
