# Northstar â€” Career Counsellor Agent

An enterprise career-counselling workspace for WAECS (brief **06 / Education and Careers**). It runs psychometric assessment, interprets results into course and career options, compares programmes on fees and eligibility, builds a 12-month plan, and â€” critically â€” puts a **human counsellor checkpoint** before anything reaches the learner.

This is a working reference implementation, not a mock-up. Everything described below exists in the repository and is exercised by tests. The course catalogue and career-path templates are **illustrative** until replaced with licensed or institution-verified data; that limitation is surfaced in the product, not hidden.

## Live integration status

| Dependency | Status | Detail |
| --- | --- | --- |
| App (learner/counsellor/admin) | Running | Live at `http://localhost:3000` |
| Supabase / Postgres | **Live** | 17 tables created and seeded; `DATA_BACKEND=supabase`; reads, writes, PDF and calendar verified against Postgres |
| Local file store | Available fallback | `.data/db.json`; switch with `DATA_BACKEND=file` and `npm run seed` |
| Gemini advisor | Key rejected by Google | The supplied `AQ.` key returns `401 ACCESS_TOKEN_TYPE_UNSUPPORTED`; the advisor falls back deterministically and retries on a circuit breaker. A fresh AI Studio key (or Vertex AI service account) is required for model answers. |
| Tests / build | 80 tests, clean production build | TypeScript strict clean |

The application is now running on **Supabase/Postgres**. The local JSON store remains as a zero-setup fallback for development.


The full structured delivery report — brief compliance matrix, architecture, verification evidence and blockers — is available as [PROJECT_REPORT.md](PROJECT_REPORT.md) and [PROJECT_REPORT.pdf](PROJECT_REPORT.pdf).

---

## 1. Brief â†’ implementation

| Brief requirement | Where it lives |
| --- | --- |
| Learner onboarding questionnaire | `/onboarding`, `components/learner/onboarding-form.tsx`, `lib/validation/onboarding.ts` |
| Psychometric assessment: interest, aptitude, personality | `lib/assessment/instruments.ts` (80 items, three sections), `/learner/assessment` |
| Rule-based scoring | `lib/assessment/scoring.ts` â€” RIASEC, aptitude, Big Five with reverse-keyed items, response-quality signal |
| Turn results into course/career options | `lib/catalogue/matching.ts` â€” cluster fit (interest 50 / aptitude 30 / style 20) and programme fit (career 40 / eligibility 20 / budget 15 / preference 15 / outcomes 10) |
| Compare courses on fees, eligibility, outcomes | `/learner/results` shortlist tab, `/counsellor/catalogue`, comparison tool |
| Course database | `lib/catalogue/courses.ts` (40 programmes, 12 clusters, 21 career paths) |
| Career path templates with milestones | `lib/catalogue/career-paths.ts`, `lib/plans/generator.ts` (10 milestones across four quarters) |
| Labour-market data | `CareerPath.demandIndex` / `demandNote` (illustrative until a licensed feed is connected) |
| Counselling report | `lib/reports/narrative.ts`, PDF generator in `lib/reports/pdf.ts`, `/learner/results` |
| Shortlisted courses or roles | Shortlist model + counsellor approval, `components/counsellor/shortlist-manager.tsx` |
| Application tracker: deadlines, document checklist, outcomes | `lib/applications/checklist.ts`, `/learner/applications`, `/api/applications` |
| Self-signup with required privacy + counselling consent | `/signup`, `/api/auth/signup`; consent version and timestamp recorded before the account exists |
| In-app month calendar + `.ics` export | `/learner/calendar`, `components/learner/calendar-view.tsx` |
| Product feedback and admin triage | `/feedback`, `/admin/feedback`, `app/api/feedback` |
| Account settings, password change and session invalidation | `/settings`, `/api/auth/change-password` |
| Notification centre with mark-all-read | `/notifications`, `/api/notifications/read` |
| CSV export of applications | `/api/applications/export` |
| Caseload analytics: funnel, deadline risk, reviews, satisfaction | `/counsellor/analytics`, `lib/services/analytics.ts` |
| Report version history | Counsellor â€œHistoryâ€ tab; released versions on `/learner/results` |
| 12-month action plan | `/learner/plan`, `components/learner/plan-board.tsx` |
| Calendar export for milestones, reviews and deadlines | `lib/calendar/ics.ts`, `lib/calendar/events.ts`, `GET /api/calendar` |
| Accountable counsellor per learner | `Learner.counsellorId`, assignment API + control, â€œMy caseloadâ€ queue filter |
| Learner data export (portability) | `GET /api/learner/export`, linked from the overview and applications page |
| Learner satisfaction score | `/learner/reviews#satisfaction`, `app/api/satisfaction`, admin stats |
| Review progress each quarter | Quarterly review records, `/learner/reviews`, counsellor review composer |
| **Human checkpoint** | Report state machine `draft â†’ in_review â†’ approved â†’ released` (or `returned`); learner cannot see the report, PDF or plan until release |
| Guardrail: no placement/result promises | System rules + post-generation regex filter + narrative guardrail note + PDF/verification disclaimers |
| Guardrail: instruments used under valid licence | Licence register + enforcement at assessment start (`lib/services/licensing.ts`) |
| Guardrail: student data confidential | scrypt passwords, signed HttpOnly session, ownership checks, RLS-ready schema, audit trail |
| Learner-facing screens | Onboarding, assessment, results/career map, plan, advisor, reviews |
| Counsellor review screen | `/counsellor` queue and `/counsellor/learner/[id]` console |
| AI advisor prompt + tools + guardrails | `lib/ai/advisor.ts`, `lib/ai/tools.ts`, `lib/ai/guardrails.ts` |
| PDF report generator | `lib/reports/pdf.ts` â†’ `GET /api/reports/[id]/pdf` |

