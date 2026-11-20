# Northstar - Career Counsellor Agent
## Project Delivery Report

**Client brief:** WAECS - 06 / Education and Careers - Career Counsellor Agent
**Implementation:** Next.js 15 / React 19 / TypeScript / Tailwind CSS / PostgreSQL (Supabase) / PDFKit
**Report date:** 20 November 2026
**Status:** Application complete and verified; two external integrations are configuration-blocked (Supabase schema, Gemini credential)

---

## 1. Executive summary

Northstar is a working career-counselling platform for learners, counsellors and administrators. It runs the full counselling loop:

**onboarding -> psychometric assessment -> scoring and interpretation -> course/career matching -> comparison -> shortlist -> 12-month plan -> human counsellor review -> release -> application tracking -> quarterly review.**

The product is not a static demo. It includes:

- a seeded catalogue of **40 programmes, 21 career paths and 12 clusters**;
- an **80-item assessment battery** with deterministic scoring;
- a **counsellor review console** with approval/release gates;
- a **PDF counselling report** generated from the actual record;
- an **application tracker** with generated document checklists and deadlines;
- **self-signup** with privacy and counselling consent recorded before the account exists;
- **calendar export** and an in-app month calendar, **data export**, **counsellor assignment** and **caseload analytics**;
- **product feedback** with administrator triage;
- **account settings** with password change, session invalidation, notification inbox and CSV export;
- **instrument licensing enforcement**, crisis handling and outcome-promise guardrails;
- a **redesigned PDF** with a full-cover design, QR verification, profile cards and a RIASEC radar;
- **80 automated tests**, a clean strict TypeScript check and a clean production build.

Two external dependencies are not live yet:

1. **Supabase schema** - the project exists and the keys are valid, but the 16 tables have not been created. A one-paste `supabase/setup.sql` is provided.
2. **Gemini key** - the supplied `AQ.` key is rejected by Google with `401 ACCESS_TOKEN_TYPE_UNSUPPORTED` from Google's own SDK and every API endpoint. The app falls back deterministically and retries on a circuit breaker. A fresh key is required for model answers.

Neither gap is an application-code defect. Everything else is complete and verified.

---

## 2. Brief compliance matrix

| Brief requirement | Status | Evidence |
| --- | --- | --- |
| Run psychometric assessments for interest, aptitude and personality | Complete | `lib/assessment/instruments.ts` - 36 interest, 24 aptitude, 20 personality items; `/learner/assessment` |
| Licensed psychometric tools | Complete control; vendor API contract-dependent | Licence register, validity/seat checks, enforcement at assessment start (`lib/services/licensing.ts`) |
| Turn results into course or career options | Complete | `lib/catalogue/matching.ts`; cluster fit 50/30/20; programme fit 40/20/15/15/10 |
| Course database | Complete (illustrative data) | 40 programmes in `lib/catalogue/courses.ts`; admin provenance view |
| Career path templates | Complete | 21 paths, progression stages, salary bands, skills |
| Labour-market data | Partial: illustrative index only | `CareerPath.demandIndex` / `demandNote`; a licensed feed is a procurement task |
| Compare courses on fees, eligibility and outcomes | Complete | Shortlist comparison, counsellor catalogue, advisor comparison tool |
| Build a career path map with milestones | Complete | `/learner/results` career map + `/learner/plan` |
| 12-month action plan | Complete | `lib/plans/generator.ts` - 10 dated milestones across four quarters |
| Review progress each quarter | Complete | Quarterly reviews, learner reflection, counsellor composer, next review scheduling |
| Counselling report | Complete | Narrative + five-page PDF (`lib/reports/pdf.ts`) |
| Shortlisted courses or roles | Complete | Counsellor-approved shortlist with fit factors and eligibility |
| Learner satisfaction score | Complete | `/learner/reviews#satisfaction`, admin and analytics averages |
| No promise of placement or results | Complete | Prompt rules, regex filter, narrative/PDF/verification disclaimers |
| Student data kept confidential | Complete | scrypt passwords, signed HttpOnly sessions, ownership checks, RLS schema, audit trail |
| Workflow 01-05 and human checkpoint | Complete | Report state machine draft -> in_review -> approved -> released / returned; learners cannot see report/PDF/plan before release |
| Learner onboarding questionnaire | Complete | `/onboarding`, validation, consent, exact age/guardian consent |
| Results and career map screen | Complete | `/learner/results` |
| Counsellor review screen | Complete | `/counsellor` queue and `/counsellor/learner/[id]` console |
| Advisor prompt + rule-based scoring | Complete | `lib/ai/advisor.ts` with deterministic fallback |
| Tools: course search, path builder | Complete | `search_courses`, `compare_courses`, `build_career_path`, `get_learner_summary`, `list_clusters`, `get_application_status` |
| Guardrails: no outcome promises | Complete | System rules + post-generation filter + crisis escalation |
| Integrations: licensed provider, catalogue, profiles/reports | Advisory integration complete | Licence registry + catalogue + profiles/reports; vendor administration API awaits contract |
| Stack: Next.js + Tailwind | Complete | Next 15.5, React 19, Tailwind 3 |
| Data: Postgres (Supabase) | Code complete; schema not applied | Adapter, migrations, RLS, seed/check/apply scripts |
| AI: tool-use model | Complete; credential rejected | Gemini client with tool use and fallback |
| PDF report generator | Complete | `GET /api/reports/[id]/pdf` |
| Build steps: scaffold, prompt/tools/guardrails, connect/pilot | Complete | Working app, tests and operations tooling |

