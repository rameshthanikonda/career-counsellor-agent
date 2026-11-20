import { promises as fs } from "node:fs";
import path from "node:path";
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
import { createSeedDatabase } from "./seed";

const DATA_DIR = process.env.NORTHSTAR_DATA_DIR
  ? path.resolve(process.env.NORTHSTAR_DATA_DIR)
  : path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "db.json");

let writeQueue: Promise<unknown> = Promise.resolve();
let cache: { db: Database; mtimeMs: number } | null = null;

async function readDb(): Promise<Database> {
  try {
    const stat = await fs.stat(DB_PATH);
    if (cache && cache.mtimeMs === stat.mtimeMs) return cache.db;
    const raw = await fs.readFile(DB_PATH, "utf8");
    const db = JSON.parse(raw) as Database;
    cache = { db, mtimeMs: stat.mtimeMs };
    return db;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      const seeded = createSeedDatabase();
      await writeDb(seeded);
      return seeded;
    }
    throw error;
  }
}

async function writeDb(db: Database): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_PATH}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, DB_PATH);
  const stat = await fs.stat(DB_PATH);
  cache = { db, mtimeMs: stat.mtimeMs };
}

function withWrite<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  const run = writeQueue.then(async () => {
    const db = await readDb();
    const result = await fn(db);
    await writeDb(db);
    return result;
  });
  writeQueue = run.catch(() => undefined);
  return run;
}

function byId<T extends { id: string }>(rows: T[], id: string) {
  return rows.find((row) => row.id === id) ?? null;
}

export class FileStore implements Store {
  readonly kind = "file" as const;

