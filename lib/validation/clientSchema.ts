import { z } from "zod";
import { isValidCNPJ, isValidCPF, onlyDigits } from "@/lib/validation/cpfCnpj";

export const clientFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Informe o nome do cliente (mínimo 2 caracteres)."),
    email: z
      .string()
      .trim()
      .min(1, "Informe o e-mail do cliente.")
      .email("Informe um e-mail válido."),
    phone: z.string().trim().min(1, "Informe o telefone do cliente."),
    document: z.string().trim().min(1, "Informe o CPF ou CNPJ."),
    document_type: z.enum(["cpf", "cnpj"], {
      message: "Selecione CPF ou CNPJ.",
    }),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip_code: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const digits = onlyDigits(data.document);
    if (data.document_type === "cpf") {
      if (!isValidCPF(digits)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["document"],
          message: "CPF inválido.",
        });
      }
    } else if (!isValidCNPJ(digits)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["document"],
        message: "CNPJ inválido.",
      });
    }
  });

export type ClientFormValues = z.infer<typeof clientFormSchema>;

export function parseClientForm(input: unknown):
  | { success: true; data: ClientFormValues }
  | { success: false; fieldErrors: Partial<Record<keyof ClientFormValues, string>>; formError?: string } {
  const result = clientFormSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const fieldErrors: Partial<Record<keyof ClientFormValues, string>> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fieldErrors[key as keyof ClientFormValues]) {
      fieldErrors[key as keyof ClientFormValues] = issue.message;
    }
  }

  return {
    success: false,
    fieldErrors,
    formError: result.error.issues[0]?.message,
  };
}

export function clientFormToPayload(values: ClientFormValues) {
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    document: onlyDigits(values.document),
    document_type: values.document_type.toUpperCase() as "CPF" | "CNPJ",
    address: values.address?.trim() || undefined,
    city: values.city?.trim() || undefined,
    state: values.state?.trim().toUpperCase() || undefined,
    zip_code: values.zip_code?.trim() || undefined,
  };
}

export function clientToFormValues(client: {
  name?: string;
  email?: string;
  phone?: string;
  document?: string;
  document_type?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}): ClientFormValues {
  const docType = (client.document_type ?? "CPF").toLowerCase();
  return {
    name: client.name ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    document: client.document ?? "",
    document_type: docType === "cnpj" ? "cnpj" : "cpf",
    address: client.address ?? "",
    city: client.city ?? "",
    state: client.state ?? "",
    zip_code: client.zip_code ?? "",
  };
}
