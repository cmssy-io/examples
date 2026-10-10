import { isInputError, type ActionError } from "astro:actions";

type ActionOutcome<T> =
  | { data: T; error: undefined }
  | { data: undefined; error: ActionError };

function describe(error: ActionError): string {
  if (!isInputError(error)) return error.message;
  return Object.entries(error.fields)
    .map(([field, messages]) => `${field}: ${(messages ?? []).join(", ")}`)
    .join("; ");
}

export function unwrap<T>(outcome: ActionOutcome<T>): T {
  if (outcome.error) throw new Error(describe(outcome.error));
  return outcome.data;
}
