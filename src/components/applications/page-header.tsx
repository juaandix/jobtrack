import Link from "next/link";
import {
  PAGE_TITLE_CLASS,
  PRIMARY_BUTTON_CLASS,
} from "@/components/ui/classes";
import { NEW_APPLICATION_PATH } from "@/lib/applications/routes";

/**
 * Title of the list, board and metrics pages with the "Nueva candidatura"
 * link. The `<h1>` takes `tabIndex={-1}` so the focus can be moved to it
 * after an action that removes the focused control (e.g. deleting).
 */
export function PageHeader({ title }: { title: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 tabIndex={-1} className={PAGE_TITLE_CLASS}>
        {title}
      </h1>
      <Link href={NEW_APPLICATION_PATH} className={PRIMARY_BUTTON_CLASS}>
        Nueva candidatura
      </Link>
    </div>
  );
}