**Result:** every product requirement is implemented. The only partial items are external data/credentials: a licensed labour-market feed, a third-party psychometric vendor API, the Supabase schema and a working model key.

---

## 3. Delivered functionality

### 3.1 Learner

- Self-signup with required privacy-notice and counselling-terms acceptance; consent version and timestamp are stored before the account is created.
- Onboarding with validation, consent versioning and guardian consent under 18.
- Assessment with save/resume, three sections and a response-quality signal.
- Results: interest/aptitude/personality charts, cluster fit, shortlist comparison, career map and report.
- Human checkpoint: status timeline until a counsellor releases the report.
- 12-month plan with evidence per milestone and progress.
- **Application tracker**: status, deadline, generated document checklist, notes, submission/decision dates.
- **In-app month calendar** for milestones, reviews and deadlines, with `.ics` export.
- AI advisor (tool-bound; deterministic fallback).
- Quarterly reviews, reflection and satisfaction.
- **Product feedback** form.
- **Account settings**: change password, view privacy acceptance, download data and sign out other sessions.
- **Notification inbox** with mark-all-read and per-item links.
- **CSV export** of the application tracker.
- Machine-readable data export.

### 3.2 Counsellor

- Prioritised review queue with "My caseload" filter and application/deadline risk.
- Full learner record: profile, scores, shortlist, applications, report history, plan and reviews.
- Report review console: edit narrative/notes, save, approve, release, return with reason.
- Shortlist management and application monitoring.
- Quarterly review composer with next-quarter scheduling.
- **Analytics**: application funnel, deadline risk, reviews due, stage distribution, satisfaction, caseload by counsellor.
- **Report version history** with PDF access.

### 3.3 Administrator

- Operations dashboard with learner, review, assessment, application and satisfaction KPIs.
- Instrument licence register with status/date/seat enforcement.
- Catalogue provenance and career-path sources.
- Filterable audit trail.
- **Feedback triage** with audited open/reviewing/resolved statuses.
- Runtime health check for the store, every Supabase table and Gemini.
- Admin licence update API with audit.

### 3.4 Public

- Product landing page.
- Method and limits.
- Privacy notice, licensing and retention.
- Report verification by code.

---

## 4. Architecture