  async getUserByEmail(email: string) {
    const db = await readDb();
    return (
      db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase()) ?? null
    );
  }

  async getUserById(id: string) {
    return byId((await readDb()).users, id);
  }

  async listUsers() {
    return [...(await readDb()).users];
  }

  async createUser(user: User) {
    return withWrite((db) => {
      const exists = db.users.some(
        (row) => row.id === user.id || row.email.toLowerCase() === user.email.toLowerCase()
      );
      if (exists) {
        throw new Error("An account with this email already exists.");
      }
      db.users.push(user);
      return user;
    });
  }

  async updateUser(id: string, patch: Partial<User>) {
    return withWrite((db) => {
      const index = db.users.findIndex((u) => u.id === id);
      if (index === -1) return null;
      db.users[index] = { ...db.users[index], ...patch, id };
      return db.users[index];
    });
  }

  async getLearnerByUserId(userId: string) {
    const db = await readDb();
    return db.learners.find((l) => l.userId === userId) ?? null;
  }

  async getLearnerById(id: string) {
    return byId((await readDb()).learners, id);
  }

  async listLearners() {
    return [...(await readDb()).learners];
  }

  async saveLearner(learner: Learner) {
    return withWrite((db) => {
      const index = db.learners.findIndex((l) => l.id === learner.id);
      if (index === -1) db.learners.push(learner);
      else db.learners[index] = learner;
      return learner;
    });
  }

  async getAssessmentByLearner(learnerId: string) {
    const db = await readDb();
    return (
      db.assessments
        .filter((a) => a.learnerId === learnerId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
    );
  }

  async getAssessmentById(id: string) {
    return byId((await readDb()).assessments, id);
  }

  async saveAssessment(assessment: Assessment) {
    return withWrite((db) => {
      const index = db.assessments.findIndex((a) => a.id === assessment.id);
      if (index === -1) db.assessments.push(assessment);
      else db.assessments[index] = assessment;
      return assessment;
    });
  }

  async listCourses() {
    return (await readDb()).courses;
  }

  async getCourseById(id: string) {
    return byId((await readDb()).courses, id);
  }

  async getCourseBySlug(slug: string) {
    const db = await readDb();
    return db.courses.find((c) => c.slug === slug) ?? null;
  }

  async saveCourse(course: Course) {
    return withWrite((db) => {
      const index = db.courses.findIndex((c) => c.id === course.id);
      if (index === -1) db.courses.push(course);
      else db.courses[index] = course;
      return course;
    });
  }

  async listCareerPaths(): Promise<CareerPath[]> {
    return (await readDb()).careerPaths;
  }

  async listShortlist(learnerId: string) {
    return (await readDb()).shortlists
      .filter((s) => s.learnerId === learnerId)
      .sort((a, b) => a.rank - b.rank);
  }

  async replaceShortlist(learnerId: string, items: ShortlistItem[]) {
    return withWrite((db) => {
      db.shortlists = db.shortlists.filter((s) => s.learnerId !== learnerId);
      db.shortlists.push(...items);
    });
  }

  async saveShortlistItem(item: ShortlistItem) {
    return withWrite((db) => {
      const index = db.shortlists.findIndex((s) => s.id === item.id);
      if (index === -1) db.shortlists.push(item);
      else db.shortlists[index] = item;
      return item;
    });
  }

  async deleteShortlistItem(learnerId: string, itemId: string) {
    return withWrite((db) => {
      db.shortlists = db.shortlists.filter(
        (s) => !(s.learnerId === learnerId && s.id === itemId)
      );
    });
  }

  async listApplications(learnerId?: string) {
    const rows = (await readDb()).applications ?? [];
    return rows
      .filter((application) => (learnerId ? application.learnerId === learnerId : true))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getApplicationById(id: string) {
    return byId((await readDb()).applications ?? [], id);
  }

  async saveApplication(application: Application) {
    return withWrite((db) => {
      db.applications = db.applications ?? [];
      const index = db.applications.findIndex((row) => row.id === application.id);
      if (index === -1) db.applications.push(application);
      else db.applications[index] = application;
      return application;
    });
  }

  async deleteApplication(id: string) {
    return withWrite((db) => {
      db.applications = (db.applications ?? []).filter((row) => row.id !== id);
    });
  }

  async getPlanByLearner(learnerId: string) {
    const db = await readDb();
    return (
      db.plans
        .filter((p) => p.learnerId === learnerId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
    );
  }

  async getPlanById(planId: string) {
    return byId((await readDb()).plans, planId);
  }

  async savePlan(plan: Plan) {
    return withWrite((db) => {
      const index = db.plans.findIndex((p) => p.id === plan.id);
      if (index === -1) db.plans.push(plan);
      else db.plans[index] = plan;
      return plan;
    });
  }

  async listMilestones(planId: string) {
    return (await readDb()).milestones
      .filter((m) => m.planId === planId)
      .sort((a, b) => a.order - b.order);
  }

  async saveMilestone(milestone: Milestone) {
    return withWrite((db) => {
      const index = db.milestones.findIndex((m) => m.id === milestone.id);
      if (index === -1) db.milestones.push(milestone);
      else db.milestones[index] = milestone;
      return milestone;
    });
  }

  async getReportByLearner(learnerId: string) {
    const db = await readDb();
    return (
      db.reports
        .filter((r) => r.learnerId === learnerId)
        .sort((a, b) => b.version - a.version)[0] ?? null
    );
  }

  async getReportById(id: string) {
    return byId((await readDb()).reports, id);
  }

  async getReportByCode(code: string) {
    const db = await readDb();
    return (
      db.reports.find(
        (r) => r.verificationCode.toUpperCase() === code.trim().toUpperCase()
      ) ?? null
    );
  }

  async listReports(status?: ReportStatus) {
    const db = await readDb();
    return db.reports
      .filter((r) => (status ? r.status === status : true))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async saveReport(report: Report) {
    return withWrite((db) => {
      const index = db.reports.findIndex((r) => r.id === report.id);
      if (index === -1) db.reports.push(report);
      else db.reports[index] = report;
      return report;
    });
  }

  async listReviews(learnerId?: string) {
    const db = await readDb();
    return db.reviews
      .filter((r) => (learnerId ? r.learnerId === learnerId : true))
      .sort((a, b) => b.scheduledFor.localeCompare(a.scheduledFor));
  }

  async getReviewById(id: string) {
    return byId((await readDb()).reviews, id);
  }

  async saveReview(review: QuarterlyReview) {
    return withWrite((db) => {
      const index = db.reviews.findIndex((r) => r.id === review.id);
      if (index === -1) db.reviews.push(review);
      else db.reviews[index] = review;
      return review;
    });
  }

  async getSatisfactionByLearner(learnerId: string) {
    const db = await readDb();
    return (
      db.satisfaction
        .filter((s) => s.learnerId === learnerId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
    );
  }

  async listSatisfaction() {
    return (await readDb()).satisfaction;
  }

  async saveSatisfaction(satisfaction: Satisfaction) {
    return withWrite((db) => {
      db.satisfaction.push(satisfaction);
      return satisfaction;
    });
  }

  async listFeedback(status?: Feedback["status"]) {
    const rows = (await readDb()).feedback ?? [];
    return rows
      .filter((item) => (status ? item.status === status : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async saveFeedback(feedback: Feedback) {
    return withWrite((db) => {
      db.feedback = db.feedback ?? [];
      const index = db.feedback.findIndex((row) => row.id === feedback.id);
      if (index === -1) db.feedback.push(feedback);
      else db.feedback[index] = feedback;
      return feedback;
    });
  }

  async listLicences() {
    return (await readDb()).licences;
  }

  async getLicenceById(id: string) {
    return byId((await readDb()).licences, id);
  }

  async saveLicence(licence: Licence) {
    return withWrite((db) => {
      const index = db.licences.findIndex((l) => l.id === licence.id);
      if (index === -1) db.licences.push(licence);
      else db.licences[index] = licence;
      return licence;
    });
  }

  async listAudit(limit = 50) {
    const db = await readDb();
    return [...db.audit]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async appendAudit(event: AuditEvent) {
    return withWrite((db) => {
      db.audit.push(event);
      if (db.audit.length > 2000) {
        db.audit = db.audit
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          .slice(-2000);
      }
    });
  }

  async listAdvisorMessages(learnerId: string) {
    return (await readDb()).advisorMessages
      .filter((m) => m.learnerId === learnerId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async appendAdvisorMessage(message: AdvisorMessage) {
    return withWrite((db) => {
      db.advisorMessages.push(message);
      if (db.advisorMessages.length > 5000) {
        db.advisorMessages = db.advisorMessages.slice(-5000);
      }
    });
  }

  async listNotifications(userId: string) {
    return (await readDb()).notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async saveNotification(notification: Notification) {
    return withWrite((db) => {
      db.notifications.push(notification);
      return notification;
    });
  }

  async markNotificationsRead(userId: string) {
    return withWrite((db) => {
      for (const n of db.notifications) {
        if (n.userId === userId) n.read = true;
      }
    });
  }

  async stats() {
    const db = await readDb();
    const satisfaction = db.satisfaction;
    return {
      learners: db.learners.length,
      reportsAwaitingReview: db.reports.filter(
        (r) => r.status === "in_review" || r.status === "draft"
      ).length,
      assessmentsCompleted: db.assessments.filter((a) => a.status === "completed")
        .length,
      averageSatisfaction: satisfaction.length
        ? Math.round(
            (satisfaction.reduce((sum, s) => sum + s.score, 0) / satisfaction.length) * 10
          ) / 10
        : null,
    };
  }

  async replaceAll(db: Database) {
    return withWrite(() => {
      cache = null;
      return db;
    }).then(() => writeDb(db));
  }
}

let instance: FileStore | null = null;

export function fileStore() {
  if (!instance) instance = new FileStore();
  return instance;
}

export const fileStorePaths = { DATA_DIR, DB_PATH };
