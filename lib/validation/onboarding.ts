import { z } from "zod";

export const onboardingSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(120),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    dateOfBirth: z.string().trim().optional().or(z.literal("")),
    city: z.string().trim().min(1, "City is required").max(80),
    country: z.string().trim().min(1).max(80),
    stage: z.enum(["school", "undergraduate", "postgraduate", "professional"]),
    currentEducation: z.string().trim().min(2, "Tell us your current qualification").max(200),
    institution: z.string().trim().max(200).optional().or(z.literal("")),
    percentage: z.number().min(0).max(100).nullable().optional(),
    subjects: z.array(z.string().trim().min(1).max(80)).max(20),
    backlogs: z.number().int().min(0).max(50),
    englishTestType: z.enum(["IELTS", "TOEFL", "PTE", "Duolingo", "None"]),
    englishTestScore: z.number().min(0).max(200).nullable().optional(),
    workExperienceMonths: z.number().int().min(0).max(720),
    targetIntake: z.string().trim().min(1).max(60),
    budgetMinINR: z.number().int().min(0).max(100_000_000),
    budgetMaxINR: z.number().int().min(0).max(100_000_000),
    preferredCountries: z.array(z.string().trim().min(1).max(80)).max(15),
    preferredModes: z.array(z.enum(["on_campus", "online", "hybrid"])).min(1),
    interestAreas: z.array(z.string().trim().min(1).max(80)).max(20),
    careerGoal: z.string().trim().min(10, "Give us at least a sentence").max(2000),
    intendedClusterId: z.string().trim().max(80).optional().or(z.literal("")),
    consentDataProcessing: z.literal(true),
    consentDisclaimer: z.literal(true),
    guardianConsent: z.boolean(),
  })
  .refine((data) => data.budgetMaxINR >= data.budgetMinINR, {
    message: "Maximum budget must be at least the minimum",
    path: ["budgetMaxINR"],
  });

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const onboardingDefaults = {
  fullName: "",
  phone: "",
  dateOfBirth: "",
  city: "",
  country: "India",
  stage: "undergraduate" as const,
  currentEducation: "",
  institution: "",
  percentage: null as number | null,
  subjects: [] as string[],
  backlogs: 0,
  englishTestType: "None" as const,
  englishTestScore: null as number | null,
  workExperienceMonths: 0,
  targetIntake: "August 2027",
  budgetMinINR: 200000,
  budgetMaxINR: 1000000,
  preferredCountries: ["India"],
  preferredModes: ["on_campus"] as ("on_campus" | "online" | "hybrid")[],
  interestAreas: [] as string[],
  careerGoal: "",
  intendedClusterId: "",
  consentDataProcessing: false,
  consentDisclaimer: false,
  guardianConsent: false,
};
