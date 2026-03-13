import { ZodError } from "zod";

export type ActionSuccess<T = void> = {
  success: true;
  data?: T;
};

export type ActionError = {
  success: false;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export type ActionResponse<T = void> = ActionSuccess<T> | ActionError;

export function actionSuccess<T>(data?: T): ActionSuccess<T> {
  return { success: true, data };
}

export function actionError(
  message: string,
  fieldErrors?: Record<string, string[]>
): ActionError {
  return { success: false, message, fieldErrors };
}

export function fromZodError(error: ZodError): ActionError {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (!fieldErrors[path]) fieldErrors[path] = [];
    fieldErrors[path].push(issue.message);
  }
  return actionError("Dados inválidos. Verifique os campos e tente novamente.", fieldErrors);
}