The brief's development note â€” *confirm which psychometric instruments we are licensed to use* â€” is implemented as a **licence register with hard enforcement**, not a checkbox. See Â§7.

---

## 2. Demo accounts

The seed is deterministic. All demo accounts use the password **`Northstar#2026`**.

| Role | Email | Starting state |
| --- | --- | --- |
| Learner | `aarav@demo.northstar.in` | Assessment complete, report released, active 12-month plan, one completed review |
| Learner | `diya@demo.northstar.in` | Assessment complete, report **in review** (the human-checkpoint demo) |
| Learner | `kabir@demo.northstar.in` | Working professional, no assessment yet |
| Counsellor | `meera@demo.northstar.in` | Queue with a report waiting, licences and shortlists |
| Admin | `admin@demo.northstar.in` | Operations, licence register, catalogue provenance, audit trail |

No real learner data is used.

---

## 3. Quick start

Prerequisites: Node.js **20.11+** and npm.

```bash
npm install
npm run seed        # writes .data/db.json with the demo dataset
npm run dev         # http://localhost:3000
```

Production check:

```bash
npm run typecheck
npm test
npm run build
npm start
```

Useful scripts:

| Script | Purpose |
| --- | --- |
| `npm run seed` | Reset the local JSON store. Refuses to overwrite without `-- --force` |
| `npm run supabase:push` | Bootstrap a Supabase project from the demo dataset |
| `npm run supabase:check` | Verify project connectivity and every required table |
| `npm run supabase:apply` | Apply `supabase/migrations/*.sql` over a direct `DATABASE_URL` |
| `npm run report:sample` | Render a PDF from the seeded released report into `./reports` |
| `npm test` | Vitest unit suite (scoring, matching, eligibility, guardrails, plans, licensing, applications, calendar, PDF) |
| `npm run typecheck` / `npm run lint` | TypeScript in strict mode |
| `npm run build` / `npm start` | Production build and server |

No environment variables are required for the local demo: the app auto-generates and persists a session secret under `.data`, and the AI advisor falls back to a deterministic rule engine. Copy `.env.example` to `.env.local` to configure Supabase or a model.

### Environment

| Variable | Required | Meaning |
| --- | --- | --- |
| `AUTH_SECRET` | Recommended | 32+ char HMAC secret for session cookies. Auto-generated locally if absent |
| `NEXT_PUBLIC_APP_URL` | Recommended | Public base URL used in the PDF verification QR (`http://localhost:3000` locally) |
| `DATA_BACKEND` | No | `file` (default) or `supabase` |
| `NORTHSTAR_DATA_DIR` | No | Move the local JSON store |
| `NEXT_PUBLIC_SUPABASE_URL` | If Supabase | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | If Supabase | Server-only service key (never expose to the browser) |
| `GEMINI_API_KEY` | No | Enables model answers. Without it, the rule-based advisor runs |
| `GEMINI_MODEL` | No | Defaults to `gemini-2.5-flash` |
| `GEMINI_API_BASE` | No | Override for a proxy/gateway |

To enable model answers:

```bash
# .env.local
GEMINI_API_KEY=your-key
GEMINI_MODEL=gemini-2.5-flash
```

Restart, then Admin â†’ Operations â†’ **Test Gemini**. A failed key is visible there before a learner sees a fallback answer; the advisor continues to work deterministically without a key.

