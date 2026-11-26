import { applicationName } from "./kanban-a11y";
import type { Application } from "./repository";

/** Announced after deleting an application: "Candidatura borrada: …". */
export function applicationDeletedMessage(
  application: Pick<Application, "company" | "position">,
): string {
  return `Candidatura borrada: ${applicationName(application)}.`;
}
