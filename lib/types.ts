// ─────────────────────────────────────────────────────────────
// Northstar domain model
// Every entity is serialisable and storage-agnostic. The local
// file store and the Supabase/Postgres adapter both speak this
// vocabulary; JSON columns hold the nested structures.
// ─────────────────────────────────────────────────────────────

export type Role = "learner" | "counsellor" | "admin";

export type LearnerStage =
  | "school"
  | "undergraduate"
  | "postgraduate"
  | "professional";

export type AssessmentStatus = "not_started" | "in_progress" | "completed";

export type ReportStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "released"
  | "returned";

export type ShortlistStatus = "proposed" | "approved" | "removed";

export type MilestoneStatus = "pending" | "in_progress" | "done" | "at_risk";

export type LicenceStatus = "active" | "expired" | "pending" | "suspended";

export type Mode = "on_campus" | "online" | "hybrid";

export type Riasec = "R" | "I" | "A" | "S" | "E" | "C";

export type BigFive =
  | "openness"
  | "conscientiousness"
  | "extraversion"
  | "agreeableness"
  | "emotional_stability";

export type AptitudeDimension =
  | "numerical"
  | "verbal"
  | "logical"
  | "spatial";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  name: string;
  phone?: string;
  title?: string;
  createdAt: string;
  lastLoginAt?: string;
  /** Recorded when a learner creates their own account. */
  privacyAcceptedAt?: string;
  privacyVersion?: string;
  /** Incremented on password change to invalidate older session cookies. */
  sessionVersion?: number;
  passwordChangedAt?: string;
}

/** Public-safe user projection sent to the browser. */
export type PublicUser = Omit<User, "passwordHash">;

export interface ConsentRecord {
  dataProcessing: boolean;
  counsellingDisclaimer: boolean;
  version: string;
  acceptedAt: string;
  /** Optional guardian consent for learners under 18. */
  guardianConsent?: boolean;
}