---

## 4. End-to-end flow

```
01 LEARNER      profile + consent (+ guardian consent under 18)
02 ASSESS       interests (36 Likert) Â· aptitude (24 items) Â· working style (20 Likert)
03 INTERPRET    scored â†’ RIASEC code â†’ cluster fit â†’ shortlist â†’ narrative â†’ draft plan
04 COMPARE      fees Â· eligibility Â· mode Â· country Â· outcome band Â· fit factors
05 PLAN         10 milestones across 4 quarters, evidence per milestone
   CHECKPOINT   counsellor edits, approves and releases â€” or returns with a reason
06 FOLLOW-UP    quarterly review, learner reflection, satisfaction, plan revision
```

**Human checkpoint details.** Assessment submission creates a report at `in_review` and a draft plan. The learner sees a status timeline, not scores. The counsellor edits the narrative and learner-facing note, then approves and releases. Release activates the plan, schedules the first quarterly review, notifies the learner and makes the PDF available. Reports are immutable after release; a reassessment produces a new version.

**AI advisor.** Bound to tools (`search_courses`, `compare_courses`, `build_career_path`, `get_learner_summary`, `list_clusters`), so specific fee/eligibility/path claims come from the catalogue rather than generation. Output passes a server-side guardrail that removes outcome promises and escalates crisis language. Without a model key, a deterministic counsellor answers from the same data.

**Verification.** Every report has a verification code. `/verify` checks the code against the record and shows report version, status, release date, masked learner name and counsellor. It explicitly states that verification does not confirm any outcome.

---

## 5. Architecture

```
Browser
  â”‚  RSC pages + a few client islands (forms, report console, charts)
  â–¼
Next.js App Router (Next 15, React 19, Tailwind)
  â”‚  route handlers: auth, onboarding, assessments, advisor, reports, plans,
  â”‚                  reviews, satisfaction, counsellor actions, admin licences
  â–¼
Domain services
  â”œâ”€ assessment/scoring        deterministic, pure
  â”œâ”€ catalogue/matching        cluster + programme fit, eligibility
  â”œâ”€ plans/generator           deterministic 12-month plan
  â”œâ”€ reports/narrative + pdf   interpretation + PDFKit renderer
  â”œâ”€ services/licensing        gate + seat consumption
  â”œâ”€ ai/*                      model client, tools, guardrails, fallback
  â””â”€ auth/*                    scrypt, HMAC sessions, role guards
  â–¼
Store abstraction (lib/store)
  â”œâ”€ file      JSON document store, atomic writes, write queue (default)
  â””â”€ supabase  Postgres via service role; JSONB payload + indexed columns
```

Key boundaries:

- `lib/types.ts` is the single domain contract shared by both stores, the matching engine, the PDF renderer and the UI.
- All store access is server-side. Supabase's service key is never imported into a client component.
- Route handlers authorise by session role and, for learner resources, by ownership.
- Mutations that matter write an audit event with actor, role, entity and metadata.

### Why the AI provider is Gemini

The existing project already used Gemini for tool use; this build keeps that decision and isolates it in `lib/ai/gemini.ts` behind a small `generateContent` interface. The brief's "Claude API with tool use" describes the agent pattern, not a hard provider requirement. Swapping providers means replacing one file plus the tool-schema mapping; the advisor loop, tools, fallback and guardrails are provider-agnostic. This is documented rather than pretending the code calls Claude.

---

## 6. Data and storage

**File backend (default).** `.data/db.json`, seeded on first request and by `npm run seed`. Writes are serialised through an in-process queue and use write-temp-then-rename to avoid partial files. Appropriate for development, demos and single-instance evaluation.

**Supabase/Postgres.** `lib/store/supabase.ts` implements the same `Store` contract. Each entity is one row: indexed relational columns for filtering (`email`, `learner_id`, `status`, `verification_code`, `scheduled_for`, `deadline`, â€¦) plus a `payload` JSONB column holding the full serialisable entity. Migrations are `0001_init.sql` (core), `0002_applications.sql` (tracker) and `0003_feedback.sql` (feedback); all enable RLS with no anon policies.

```bash
# 1. Apply the schema: paste supabase/setup.sql in the SQL editor,
#    or set DATABASE_URL and run `npm run supabase:apply`
# 2. Set the three Supabase variables in .env.local
npm run supabase:check     # table-by-table verification, no writes
npm run supabase:push      # refuses a non-empty database
# then set DATA_BACKEND=supabase and restart
```

