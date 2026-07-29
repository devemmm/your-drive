import { z } from "zod";

export const registerSchema = z
  .object({
    firstName: z
      .string()
      .min(1, { message: "First name is required" })
      .max(50, { message: "First name must be less than 50 characters" }),
    lastName: z
      .string()
      .min(1, { message: "Last name is required" })
      .max(50, { message: "Last name must be less than 50 characters" }),
    email: z
      .string()
      .min(1, { message: "Email is required" })
      .email({ message: "Please enter a valid email address" }),
    password: z
      .string()
      .min(4, { message: "Password must be at least 4 characters" })
      .regex(/[A-Z]/, {
        message: "Password must contain at least one uppercase letter",
      })
      .regex(/[a-z]/, {
        message: "Password must contain at least one lowercase letter",
      })
      .regex(/[0-9]/, { message: "Password must contain at least one number" })
      .regex(/[\W_]/, {
        message: "Password must contain at least one special character",
      }),
    confirmPassword: z
      .string()
      .min(1, { message: "Please confirm your password" }),
    agreeTerms: z.literal(true, {
      errorMap: () => ({ message: "You must accept the terms and conditions" }),
    }),
    agreeMarketing: z.boolean().default(false),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

export const loginSchema = (t: (key: string) => string) =>
  z.object({
    email: z
      .string()
      .min(1, { message: t("common_.login.email") })
      .email({ message: t("common_.login.valid") }),
    password: z.string().min(4, { message: t("common_.login.password") }),
    rememberMe: z.boolean().default(false),
  });

export type LoginFormData = z.infer<ReturnType<typeof loginSchema>>;

export const validationSchema = (t: (key: string) => string) =>
  z
    .object({
      method: z.enum(["email", "phone"]),
      email: z
        .string()
        .email({ message: t("common_.validation.invalidEmail") }) // "Veuillez saisir une adresse e-mail valide"
        .nonempty({ message: t("common_.validation.requiredEmail") }) // "L'e-mail est requis"
        .optional(),
      phone: z
        .string()
        .optional(),
    })
    .refine(
      (data) =>
        (data.method === "email" && data.email) ||
        (data.method === "phone" && data.phone),
      {
        message: t("common_.validation.contactMethod"), // "Veuillez saisir une méthode de contact valide"
        path: ["email"], // adjust as needed
      }
    );

export type ValidationFormData = z.infer<ReturnType<typeof validationSchema>>;

export const resetSchema = (t: any) => {
  return z
    .object({
      token: z.string().optional(), // for email flow - token from URL or manual input
      code: z.string().optional(), // for phone flow
      password: z.string().min(4, { message: t("common_.password.min") }),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("common_.password.mismatch"),
      path: ["confirmPassword"],
    })
    .refine(
      (data) => {
        // For phone flow: require code
        if (data.code !== undefined) {
          return data.code.length > 0;
        }
        return true; // We'll handle validation in the component
      },
      {
        message: t("common_.reset.codeRequired"),
        path: ["code"],
      }
    );
};

export type ResetFormData = z.infer<ReturnType<typeof resetSchema>>;
