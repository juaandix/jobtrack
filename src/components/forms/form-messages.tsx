import {
  ERROR_MESSAGE_CLASS,
  NOTICE_MESSAGE_CLASS,
} from "@/components/ui/classes";

type FormMessagesProps = {
  error: string | null;
  notice?: string | null;
};

/** Form-level error (`role="alert"`) and informative notice (`role="status"`). */
export function FormMessages({ error, notice = null }: FormMessagesProps) {
  return (
    <>
      {error ? (
        <p role="alert" className={ERROR_MESSAGE_CLASS}>
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className={NOTICE_MESSAGE_CLASS}>
          {notice}
        </p>
      ) : null}
    </>
  );
}