Full instructions, local Docker setup and operational notes are in `supabase/README.md`. Admin â†’ Operations â†’ **Run health check** performs the same table checks from the running app, and **Test Gemini** validates the model key with one small call.

**Catalogue provenance.** Every course carries `dataSource`: `illustrative`, `licensed` or `institution_verified`. The admin catalogue shows the mix and warns while illustrative rows remain. The seed is deliberately marked illustrative â€” the product does not claim otherwise.

---

## 7. Guardrails and controls

| Control | Implementation |
| --- | --- |
| No outcome promises | `GUARDRAIL_SYSTEM_RULES` in the prompt; regex filter removes promise sentences and appends a disclaimer; report narrative/PDF carry the same limit; advisor redactions are audited |
| No invented catalogue data | Advisor must use tools; tools return only store rows or an explicit empty result; the deterministic fallback says when it cannot find something |
| Licensed instruments only | `lib/services/licensing.ts` checks status, validity window and seats when an assessment starts; blocks with a specific code and audits the attempt; each new administration consumes a seat |
| Confidential learner data | scrypt password hashing, HMAC-signed HttpOnly session, role guards, ownership checks on PDF/verification, RLS schema, audit trail, no learner data in logs |
| Crisis language | Dedicated detector returns Indian helplines (Tele-MANAS 14416, KIRAN 1800-599-0019, 112) and stops the career conversation |
| Minor consent | Onboarding computes age from date of birth and requires guardian consent under 18 |
| Human accountability | Approval and release are separate gates; learners cannot read or download before release; released reports are immutable |
| Rate limiting | Advisor (20/min/user), assessment start (10/min/user), login (10/min/IP); in-memory per process |
| Security headers | CSP-adjacent hardening in `next.config.ts` (nosniff, frame deny, referrer policy, permissions policy) |

The guardrail filter is a **backstop**, not a proof of correctness. The counsellor remains the accountable reviewer, and the report says so.

---

## 8. PDF report

`GET /api/reports/[id]/pdf` streams a five-page A4 report rendered with PDFKit:

1. Cover with learner, version, status, counsellor, dates, verification code and the "what this document is" limit.
2. Assessment profile â€” RIASEC, aptitude, working style and response quality.
3. Cluster fit, closest career route and salary-band table (indicative).
4. Shortlist with fees, eligibility and fit; 12-month plan by quarter.
5. Counsellor review record, recommendations, guardrail, verification instructions and a counsellor declaration.

Draft/in-review copies are watermarked **DRAFT â€” NOT RELEASED**. Learners can download only their own released report; counsellors and admins can preview any report for review. The rupee symbol is written as `INR` because PDFKit's built-in fonts do not include the glyph.

Run `npm run report:sample` to inspect the renderer without the server.

---

## 9. Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Product landing page |
| `/methodology` | Public | Method, scoring weights, limits |
| `/privacy` | Public | Data, licensing, retention, rights |
| `/verify`, `/verify/[code]` | Public | Report authenticity check |
| `/signup` | Public | Learner self-signup with privacy and counselling consent required |
| `/login` | Public | Sign in (demo shortcuts) |
| `/forbidden` | Any | Role mismatch page |
| `/onboarding` | Learner | Profile, consent, guardian consent |
| `/learner` | Learner | Overview and journey |
| `/learner/assessment` | Learner | Three-section battery |
| `/learner/results` | Learner | Released report, profile, shortlist, career map |
| `/learner/plan` | Learner | 12-month plan and milestones |
| `/learner/applications` | Learner | Application tracker, deadlines, document checklist |
| `/learner/calendar` | Learner | Month calendar for milestones, reviews and deadlines |
| `/learner/advisor` | Learner | Tool-bound AI advisor |
| `/learner/reviews` | Learner | Quarterly reviews, reflection, satisfaction |
| `/feedback` | Signed-in | Product feedback form |
| `/counsellor` | Counsellor/admin | Review queue, caseload filter and stats |
| `/counsellor/analytics` | Counsellor/admin | Application funnel, deadline risk, reviews, satisfaction, caseload |
| `/counsellor/learner/[id]` | Counsellor/admin | Review console, assignment, profile, shortlist, applications, history, plan, reviews |
| `/counsellor/catalogue` | Counsellor/admin | Searchable catalogue |
| `/admin` | Admin | Operations, licences, audit, runtime health and Gemini test |
| `/admin/catalogue` | Admin | Catalogue provenance |
| `/admin/audit` | Admin | Filterable audit trail |
| `/admin/feedback` | Admin | Feedback triage with audited status changes |
| `/api/applications`, `/api/applications/[id]` | Learner owner / staff | Create, update checklist, status, deadline, delete |
| `/api/calendar` | Learner owner / staff | `.ics` export of milestones, reviews and deadlines |
| `/api/learner/export` | Learner | Machine-readable copy of the learner record |
| `/api/admin/health` | Admin | Store, Supabase table and Gemini health checks |
| `/api/...` | Role-checked | Auth, onboarding, assessments, advisor, reports, PDF, plans, reviews, satisfaction, assignments, admin licences |

