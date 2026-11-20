import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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
import type { Store } from "./types";

/**
 * Postgres/Supabase implementation of the Store contract.
 *
 * Each domain entity is persisted as one row: indexed relational columns
 * for the fields the application filters on, plus a `payload` JSONB column
 * that holds the complete serialisable entity. The migration lives at
 * `supabase/migrations/0001_init.sql`.
 *
 * The service-role key is required and must never be exposed to the
 * browser. This adapter is server-only and is never imported by a client
 * component.
 */

type TableName =
  | "users"
  | "learners"
  | "assessments"
  | "courses"
  | "career_paths"
  | "shortlists"
  | "applications"
  | "plans"
  | "milestones"
  | "reports"
  | "reviews"
  | "satisfaction"
  | "feedback"
  | "licences"
  | "audit"
  | "advisor_messages"
  | "notifications";

type Columns = Record<string, string | number | boolean | null>;

interface Row<T> {
  id: string;
  payload: T;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `DATA_BACKEND=supabase requires ${name}. Add it to .env.local (server-side only).`
    );
  }
  return value;
}

function lowerEmail(email: string) {
  return email.trim().toLowerCase();
}

export class SupabaseStore implements Store {
  readonly kind = "supabase" as const;
  private readonly client: SupabaseClient;

  constructor() {
    this.client = createClient(
      requiredEnv("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, ""),
      requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { "X-Client-Info": "northstar-store" } },
      }
    );
  }

  // ── Primitive helpers ──────────────────────────────────────

  private async selectAll<T>(table: TableName, order = "created_at"): Promise<T[]> {
    const { data, error } = await this.client
      .from(table)
      .select("id,payload")
      .order(order, { ascending: true });
    if (error) throw new Error(`${table}.select failed: ${error.message}`);
    return ((data ?? []) as Row<T>[]).map((row) => row.payload);
  }

  private async selectOneById<T>(table: TableName, id: string): Promise<T | null> {
    const { data, error } = await this.client
      .from(table)
      .select("payload")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`${table}.get failed: ${error.message}`);
    return (data as Row<T> | null)?.payload ?? null;
  }

  private async selectOneWhere<T>(
    table: TableName,
    column: string,
    value: string,
    order?: { column: string; ascending: boolean }
  ): Promise<T | null> {
    let query = this.client.from(table).select("payload").eq(column, value);
    if (order) query = query.order(order.column, { ascending: order.ascending });
    const { data, error } = await query.limit(1).maybeSingle();
    if (error) throw new Error(`${table}.filter failed: ${error.message}`);
    return (data as Row<T> | null)?.payload ?? null;
  }

  private async selectWhere<T>(
    table: TableName,
    column: string,
    value: string
  ): Promise<T[]> {
    const { data, error } = await this.client
      .from(table)
      .select("id,payload")
      .eq(column, value);
    if (error) throw new Error(`${table}.filter failed: ${error.message}`);
    return ((data ?? []) as Row<T>[]).map((row) => row.payload);
  }

  private async upsert<T extends { id: string }>(
    table: TableName,
    entity: T,
    columns: Columns = {}
  ): Promise<T> {
    const now = new Date().toISOString();
    const row = {
      id: entity.id,
      payload: entity,
      ...columns,
      updated_at: now,
    };
    const { error } = await this.client
      .from(table)
      .upsert(row, { onConflict: "id" });
    if (error) throw new Error(`${table}.upsert failed: ${error.message}`);
    return entity;
  }

  private async insert<T>(table: TableName, entity: T, columns: Columns = {}) {
    const { error } = await this.client.from(table).insert({
      payload: entity,
      ...columns,
    });
    if (error) throw new Error(`${table}.insert failed: ${error.message}`);
  }

  private async deleteWhere(
    table: TableName,
    filters: Record<string, string>
  ): Promise<void> {
    let query = this.client.from(table).delete();
    for (const [column, value] of Object.entries(filters)) {
      query = query.eq(column, value);
    }
    const { error } = await query;
    if (error) throw new Error(`${table}.delete failed: ${error.message}`);
  }

  // ── Users ──────────────────────────────────────────────────

  private userColumns(user: User): Columns {
    return { email: lowerEmail(user.email), role: user.role };
  }

  async getUserByEmail(email: string) {
    return this.selectOneWhere<User>("users", "email", lowerEmail(email));
  }

  async getUserById(id: string) {
    return this.selectOneById<User>("users", id);
  }

  async listUsers() {
    return this.selectAll<User>("users");
  }

  async createUser(user: User) {
    return this.upsert<User>("users", user, this.userColumns(user));
  }

  async updateUser(id: string, patch: Partial<User>) {
    const current = await this.getUserById(id);
    if (!current) return null;
    return this.upsert<User>(
      "users",
      { ...current, ...patch, id },
      this.userColumns({ ...current, ...patch, id })
    );
  }

  // ── Learners ───────────────────────────────────────────────

  async getLearnerByUserId(userId: string) {
    return this.selectOneWhere<Learner>("learners", "user_id", userId);
  }

  async getLearnerById(id: string) {
    return this.selectOneById<Learner>("learners", id);
  }

  async listLearners() {
    return this.selectAll<Learner>("learners");
  }

  async saveLearner(learner: Learner) {
    return this.upsert<Learner>("learners", learner, {
      user_id: learner.userId,
    });
  }

  // ── Assessments ────────────────────────────────────────────

  async getAssessmentByLearner(learnerId: string) {
    return this.selectOneWhere<Assessment>("assessments", "learner_id", learnerId, {
      column: "created_at",
      ascending: false,
    });
  }

  async getAssessmentById(id: string) {
    return this.selectOneById<Assessment>("assessments", id);
  }

  async saveAssessment(assessment: Assessment) {
    return this.upsert<Assessment>("assessments", assessment, {
      learner_id: assessment.learnerId,
      status: assessment.status,
    });
  }

  // ── Catalogue ──────────────────────────────────────────────

  async listCourses() {
    return this.selectAll<Course>("courses", "id");
  }

  async getCourseById(id: string) {
    return this.selectOneById<Course>("courses", id);
  }

  async getCourseBySlug(slug: string) {
    return this.selectOneWhere<Course>("courses", "slug", slug);
  }

  async saveCourse(course: Course) {
    return this.upsert<Course>("courses", course, {
      slug: course.slug,
      level: course.level,
    });
  }

  async listCareerPaths() {
    return this.selectAll<CareerPath>("career_paths", "id");
  }

  // ── Shortlist ──────────────────────────────────────────────

  async listShortlist(learnerId: string) {
    const items = await this.selectWhere<ShortlistItem>(
      "shortlists",
      "learner_id",
      learnerId
    );
    return items.sort((a, b) => a.rank - b.rank);
  }

  async replaceShortlist(learnerId: string, items: ShortlistItem[]) {
    await this.deleteWhere("shortlists", { learner_id: learnerId });
    if (items.length === 0) return;
    const rows = items.map((item) => ({
      id: item.id,
      payload: item,
      learner_id: item.learnerId,
      course_id: item.courseId,
      status: item.status,
      rank: item.rank,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await this.client.from("shortlists").insert(rows);
    if (error) throw new Error(`shortlists.replace failed: ${error.message}`);
  }

  async saveShortlistItem(item: ShortlistItem) {
    return this.upsert<ShortlistItem>("shortlists", item, {
      learner_id: item.learnerId,
      course_id: item.courseId,
      status: item.status,
      rank: item.rank,
    });
  }

  async deleteShortlistItem(learnerId: string, itemId: string) {
    await this.deleteWhere("shortlists", { learner_id: learnerId, id: itemId });
  }

  // ── Applications ───────────────────────────────────────────

  async listApplications(learnerId?: string) {
    const rows = learnerId
      ? await this.selectWhere<Application>("applications", "learner_id", learnerId)
      : await this.selectAll<Application>("applications");
    return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getApplicationById(id: string) {
    return this.selectOneById<Application>("applications", id);
  }

  async saveApplication(application: Application) {
    return this.upsert<Application>("applications", application, {
      learner_id: application.learnerId,
      course_id: application.courseId,
      status: application.status,
      deadline: application.deadline ?? null,
    });
  }

  async deleteApplication(id: string) {
    await this.deleteWhere("applications", { id });
  }

  // ── Plans ──────────────────────────────────────────────────

  async getPlanByLearner(learnerId: string) {
    return this.selectOneWhere<Plan>("plans", "learner_id", learnerId, {
      column: "created_at",
      ascending: false,
    });
  }

  async getPlanById(planId: string) {
    return this.selectOneById<Plan>("plans", planId);
  }

  async savePlan(plan: Plan) {
    return this.upsert<Plan>("plans", plan, {
      learner_id: plan.learnerId,
      status: plan.status,
    });
  }

  async listMilestones(planId: string) {
    const milestones = await this.selectWhere<Milestone>(
      "milestones",
      "plan_id",
      planId
    );
    return milestones.sort((a, b) => a.order - b.order);
  }

  async saveMilestone(milestone: Milestone) {
    return this.upsert<Milestone>("milestones", milestone, {
      plan_id: milestone.planId,
      quarter: milestone.quarter,
      order_index: milestone.order,
      status: milestone.status,
    });
  }

  // ── Reports ────────────────────────────────────────────────

  async getReportByLearner(learnerId: string) {
    return this.selectOneWhere<Report>("reports", "learner_id", learnerId, {
      column: "version",
      ascending: false,
    });
  }

  async getReportById(id: string) {
    return this.selectOneById<Report>("reports", id);
  }

  async getReportByCode(code: string) {
    return this.selectOneWhere<Report>(
      "reports",
      "verification_code",
      code.trim().toUpperCase()
    );
  }

  async listReports(status?: ReportStatus) {
    const reports = status
      ? await this.selectWhere<Report>("reports", "status", status)
      : await this.selectAll<Report>("reports");
    return reports.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async saveReport(report: Report) {
    return this.upsert<Report>("reports", report, {
      learner_id: report.learnerId,
      status: report.status,
      verification_code: report.verificationCode.toUpperCase(),
      version: report.version,
    });
  }

  // ── Reviews ────────────────────────────────────────────────

  async listReviews(learnerId?: string) {
    const reviews = learnerId
      ? await this.selectWhere<QuarterlyReview>("reviews", "learner_id", learnerId)
      : await this.selectAll<QuarterlyReview>("reviews");
    return reviews.sort((a, b) => b.scheduledFor.localeCompare(a.scheduledFor));
  }

  async getReviewById(id: string) {
    return this.selectOneById<QuarterlyReview>("reviews", id);
  }

  async saveReview(review: QuarterlyReview) {
    return this.upsert<QuarterlyReview>("reviews", review, {
      learner_id: review.learnerId,
      scheduled_for: review.scheduledFor,
      completed_at: review.completedAt ?? null,
    });
  }

  // ── Satisfaction ───────────────────────────────────────────

  async getSatisfactionByLearner(learnerId: string) {
    return this.selectOneWhere<Satisfaction>(
      "satisfaction",
      "learner_id",
      learnerId,
      { column: "created_at", ascending: false }
    );
  }

  async listSatisfaction() {
    return this.selectAll<Satisfaction>("satisfaction");
  }

  async saveSatisfaction(satisfaction: Satisfaction) {
    await this.insert<Satisfaction>("satisfaction", satisfaction, {
      id: satisfaction.id,
      learner_id: satisfaction.learnerId,
      report_id: satisfaction.reportId,
      score: satisfaction.score,
    });
    return satisfaction;
  }

  // ── Feedback ───────────────────────────────────────────────

  async listFeedback(status?: Feedback["status"]) {
    const rows = status
      ? await this.selectWhere<Feedback>("feedback", "status", status)
      : await this.selectAll<Feedback>("feedback");
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async saveFeedback(feedback: Feedback) {
    return this.upsert<Feedback>("feedback", feedback, {
      user_id: feedback.userId,
      status: feedback.status,
      category: feedback.category,
    });
  }

  // ── Licences ───────────────────────────────────────────────

  async listLicences() {
    return this.selectAll<Licence>("licences", "id");
  }

  async getLicenceById(id: string) {
    return this.selectOneById<Licence>("licences", id);
  }

  async saveLicence(licence: Licence) {
    return this.upsert<Licence>("licences", licence, { status: licence.status });
  }

  // ── Audit ──────────────────────────────────────────────────

  async listAudit(limit = 50) {
    const { data, error } = await this.client
      .from("audit")
      .select("payload")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`audit.list failed: ${error.message}`);
    return ((data ?? []) as Row<AuditEvent>[]).map((row) => row.payload);
  }

  async appendAudit(event: AuditEvent) {
    await this.insert<AuditEvent>("audit", event, {
      id: event.id,
      actor_id: event.actorId ?? null,
      action: event.action,
      entity: event.entity,
      entity_id: event.entityId ?? null,
      actor_role: event.actorRole,
      created_at: event.createdAt,
    });
  }

  // ── Advisor ────────────────────────────────────────────────

  async listAdvisorMessages(learnerId: string) {
    const messages = await this.selectWhere<AdvisorMessage>(
      "advisor_messages",
      "learner_id",
      learnerId
    );
    return messages.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async appendAdvisorMessage(message: AdvisorMessage) {
    await this.insert<AdvisorMessage>("advisor_messages", message, {
      id: message.id,
      learner_id: message.learnerId,
      role: message.role,
      created_at: message.createdAt,
    });
  }

  // ── Notifications ──────────────────────────────────────────

  async listNotifications(userId: string) {
    const notifications = await this.selectWhere<Notification>(
      "notifications",
      "user_id",
      userId
    );
    return notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async saveNotification(notification: Notification) {
    await this.insert<Notification>("notifications", notification, {
      id: notification.id,
      user_id: notification.userId,
      read: notification.read,
      created_at: notification.createdAt,
    });
    return notification;
  }

  async markNotificationsRead(userId: string) {
    const { error } = await this.client
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId);
    if (error) throw new Error(`notifications.markRead failed: ${error.message}`);
  }

  // ── Ops ────────────────────────────────────────────────────

  async stats() {
    const [learners, awaiting, completed, satisfaction] = await Promise.all([
      this.client.from("learners").select("id", { count: "exact" }).limit(1),
      this.client
        .from("reports")
        .select("id", { count: "exact" })
        .in("status", ["draft", "in_review"])
        .limit(1),
      this.client
        .from("assessments")
        .select("id", { count: "exact" })
        .eq("status", "completed")
        .limit(1),
      this.client.from("satisfaction").select("score"),
    ]);

    for (const result of [learners, awaiting, completed, satisfaction]) {
      if (result.error) throw new Error(`stats failed: ${result.error.message}`);
    }

    const scores = ((satisfaction.data ?? []) as { score: number }[]).map(
      (row) => row.score
    );
    return {
      learners: learners.count ?? 0,
      reportsAwaitingReview: awaiting.count ?? 0,
      assessmentsCompleted: completed.count ?? 0,
      averageSatisfaction: scores.length
        ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10
        : null,
    };
  }

  /**
   * Idempotent bulk load, used by `npm run supabase:push` to bootstrap a new
   * project. Existing rows with the same id are updated. This is not exposed
   * through the application and must be invoked from a trusted script only.
   */
  async replaceAll(db: Database): Promise<void> {
    for (const user of db.users) {
      await this.upsert<User>("users", user, this.userColumns(user));
    }
    for (const learner of db.learners) {
      await this.upsert<Learner>("learners", learner, { user_id: learner.userId });
    }
    for (const assessment of db.assessments) {
      await this.upsert<Assessment>("assessments", assessment, {
        learner_id: assessment.learnerId,
        status: assessment.status,
      });
    }
    for (const course of db.courses) {
      await this.upsert<Course>("courses", course, {
        slug: course.slug,
        level: course.level,
      });
    }
    for (const path of db.careerPaths) {
      await this.upsert<CareerPath>("career_paths", path, { slug: path.slug });
    }
    for (const item of db.shortlists) {
      await this.upsert<ShortlistItem>("shortlists", item, {
        learner_id: item.learnerId,
        course_id: item.courseId,
        status: item.status,
        rank: item.rank,
      });
    }
    for (const application of db.applications) {
      await this.upsert<Application>("applications", application, {
        learner_id: application.learnerId,
        course_id: application.courseId,
        status: application.status,
        deadline: application.deadline ?? null,
      });
    }
    for (const plan of db.plans) {
      await this.upsert<Plan>("plans", plan, {
        learner_id: plan.learnerId,
        status: plan.status,
      });
    }
    for (const milestone of db.milestones) {
      await this.upsert<Milestone>("milestones", milestone, {
        plan_id: milestone.planId,
        quarter: milestone.quarter,
        order_index: milestone.order,
        status: milestone.status,
      });
    }
    for (const report of db.reports) {
      await this.upsert<Report>("reports", report, {
        learner_id: report.learnerId,
        status: report.status,
        verification_code: report.verificationCode.toUpperCase(),
        version: report.version,
      });
    }
    for (const review of db.reviews) {
      await this.upsert<QuarterlyReview>("reviews", review, {
        learner_id: review.learnerId,
        scheduled_for: review.scheduledFor,
        completed_at: review.completedAt ?? null,
      });
    }
    for (const satisfaction of db.satisfaction) {
      await this.upsert<Satisfaction>("satisfaction", satisfaction, {
        learner_id: satisfaction.learnerId,
        report_id: satisfaction.reportId,
        score: satisfaction.score,
      });
    }
    for (const feedback of db.feedback) {
      await this.upsert<Feedback>("feedback", feedback, {
        user_id: feedback.userId,
        status: feedback.status,
        category: feedback.category,
      });
    }
    for (const licence of db.licences) {
      await this.upsert<Licence>("licences", licence, { status: licence.status });
    }
    for (const event of db.audit) {
      await this.upsert<AuditEvent>("audit", event, {
        actor_id: event.actorId ?? null,
        actor_role: event.actorRole,
        action: event.action,
        entity: event.entity,
        entity_id: event.entityId ?? null,
        created_at: event.createdAt,
      });
    }
    for (const message of db.advisorMessages) {
      await this.upsert<AdvisorMessage>("advisor_messages", message, {
        learner_id: message.learnerId,
        role: message.role,
        created_at: message.createdAt,
      });
    }
    for (const notification of db.notifications) {
      await this.upsert<Notification>("notifications", notification, {
        user_id: notification.userId,
        read: notification.read,
        created_at: notification.createdAt,
      });
    }
  }
}
