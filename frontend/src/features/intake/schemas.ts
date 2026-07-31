import { z } from "zod";
import { getCountryOptions } from "@/lib/countries";

const validCountryCodes = new Set(getCountryOptions().map((c) => c.code));

const emptyToUndefined = (value: unknown) => {
  if (value == null || value === "") return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  return value;
};

const optionalTrimmed = (max: number, label = "Value") =>
  z.preprocess(
    emptyToUndefined,
    z.string().max(max, `${label} is too long`).optional(),
  );

const countryCode = z
  .string({ message: "Country is required" })
  .trim()
  .min(2, "Country is required")
  .refine((v) => validCountryCodes.has(v), {
    message: "Select a valid country",
  });

const optionalEmail = z.preprocess(
  emptyToUndefined,
  z.union([
    z.undefined(),
    z
      .email({ message: "Enter a valid email address" })
      .max(200, "Email is too long"),
  ]),
);

/** Digits with optional +, spaces, dashes, parentheses - at least 6 digits. */
const optionalPhone = z.preprocess(
  emptyToUndefined,
  z.union([
    z.undefined(),
    z
      .string()
      .max(50, "Phone number is too long")
      .refine((v) => /^[\d\s+\-().]+$/.test(v), {
        message:
          "Phone may only contain digits, +, spaces, dashes, or parentheses",
      })
      .refine(
        (v) => {
          const digits = v.replace(/\D/g, "");
          return digits.length >= 6 && digits.length <= 15;
        },
        {
          message: "Enter a valid phone number (6–15 digits)",
        },
      ),
  ]),
);

export const counterpartySchema = z
  .object({
    name: optionalTrimmed(200, "Name"),
    company: optionalTrimmed(200, "Company"),
    relationship: z.enum(
      ["competitor", "adverse_party", "licensor", "licensee"],
      {
        message: "Select a relationship",
      },
    ),
    notes: optionalTrimmed(1000, "Notes"),
  })
  .refine((v) => Boolean(v.name || v.company), {
    message: "Provide at least a name or company",
    path: ["name"],
  });

export type CounterpartyFormValues = z.infer<typeof counterpartySchema>;

export const intakePartySchema = z
  .object({
    existingClientId: z.preprocess(
      emptyToUndefined,
      z.union([z.undefined(), z.uuid()]),
    ),
    type: z.enum(["company", "individual"]).optional(),
    companyName: optionalTrimmed(200, "Company name"),
    fullName: optionalTrimmed(200, "Full name"),
    country: z.preprocess(
      emptyToUndefined,
      z.union([
        z.undefined(),
        z
          .string()
          .length(2)
          .refine((v) => validCountryCodes.has(v), {
            message: "Select a valid country",
          }),
      ]),
    ),
  })
  .superRefine((v, ctx) => {
    if (v.existingClientId) return;
    if (!v.companyName && !v.fullName) return;
    if (!v.type) {
      ctx.addIssue({
        code: "custom",
        message: "Select company or individual",
        path: ["type"],
      });
    }
    if (v.type === "company" && !v.companyName) {
      ctx.addIssue({
        code: "custom",
        message: "Company name is required",
        path: ["companyName"],
      });
    }
    if (v.type === "individual" && !v.fullName) {
      ctx.addIssue({
        code: "custom",
        message: "Full name is required",
        path: ["fullName"],
      });
    }
  })
  .optional();

export type IntakePartyFormValues = {
  existingClientId?: string
  type?: 'company' | 'individual'
  companyName?: string
  fullName?: string
  country?: string
}

const enquirerBase = {
  country: countryCode,
  email: optionalEmail,
  phone: optionalPhone,
  matterType: z.enum(
    [
      "trademark",
      "patent",
      "utility_model",
      "design",
      "cases",
      "domain",
      "litigation_expert_report",
      "consultation",
      "official_fee_payment",
      "other",
    ],
    {
      message: "Select a work type",
    },
  ),
  description: z
    .string({ message: "Description is required" })
    .trim()
    .min(1, "Description is required")
    .max(2000, "Description is too long"),
  urgency: z.enum(["normal", "urgent"]).default("normal"),
  referralSource: z.enum(
    ["email", "phone", "referral", "walk_in", "website", "other"],
    {
      message: "Select a referral source",
    },
  ),
  referredBy: optionalTrimmed(200, "Referred by"),
  assignedUserId: z.preprocess(
    emptyToUndefined,
    z.union([z.undefined(), z.uuid("Invalid assignee")]),
  ),
  notes: optionalTrimmed(2000, "Notes"),
  registeredLegalAddress: z
    .object({
      addressLine1: z.string().optional(),
      addressLine2: z.string().optional(),
      city: z.string().optional(),
      region: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
      phone: z.string().optional(),
      fax: z.string().optional(),
    })
    .optional(),
  correspondenceAddress: z
    .object({
      addressLine1: z.string().optional(),
      addressLine2: z.string().optional(),
      city: z.string().optional(),
      region: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
      phone: z.string().optional(),
      fax: z.string().optional(),
    })
    .optional(),
  counterparties: z.array(counterpartySchema).optional(),
  applicant: intakePartySchema,
  intermediary: intakePartySchema,
};

const contactRequired = {
  message: "Provide at least an email or phone number",
  path: ["email"],
};

export const createIntakeSchema = z
  .discriminatedUnion("enquirerType", [
    z.object({
      enquirerType: z.literal("company"),
      companyName: z
        .string({ message: "Company name is required" })
        .trim()
        .min(1, "Company name is required")
        .max(200, "Company name is too long"),
      fullName: optionalTrimmed(200, "Contact name"),
      ...enquirerBase,
    }),
    z.object({
      enquirerType: z.literal("individual"),
      fullName: z
        .string({ message: "Full name is required" })
        .trim()
        .min(1, "Full name is required")
        .max(200, "Full name is too long"),
      companyName: optionalTrimmed(200, "Company name"),
      ...enquirerBase,
    }),
  ])
  .refine((data) => Boolean(data.email || data.phone), contactRequired);

export type CreateIntakeFormValues = z.infer<typeof createIntakeSchema>;

export const convertIntakeSchema = z.object({
  gdprConsent: z.boolean().refine((v) => v === true, {
    message: "GDPR consent must be confirmed before creating a client",
  }),
  holdingGroupId: z.preprocess(
    emptyToUndefined,
    z.union([z.undefined(), z.uuid("Select a valid holding group")]),
  ),
  notes: optionalTrimmed(2000, "Notes"),
  registeredLegalAddress: z
    .object({
      addressLine1: z.string().optional(),
      addressLine2: z.string().optional(),
      city: z.string().optional(),
      region: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
      phone: z.string().optional(),
      fax: z.string().optional(),
    })
    .optional(),
  correspondenceAddress: z
    .object({
      addressLine1: z.string().optional(),
      addressLine2: z.string().optional(),
      city: z.string().optional(),
      region: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
      phone: z.string().optional(),
      fax: z.string().optional(),
    })
    .optional(),
});

export type ConvertIntakeFormValues = z.infer<typeof convertIntakeSchema>;

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key =
      issue.path.length > 0 ? issue.path.map(String).join(".") : "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