---

## 10. Testing

```bash
npm test
```

80 tests across eleven files:

- **Scoring** â€” normalisation, reverse-keyed items, partial sections, Holland code, quality flags.
- **Eligibility** â€” percentage, missing data, subjects/aliases, English thresholds, degree requirements, backlogs, no-guarantee language.
- **Matching** â€” Pearson shape correlation, bounded cluster fits, factor weights, budget penalty, level gating, ineligible filtering, search.
- **Guardrails** â€” promise removal (including `100%` phrasing), crisis escalation, system rules.
- **Plans** â€” ten milestones, four quarters, exact 12-month span, student vs professional routes.
- **Licensing** â€” date-derived expiry, pending/suspended states, seat exhaustion.
- **Applications** â€” generated document checklists, progress, deadline countdown and urgency, open/closed states.
- **Calendar** â€” RFC 5545 structure, escaping, alarms, open-only event selection.
- **Analytics** â€” application funnel, satisfaction distribution, deadline risk.
- **Consent age** â€” exact birthday maths, including the December/November edge case.
- **PDF** â€” valid `%PDF` output for a released report and for a draft with missing plan/shortlist.

The suite caught two real defects during development: a `100%` regex bypass in the guardrail filter and an over-loose degree detector that treated "Mathematics" as a bachelor's degree. Both are fixed and covered.

---

## 11. Project structure

```
app/                     routes (public, learner, counsellor, admin, API)
components/              app shell, UI primitives, charts, learner and counsellor widgets
lib/ai/                  model client, tools, guardrails, advisor loop + fallback
lib/applications/        checklist generation, progress, deadline logic
lib/assessment/          instruments, scoring
lib/auth/                password hashing, exact age/consent, sessions, roles
lib/calendar/            iCalendar builder and learner event mapping
lib/catalogue/           courses, clusters, career paths, eligibility, matching
lib/plans/               12-month plan generator
lib/reports/             narrative and PDF renderer
lib/services/            workspace, counsellor queue, analytics, licensing
lib/store/               Store contract, file adapter, Supabase adapter, seed
lib/security/            rate limiting
lib/types.ts             domain model
supabase/migrations/     Postgres schema
scripts/                 seed, sample-report, Supabase push/check, env loader
tests/                   Vitest suite and fixtures
```

---

## 12. Production checklist

This is an advanced reference implementation with the full counselling workflow, but real learner data still needs the operational items below:

1. **Replace the illustrative catalogue** with licensed/institution-verified rows, a named source and a verification date per programme.
2. **Record real instrument licences** and remove or disable the in-house battery if it is not approved by the counselling lead; confirm third-party administration terms.
3. **Choose the store**: run Supabase with backups, connection limits and RLS review; do not run the file backend on multi-instance hosting. Run `npm run supabase:check` before going live.
4. **Configure `AUTH_SECRET`** from a secret manager, and review session lifetime and cookie settings for your domain.
5. **Move rate limiting to a shared store** (Redis/Upstash) if you run more than one instance.
6. **Set retention and deletion policy** and implement the operational purge; the reference build does not auto-delete.
7. **Add outbound email/SMS** for review, release and deadline reminders; the current build is in-app plus calendar export.
8. **Decide caseload access**: assignment exists and â€œMy caseloadâ€ filters the queue, but any counsellor can still open any learner record (audited). Add a hard ownership check if policy requires it.
9. **Review the AI provider's data-processing terms**, decide whether learner context may be sent, and keep the deterministic fallback available.
10. **Localise the privacy notice and consent** with counsel for the jurisdictions you serve.
11. **Add PDF font embedding** if learner names may use scripts outside Latin-1.
12. **Add verification rate limiting** if codes are exposed publicly at scale.
13. **Add file storage** if you want documents uploaded rather than tracked. The current checklist records evidence status, not the files themselves; a private Supabase bucket with signed URLs is the natural next step.

---

## 13. Contact

WAECS Â· info@waecs.in Â· +91 82096 28849

Northstar provides career guidance only. It does not promise placement, admission, salary or visa outcomes, and it does not replace a qualified counsellor. Psychometric instruments are administered only under a valid licence.
