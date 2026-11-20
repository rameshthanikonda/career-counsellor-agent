import type {
  AdvisorMessage,
  Application,
  Assessment,
  AuditEvent,
  CareerPath,
  Course,
  Database,
  Feedback,
  Learner,
  Licence,
  Milestone,
  Notification,
  Plan,
  QuarterlyReview,
  Report,
  ReportStatus,
  Satisfaction,
  ShortlistItem,
  User,
} from "@/lib/types";

export interface Store {
  readonly kind: "file" | "supabase";

  // Users
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  listUsers(): Promise<User[]>;
  createUser(user: User): Promise<User>;
  updateUser(id: string, patch: Partial<User>): Promise<User | null>;

  // Learners
  getLearnerByUserId(userId: string): Promise<Learner | null>;
  getLearnerById(id: string): Promise<Learner | null>;
  listLearners(): Promise<Learner[]>;
  saveLearner(learner: Learner): Promise<Learner>;

  // Assessments
  getAssessmentByLearner(learnerId: string): Promise<Assessment | null>;
  getAssessmentById(id: string): Promise<Assessment | null>;
  saveAssessment(assessment: Assessment): Promise<Assessment>;

  // Catalogue
  listCourses(): Promise<Course[]>;
  getCourseById(id: string): Promise<Course | null>;
  getCourseBySlug(slug: string): Promise<Course | null>;
  saveCourse(course: Course): Promise<Course>;
  listCareerPaths(): Promise<CareerPath[]>;

  // Shortlist
  listShortlist(learnerId: string): Promise<ShortlistItem[]>;
  replaceShortlist(learnerId: string, items: ShortlistItem[]): Promise<void>;
  saveShortlistItem(item: ShortlistItem): Promise<ShortlistItem>;
  deleteShortlistItem(learnerId: string, itemId: string): Promise<void>;

  // Applications
  listApplications(learnerId?: string): Promise<Application[]>;
  getApplicationById(id: string): Promise<Application | null>;
  saveApplication(application: Application): Promise<Application>;
  deleteApplication(id: string): Promise<void>;

  // Plans
  getPlanByLearner(learnerId: string): Promise<Plan | null>;
  getPlanById(planId: string): Promise<Plan | null>;
  savePlan(plan: Plan): Promise<Plan>;
  listMilestones(planId: string): Promise<Milestone[]>;
  saveMilestone(milestone: Milestone): Promise<Milestone>;

  // Reports
  getReportByLearner(learnerId: string): Promise<Report | null>;
  getReportById(id: string): Promise<Report | null>;
  getReportByCode(code: string): Promise<Report | null>;
  listReports(status?: ReportStatus): Promise<Report[]>;
  saveReport(report: Report): Promise<Report>;

  // Reviews
  listReviews(learnerId?: string): Promise<QuarterlyReview[]>;
  getReviewById(id: string): Promise<QuarterlyReview | null>;
  saveReview(review: QuarterlyReview): Promise<QuarterlyReview>;

  // Satisfaction
  getSatisfactionByLearner(learnerId: string): Promise<Satisfaction | null>;
  listSatisfaction(): Promise<Satisfaction[]>;
  saveSatisfaction(satisfaction: Satisfaction): Promise<Satisfaction>;

  // Feedback
  listFeedback(status?: Feedback["status"]): Promise<Feedback[]>;
  saveFeedback(feedback: Feedback): Promise<Feedback>;

  // Licences
  listLicences(): Promise<Licence[]>;
  getLicenceById(id: string): Promise<Licence | null>;
  saveLicence(licence: Licence): Promise<Licence>;

  // Audit
  listAudit(limit?: number): Promise<AuditEvent[]>;
  appendAudit(event: AuditEvent): Promise<void>;

  // Advisor
  listAdvisorMessages(learnerId: string): Promise<AdvisorMessage[]>;
  appendAdvisorMessage(message: AdvisorMessage): Promise<void>;

  // Notifications
  listNotifications(userId: string): Promise<Notification[]>;
  saveNotification(notification: Notification): Promise<Notification>;
  markNotificationsRead(userId: string): Promise<void>;

  // Ops
  stats(): Promise<{
    learners: number;
    reportsAwaitingReview: number;
    assessmentsCompleted: number;
    averageSatisfaction: number | null;
  }>;
  /** Exposed for demo resets and tests. Not available on Supabase. */
  replaceAll?(db: Database): Promise<void>;
}