```
Browser
  |  React Server Components + small client islands
  v
Next.js App Router (Next 15, React 19, Tailwind)
  |  route handlers: auth, onboarding, assessments, advisor, reports,
  |                  applications, calendar, export, reviews, staff actions
  v
Domain services
  |- assessment/scoring     pure, deterministic
  |- catalogue/matching     cluster + programme fit, eligibility
  |- applications           checklist generation, deadlines
  |- plans/generator        12-month plan
  |- reports/narrative+pdf  interpretation + PDFKit renderer
  |- calendar               RFC 5545 export
  |- services/analytics     funnel, risk, caseload
  |- services/licensing     gate + seat consumption
  |- ai/*                   model client, tools, guardrails, fallback
  `- auth/*                 scrypt, HMAC sessions, roles, exact age
  v
Store contract (lib/store)
  |- file      atomic JSON store (default until Supabase schema exists)
  `- supabase  Postgres adapter: indexed columns + JSONB payload
```

Key decisions:

- One domain model (`lib/types.ts`) shared by both stores, matching, PDF, calendar and UI.
- All database access is server-side; the Supabase service key is never imported into a client component.
- Route handlers authorise by role and, for learner resources, by ownership.
- Mutations write an audit event with actor, role, entity and metadata.

---

## 5. Data model

| Entity | Purpose |
| --- | --- |
| User, Learner | Account, role, profile, consent, assigned counsellor |
| Assessment | Responses, timings, scores, quality, instrument version |
| Course, CareerPath, CareerCluster | Catalogue, eligibility, outcomes, progression, cluster weights |
| ShortlistItem | Ranked programme with fit factors and counsellor status |
| Application | Status, deadline, checklist, submission/decision dates, notes |
| Plan, Milestone | 12-month plan, quarter, evidence, status |
| Report | Version, narrative, review/release state, verification code, notes |
| QuarterlyReview | Schedule, progress rating, notes, next steps, reflection |
| Satisfaction | Report rating and comment |
| Feedback | Category, message, optional rating/page, audited triage status |
| Licence | Instrument, provider, validity, seats, status |
| AuditEvent, Notification, AdvisorMessage | Governance and communication |

Storage: JSON rows with indexed relational columns plus a full `payload` JSONB column in Postgres. Migrations: `0001_init.sql` (15 tables), `0002_applications.sql` and `0003_feedback.sql`.

---

## 6. Security and guardrails

| Control | Implementation |
| --- | --- |
| No outcome promises | Prompt rules, regex removal of guarantee/100% sentences, disclaimers in narrative, PDF and verification |
| No invented catalogue data | Advisor tools return only store rows; empty results are stated |
| Licensed instruments only | Status, validity window and seats checked at assessment start; blocked attempts audited |
| Confidential data | scrypt, HMAC HttpOnly cookie, role/ownership guards, RLS-ready schema, no learner data in logs |
| Crisis language | Tele-MANAS 14416, KIRAN 1800-599-0019, 112; career conversation stops |
| Minor consent | Exact birthday age calculation, guardian consent enforced |
| Human accountability | Separate approve/release gates; released reports immutable; reassessment creates a new version |
| Rate limiting | Advisor, assessment start and login |
| Security headers | nosniff, frame deny, referrer policy, permissions policy |
| Data rights | Machine-readable learner export; deletion request handled by administrators |

---

## 7. Verification evidence

| Check | Result |
| --- | --- |
| `npm run typecheck` | Clean (strict TypeScript) |
| `npm test` | **80 tests / 11 files passing** |
| `npm run build` | Clean production build, all routes compiled |
| Live route audit | All 20+ pages return 200 for the correct role; protected routes redirect |
| PDF | Valid `%PDF` output for released and draft reports |
| Release flow | Counsellor approve -> release -> learner sees report/PDF/plan; other learner blocked |
| Licence gate | Suspending licence blocks assessment start (`licence_suspended`), restoring allows it, both audited |
| Applications | Create, checklist toggle, status update, deadline, calendar, export tested live |
| Signup | Consent required, duplicate email rejected, account -> onboarding tested live |
| Feedback | Submit as learner, admin triage page and status API tested live |
| Account security | Password change invalidates old cookies, old password rejected, new password accepted |
| Notifications | Inbox page and mark-all-read API tested live |
| CSV export | Application export returns `text/csv` with checklist columns |
| Calendar | Month page renders and `.ics` endpoint returns valid events |
| PDF | Inline and attachment modes tested; cover, QR, cards and radar render correctly |
| Assignment | Assign/restore counsellor tested live; notification and audit written |
| Analytics | Funnel/risk functions unit-tested; page renders from live store |
| Supabase | URL/keys reachable; **16 tables missing** (verified, not a false positive) |
| Gemini | Official SDK + REST + Vertex + OpenAI-compatible all reject the supplied AQ key with 401/403 |

---

## 8. Current blockers

### 8.1 Supabase schema not applied

The project `slaubgkycdwbtwybqkgq` is reachable, but every table returns:

```
PGRST205 - Could not find the table 'public.users' in the schema cache
```

The service-role REST key cannot execute DDL. Fix:

1. Open the project SQL editor.
2. Paste `supabase/setup.sql` (all three migrations combined).
3. Run it.
4. `npm run supabase:check` -> `npm run supabase:push` -> set `DATA_BACKEND=supabase`.

### 8.2 Gemini credential rejected

The supplied key fails with Google's own SDK:

```
401 ACCESS_TOKEN_TYPE_UNSUPPORTED
```

Tested: `@google/genai`, `x-goog-api-key`, `?key=`, Bearer, Token, Vertex AI endpoint, OpenAI-compatible endpoint, v1 and v1beta. Google's forum documents this as an `AQ.` key provisioning issue. The app:

- keeps the key configured;
- retries after a 10-minute circuit breaker;
- answers deterministically meanwhile;
- exposes `npm run gemini:check` and an admin Test Gemini action.

A fresh AI Studio key in a new project, or a Vertex AI service account, is required.

---

## 9. Known limitations / production roadmap

1. Replace illustrative catalogue rows with licensed/institution-verified data and verification dates.
2. Confirm instrument licensing and connect a third-party provider API if required.
3. Apply Supabase migrations; enable backups/PITR; move to a shared rate-limit store.
4. Add outbound email/SMS for release and deadline reminders.
5. Decide whether assignment should restrict access; it currently filters but does not block.
6. Add document upload (private bucket + signed URLs) if evidence files are needed.
7. Set and implement retention/deletion policy; the app exports data but does not auto-delete.
8. Localise privacy/consent with counsel.
9. Embed a Unicode PDF font for non-Latin names.
10. Rate-limit public report verification.

---

## 10. How to run

```bash
npm install
npm run seed
npm run dev
```

Production checks:

```bash
npm run typecheck
npm test
npm run build
npm start
```

Demo accounts (password `Northstar#2026`):

| Role | Email |
| --- | --- |
| Learner (released report, applications) | `aarav@demo.northstar.in` |
| Learner (report in review) | `diya@demo.northstar.in` |
| Counsellor | `meera@demo.northstar.in` |
| Administrator | `admin@demo.northstar.in` |

---

## 11. Change log for this engagement

- Completed counsellor and admin workspaces that were referenced but missing.
- Added PDF report generator, verification pages and public trust pages.
- Added Supabase adapter, two migrations, seed/check/apply/push tooling.
- Added application tracker, document checklists, deadlines and calendar export.
- Added self-signup with mandatory privacy/counselling consent, in-app month calendar, product feedback and admin triage.
- Added account settings with password change, session invalidation, notification inbox and CSV application export.
- Redesigned the PDF report with a full cover, QR verification, profile cards and a RIASEC radar.
- Added counsellor assignment, caseload analytics and report version history.
- Added learner data export and exact-age guardian consent.
- Fixed: `100%` guardrail bypass, over-loose degree detection, premature approved-report visibility, hardcoded counsellor names, Supabase HEAD false positives, missing draft plan in seed.
- Added 80-test suite, README and this report.

---

*Northstar provides career guidance only. It does not promise admission, placement, salary or visa outcomes, and it does not replace a qualified counsellor. Psychometric instruments are administered only under a valid licence.*