export interface Learner {
  id: string;
  userId: string;
  stage: LearnerStage;
  fullName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  city: string;
  country: string;
  currentEducation: string;
  institution?: string;
  /** Most recent qualifying percentage / CGPA converted to a percentage. */
  percentage?: number;
  subjects: string[];
  backlogs: number;
  englishTest?: {
    type: "IELTS" | "TOEFL" | "PTE" | "Duolingo" | "None";
    score?: number;
  };
  workExperienceMonths: number;
  targetIntake: string;
  budgetMinINR: number;
  budgetMaxINR: number;
  preferredCountries: string[];
  preferredModes: Mode[];
  interestAreas: string[];
  careerGoal: string;
  /** ID of the career cluster the learner is leaning towards, if any. */
  intendedClusterId?: string;
  /** Counsellor accountable for this learner. Assigned by staff. */
  counsellorId?: string;
  consent: ConsentRecord;
  onboardingCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RiasecScores {
  R: number;
  I: number;
  A: number;
  S: number;
  E: number;
  C: number;
}

export interface AptitudeScores {
  numerical: number;
  verbal: number;
  logical: number;
  spatial: number;
  overall: number;
}

export interface PersonalityScores {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  emotional_stability: number;
}

export interface ResponseQuality {
  /** 0–100. A straight-lining or rushed response lowers this. */
  score: number;
  band: "high" | "moderate" | "low";
  flags: string[];
  /** Seconds spent on the battery; used only for the quality signal. */
  durationSeconds: number;
}

export interface AssessmentScores {
  interest: RiasecScores;
  aptitude: AptitudeScores;
  personality: PersonalityScores;
  topInterestCode: string;
  quality: ResponseQuality;
  scoredAt: string;
  instrumentVersion: string;
}

export interface Assessment {
  id: string;
  learnerId: string;
  instrumentVersion: string;
  status: AssessmentStatus;
  startedAt?: string;
  completedAt?: string;
  /** itemId -> Likert value (1–5) or chosen option index (0–3). */
  responses: Record<string, number>;
  sectionTimings?: Partial<Record<"interest" | "aptitude" | "personality", number>>;
  scores?: AssessmentScores;
  createdAt: string;
  updatedAt: string;
}

export interface CourseEligibility {
  minPercentage?: number;
  requiredSubjects: string[];
  degreeRequired?: string[];
  backlogsAllowed?: number;
  englishRequirement?: string;
  notes?: string;
}

export interface CourseOutcomes {
  /** Coarse, defensible band instead of an unverified precise placement %. */
  placementBand: "high" | "moderate" | "emerging" | "not_disclosed";
  outcomeNote: string;
  indicativeMedianSalaryINR?: number;
  lastVerified: string;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  provider: string;
  providerType: "university" | "institute" | "mooc";
  level: "UG" | "PG" | "Diploma" | "Certificate";
  discipline: string;
  durationMonths: number;
  feeMinINR: number;
  feeMaxINR: number;
  eligibility: CourseEligibility;
  outcomes: CourseOutcomes;
  locations: string[];
  modes: Mode[];
  countries: string[];
  accreditation: string;
  summary: string;
  skills: string[];
  clusterIds: string[];
  isActive: boolean;
  url?: string;
  /** Seed data is marked illustrative until replaced by licensed data. */
  dataSource: "illustrative" | "licensed" | "institution_verified";
}

export interface ProgressionStage {
  title: string;
  yearsFrom: number;
  yearsTo: number;
  indicativeSalaryMinINR: number;
  indicativeSalaryMaxINR: number;
  skills: string[];
}

export interface CareerPath {
  id: string;
  slug: string;
  title: string;
  clusterId: string;
  summary: string;
  entryRoles: string[];
  progression: ProgressionStage[];
  demandIndex: number;
  demandNote: string;
  skills: string[];
  educationRoutes: string[];
  source: "illustrative" | "licensed";
}

export interface CareerCluster {
  id: string;
  name: string;
  shortName: string;
  summary: string;
  riasecIdeal: RiasecScores;
  aptitudeWeights: Record<AptitudeDimension, number>;
  personalityPreference: Partial<
    Record<BigFive, { direction: 1 | -1; weight: number }>
  >;
  accent: "evergreen" | "clay" | "brass" | "slateblue" | "aubergine" | "olive";
}

export interface MatchFactor {
  label: string;
  score: number;
  weight: number;
  note: string;
}

export interface ShortlistItem {
  id: string;
  learnerId: string;
  courseId: string;
  rank: number;
  fitScore: number;
  rationale: string;
  factors: MatchFactor[];
  status: ShortlistStatus;
  addedBy: "system" | "counsellor" | "learner";
  createdAt: string;
  updatedAt: string;
}

export interface ShortlistItemView extends ShortlistItem {
  course: Course;
  eligibility: {
    status: "eligible" | "conditional" | "not_eligible";
    messages: string[];
  };
}

export type ApplicationStatus =
  | "planned"
  | "preparing"
  | "submitted"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

export interface ApplicationChecklistItem {
  id: string;
  label: string;
  required: boolean;
  done: boolean;
  note?: string;
}

/**
 * A learner's live application to one shortlisted programme. This is the
 * post-shortlist workflow: deadlines, document evidence and the decision
 * outcome. It is intentionally separate from the shortlist so a learner can
 * have several applications in different states.
 */
export interface Application {
  id: string;
  learnerId: string;
  courseId: string;
  status: ApplicationStatus;
  deadline?: string;
  submittedAt?: string;
  decisionAt?: string;
  notes?: string;
  checklist: ApplicationChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationView extends Application {
  course: Course;
}

export interface Milestone {
  id: string;
  planId: string;
  quarter: 1 | 2 | 3 | 4;
  order: number;
  title: string;
  description: string;
  dueDate: string;
  status: MilestoneStatus;
  evidence?: string;
  completedAt?: string;
}

export interface Plan {
  id: string;
  learnerId: string;
  title: string;
  status: "draft" | "active" | "completed";
  startDate: string;
  endDate: string;
  objective: string;
  createdBy: "system" | "counsellor";
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanWithMilestones extends Plan {
  milestones: Milestone[];
}

export interface ReportNarrative {
  summary: string;
  strengths: string[];
  considerations: string[];
  recommendations: string[];
  guardrailNote: string;
}

export interface Report {
  id: string;
  learnerId: string;
  version: number;
  status: ReportStatus;
  verificationCode: string;
  narrative: ReportNarrative;
  /** Snapshot of the leading career paths used when the report was built. */
  topClusterIds: string[];
  suggestedPathIds: string[];
  counsellorId?: string;
  counsellorNotes?: string;
  learnerFacingNote?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  approvedAt?: string;
  releasedAt?: string;
  returnedReason?: string;
}

export interface QuarterlyReview {
  id: string;
  learnerId: string;
  quarter: number;
  year: number;
  scheduledFor: string;
  completedAt?: string;
  counsellorId?: string;
  progressRating?: number;
  notes?: string;
  nextSteps?: string;
  learnerReflection?: string;
}

export interface Satisfaction {
  id: string;
  learnerId: string;
  reportId: string;
  score: number;
  comment?: string;
  createdAt: string;
}

export type FeedbackCategory = "bug" | "idea" | "content" | "counselling" | "other";

export type FeedbackStatus = "open" | "reviewing" | "resolved";

export interface Feedback {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
  category: FeedbackCategory;
  message: string;
  rating?: number;
  page?: string;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Licence {
  id: string;
  instrumentName: string;
  provider: string;
  licenceRef: string;
  validFrom: string;
  validTo: string;
  seats: number;
  seatsUsed: number;
  status: LicenceStatus;
  scope: string;
  notes?: string;
  updatedAt: string;
}

export interface AuditEvent {
  id: string;
  actorId?: string;
  actorName: string;
  actorRole: Role | "system";
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AdvisorToolCall {
  name: string;
  args: Record<string, unknown>;
  summary: string;
}

export interface AdvisorMessage {
  id: string;
  learnerId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  toolCalls?: AdvisorToolCall[];
  model?: string;
  guardrail?: {
    redacted: boolean;
    reasons: string[];
  };
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  createdAt: string;
}

export interface Database {
  users: User[];
  learners: Learner[];
  assessments: Assessment[];
  courses: Course[];
  careerPaths: CareerPath[];
  shortlists: ShortlistItem[];
  applications: Application[];
  plans: Plan[];
  milestones: Milestone[];
  reports: Report[];
  reviews: QuarterlyReview[];
  satisfaction: Satisfaction[];
  feedback: Feedback[];
  licences: Licence[];
  audit: AuditEvent[];
  advisorMessages: AdvisorMessage[];
  notifications: Notification[];
}

export interface CourseFilters {
  query?: string;
  level?: Course["level"];
  discipline?: string;
  country?: string;
  mode?: Mode;
  maxFeeINR?: number;
  clusterId?: string;
  providerType?: Course["providerType"];
}
