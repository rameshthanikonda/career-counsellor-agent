import type { CareerPath, Course, Learner } from "@/lib/types";

const NOW = "2026-11-01T00:00:00.000Z";

export function makeLearner(overrides: Partial<Learner> = {}): Learner {
  return {
    id: "l-test",
    userId: "u-test",
    stage: "undergraduate",
    fullName: "Test Learner",
    email: "test@example.com",
    city: "Pune",
    country: "India",
    currentEducation: "B.Com",
    percentage: 75,
    subjects: ["Accountancy", "Economics", "Mathematics", "English"],
    backlogs: 0,
    englishTest: { type: "IELTS", score: 7 },
    workExperienceMonths: 0,
    targetIntake: "August 2027",
    budgetMinINR: 200000,
    budgetMaxINR: 1000000,
    preferredCountries: ["India"],
    preferredModes: ["on_campus"],
    interestAreas: ["Finance"],
    careerGoal: "Build a career in finance and analytics.",
    consent: {
      dataProcessing: true,
      counsellingDisclaimer: true,
      version: "2026-07",
      acceptedAt: NOW,
    },
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export function makeCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: "course-test",
    slug: "test-course",
    title: "Test Programme",
    provider: "Test University",
    providerType: "university",
    level: "PG",
    discipline: "Finance",
    durationMonths: 24,
    feeMinINR: 400000,
    feeMaxINR: 600000,
    eligibility: {
      minPercentage: 60,
      requiredSubjects: [],
      englishRequirement: "IELTS 6.5",
    },
    outcomes: {
      placementBand: "moderate",
      outcomeNote: "Illustrative only.",
      lastVerified: NOW,
    },
    locations: ["Pune"],
    modes: ["on_campus"],
    countries: ["India"],
    accreditation: "UGC",
    summary: "A test programme.",
    skills: ["Analytics"],
    clusterIds: ["finance"],
    isActive: true,
    dataSource: "illustrative",
    ...overrides,
  };
}

export function makePath(overrides: Partial<CareerPath> = {}): CareerPath {
  return {
    id: "path-test",
    slug: "test-path",
    title: "Finance Analyst",
    clusterId: "finance",
    summary: "A test path.",
    entryRoles: ["Analyst"],
    progression: [
      {
        title: "Analyst",
        yearsFrom: 0,
        yearsTo: 2,
        indicativeSalaryMinINR: 400000,
        indicativeSalaryMaxINR: 800000,
        skills: ["Excel"],
      },
    ],
    demandIndex: 70,
    demandNote: "Illustrative.",
    skills: ["Excel", "Python"],
    educationRoutes: ["PG"],
    source: "illustrative",
    ...overrides,
  };
}
