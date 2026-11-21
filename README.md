# Northstar — Career Counsellor Agent

An end-to-end career-counselling workspace built for **WAECS Brief 06: Education and Careers**. Northstar helps learners understand their interests, aptitude and working style; explore suitable courses and career paths; compare programmes; and work towards a structured 12-month action plan.

A key design principle is **human accountability**: an assessment report is reviewed and approved by a counsellor before it is released to the learner.

> **Project status and data note**
>
> This repository contains a working reference implementation of the learner, counsellor and admin workflows. The included course catalogue and career-path templates are illustrative sample data; replace them with institution-verified or appropriately licensed information before real-world deployment. Psychometric instruments must only be administered where the necessary permissions or licences are in place.

## Live Demo

**Application:** [Open Northstar Career Counsellor Agent](https://career-counsellor-agent.netlify.app/)

The demo is currently exposed from the development environment using VS Code port forwarding. The link is available while the local application and port-forwarding session remain active; it may change when the forwarding session is restarted.

---

---

## Contents

- [Key capabilities](#key-capabilities)
- [End-to-end counselling workflow](#end-to-end-counselling-workflow)
- [Why Gemini is used](#why-gemini-is-used)
- [Architecture](#architecture)
- [Technology stack](#technology-stack)
- [Getting started](#getting-started)
- [Environment configuration](#environment-configuration)
- [Database setup](#database-setup)
- [Useful commands](#useful-commands)
- [Project structure](#project-structure)
- [Security, safety and accountability](#security-safety-and-accountability)
- [Testing and verification](#testing-and-verification)
- [Known limitations and production considerations](#known-limitations-and-production-considerations)

---

## Key capabilities

### Learner experience
- **Onboarding and consent:** captures learner profile information and required privacy/counselling consent; guardian consent is handled for learners under 18.
- **Structured assessment:** includes interest, aptitude and working-style sections.
- **Assessment interpretation:** calculates RIASEC interest indicators, aptitude scores and working-style indicators.
- **Course and career discovery:** maps assessment results to course clusters, programmes and career paths.
- **Programme comparison:** supports comparison of fees, eligibility and other catalogue attributes.
- **AI career advisor:** answers career-related questions and can invoke application tools to search and compare courses or build a career path.
- **Personalised planning:** creates a 12-month action plan with milestones.
- **Reports and follow-up:** provides counselling reports, application tracking, calendar events, quarterly reviews and feedback.

### Counsellor experience
- Review queue and learner caseload views.
- Access to assessment interpretation, learner profile and recommended options.
- Ability to edit the counselling narrative and learner-facing note.
- Approve and release reports, or return them with a reason.
- Manage shortlists, applications, reviews and learner progress.
- View caseload analytics and report history.

### Admin experience
- Catalogue and data-provenance management.
- Psychometric licence register and enforcement.
- Audit trail and feedback triage.
- Runtime health checks, including database and Gemini connectivity checks.

---

## End-to-end counselling workflow

```text
LEARNER ONBOARDING
  Profile details + privacy and counselling consent
              |
              v
ASSESSMENT
  Interests + aptitude + working style
              |
              v
SCORING AND INTERPRETATION
  Assessment scores -> RIASEC profile -> course-cluster fit
                    -> programme shortlist -> career narrative
              |
              v
EXPLORATION
  Compare fees, eligibility and programme details
  Ask the AI advisor questions using the application catalogue
              |
              v
PERSONALISED PLAN
  Draft counselling report + 12-month milestone plan
              |
              v
HUMAN COUNSELLOR CHECKPOINT
  Review and edit -> Approve and release
                 -> OR return for changes
              |
              v
FOLLOW-UP
  Released report + applications + calendar + quarterly reviews
```

### Human review checkpoint

Submitting an assessment creates a report for counsellor review. The learner sees the report status while it is under review, but cannot access the final report or its PDF until the counsellor approves and releases it. The counsellor can revise the narrative, approve the report, or return it with a reason. A released report is treated as a versioned record; a later reassessment creates a new report version.

### AI advisor and application tools

The advisor is connected to application-level tools, including:

- `search_courses`
- `compare_courses`
- `build_career_path`
- `get_learner_summary`
- `list_clusters`

These tools ground course, fee, eligibility and career-path details in the application's catalogue and learner data rather than relying only on free-form model generation. The generated response is checked by server-side guardrails. A deterministic advisor fallback is available when Gemini is not configured or cannot be reached.

---

## Why Gemini is used

Northstar uses the **Google Gemini API** (`gemini-2.5-flash` by default) for its conversational career-advisor capability.

The choice is based on the existing project integration: Gemini was already used for model interaction and tool calling, so the implementation retains that working provider rather than introducing a second provider and additional configuration. Gemini provides a model interface for natural-language career guidance while the application's own tools remain responsible for retrieving catalogue information and performing structured actions.

The brief's reference to **Claude API with tool use** describes the agent capability and interaction pattern. This implementation uses Gemini for that model layer; it does not claim to call Claude.

The provider integration is isolated in `lib/ai/gemini.ts` behind a small `generateContent` interface. The advisor loop, tool definitions, guardrails and deterministic fallback are kept separate from the provider-specific request code. This makes it possible to replace or add a model provider by adapting the model client and tool-schema mapping, without redesigning the counselling workflow.

**Why this separation matters**
- The language model handles conversational interpretation and response generation.
- Application tools retrieve authoritative information from the local catalogue and learner records.
- Deterministic application logic performs scoring, matching and plan generation.
- Guardrails check model output and the counsellor remains responsible for report approval.

A valid Gemini API key is optional for running the core application. Without one, the deterministic advisor fallback remains available.

---

## Architecture

```text
                         Browser
                            |
                            v
             Next.js App Router (Next.js 15)
                 React 19 + TypeScript
                            |
                  Route handlers / APIs
                            |
                            v
                    Domain services
          +-----------------+------------------+
          |                 |                  |
     Assessment         Catalogue          Reports / Plans
      scoring            matching          narrative / PDF
          |                 |                  |
          +-----------------+------------------+
                            |
                      AI advisor layer
                +-----------+------------+
                |           |            |
             Gemini       Tool calls   Guardrails
                |           |            |
                +-----------+------------+
                            |
                     Store abstraction
                      /            \
                     /              \
             JSON file store     Supabase / Postgres
```

### Main architectural boundaries

- `lib/types.ts` defines the shared domain contracts used by the application services, storage adapters and UI.
- Assessment scoring, catalogue matching and plan generation are deterministic application logic.
- AI model access is isolated from the advisor tools and guardrails.
- All data-store access is performed server-side.
- The Supabase service-role key is not exposed to client-side code.
- Route handlers enforce session roles and learner-resource ownership checks.
- Important mutations create audit events containing the actor, role, entity and relevant metadata.

---

## Technology stack

| Area | Technology | Purpose |
|---|---|---|
| Application framework | Next.js 15 | App Router, server rendering and route handlers |
| UI | React 19, TypeScript | Component-based interface and typed application code |
| Styling | Tailwind CSS | Responsive application styling |
| Database | Supabase / PostgreSQL | Hosted relational persistence |
| Local persistence | JSON file store | Zero-setup local development and demo mode |
| AI integration | Google Gemini API | Conversational career-advisor responses and tool-use flow |
| AI safety | Application tools and server-side guardrails | Grounding, response checks and escalation behaviour |
| Testing | Vitest, TypeScript | Unit tests and static type checking |
| PDF reports | PDFKit | Counselling report generation |
| Calendar export | iCalendar (`.ics`) | Export of milestones, reviews and deadlines |

---

## Getting started

### Prerequisites

- Node.js **20.11 or later**
- npm
- Git
- A Supabase project for hosted database mode (optional for local file-store mode)
- A Google Gemini API key for model-generated advisor responses (optional)

### 1. Clone the repository

```bash
git clone https://github.com/rameshthanikonda/career-counsellor-agent.git
cd career-counsellor-agent
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a local environment file.

**Windows PowerShell**
```powershell
Copy-Item .env.example .env.local
```

**macOS / Linux**
```bash
cp .env.example .env.local
```

Edit `.env.local` and add the values for the services you intend to use. See [Environment configuration](#environment-configuration).

### 4. Choose a storage mode

For a quick local run, use the JSON file store:

```env
DATA_BACKEND=file
```

Then seed the demo data and start the application:

```bash
npm run seed
npm run dev
```

For hosted persistence, configure Supabase as described in [Database setup](#database-setup), then set:

```env
DATA_BACKEND=supabase
```

### 5. Open the application

Visit:

```text
http://localhost:3000
```

---

## Environment configuration

| Variable | Required | Description |
|---|---|---|
| `AUTH_SECRET` | Recommended | Secret used to sign session cookies. Use a long, random value outside local development. |
| `NEXT_PUBLIC_APP_URL` | Recommended | Public application URL used in report verification links/QR codes. |
| `DATA_BACKEND` | No | Storage adapter: `file` or `supabase`. |
| `NORTHSTAR_DATA_DIR` | No | Optional location for the local JSON data store. |
| `NEXT_PUBLIC_SUPABASE_URL` | For Supabase | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | For Supabase | Server-side service-role key. Keep it secret and never expose it to browser code. |
| `GEMINI_API_KEY` | Optional | Enables Gemini-powered advisor responses. |
| `GEMINI_MODEL` | Optional | Gemini model name; defaults to `gemini-2.5-flash`. |
| `GEMINI_API_BASE` | Optional | Optional API base override for a compatible proxy or gateway. |

### Enable Gemini-powered responses

Add the following to `.env.local`:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

Restart the development server after changing environment variables. The admin Operations area includes a Gemini connectivity test. If the key is missing, invalid or unavailable, the application can continue using the deterministic advisor fallback.

> **Secret handling:** Never commit `.env.local`, API keys or Supabase service-role credentials. Use `.env.example` for variable names and placeholder values only. If a key has been exposed, revoke it and create a replacement.

---

## Database setup

### Supabase / PostgreSQL

The repository includes the database setup SQL and migrations under `supabase/`.

1. Create a Supabase project.
2. Apply `supabase/setup.sql` in the Supabase SQL Editor, or use the migration workflow described in `supabase/README.md`.
3. Configure `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
4. Set `DATA_BACKEND=supabase`.
5. Check the database connection:

```bash
npm run supabase:check
```

To initialise a fresh database with the sample dataset:

```bash
npm run supabase:push
```

Review the script and the target database before running it. The push script is intended for an empty database.

To apply migrations using a direct database connection, configure `DATABASE_URL` as described in `supabase/README.md`, then run:

```bash
npm run supabase:apply
```

### Local JSON file store

The file backend is useful for local development and demonstrations without a hosted database:

```env
DATA_BACKEND=file
```

Seed and run:

```bash
npm run seed
npm run dev
```

The local data is stored under `.data/`. It is development/demo data and should not be committed.

---

## Useful commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the local development server |
| `npm run seed` | Seed/reset the local JSON store |
| `npm run typecheck` | Run TypeScript checks |
| `npm run lint` | Run lint checks |
| `npm test` | Run the Vitest test suite |
| `npm run build` | Create a production build |
| `npm start` | Start the production server |
| `npm run supabase:check` | Verify Supabase connectivity and required tables |
| `npm run supabase:push` | Initialise a fresh Supabase database with the sample dataset |
| `npm run supabase:apply` | Apply SQL migrations using `DATABASE_URL` |
| `npm run report:sample` | Generate a sample PDF report under `reports/` |

---

## Project structure

```text
app/
  public pages, learner pages, counsellor pages, admin pages and API routes

components/
  shared UI, learner workflows, counsellor tools and admin components

lib/
  ai/
    Gemini client, advisor loop, tool definitions and guardrails
  applications/
    application checklist and deadline logic
  assessment/
    assessment instruments and scoring
  auth/
    password hashing, sessions, consent and role checks
  calendar/
    calendar event mapping and iCalendar export
  catalogue/
    courses, clusters, career paths, eligibility and matching
  plans/
    12-month action-plan generation
  reports/
    report narrative and PDF generation
  services/
    workspace, counsellor queue, analytics and licensing
  store/
    store contract, JSON adapter, Supabase adapter and seed logic
  security/
    rate limiting
  types.ts
    shared domain types

supabase/
  setup SQL and database migrations

scripts/
  seed, report generation and Supabase utility scripts

tests/
  unit tests and test fixtures

reports/
  generated sample reports and project documentation
```

---

## Security, safety and accountability

| Area | Implementation |
|---|---|
| Report release | Reports move through review states; learners cannot access the final report before counsellor release. |
| Outcome claims | Advisor and report guardrails prevent unsupported promises about admission, placement, salary or other outcomes. |
| Catalogue grounding | Advisor tools use application catalogue records for course and eligibility details rather than inventing catalogue entries. |
| Psychometric licensing | A licence register checks instrument status, validity and available seats before assessment administration. |
| Learner privacy | Password hashing, signed HttpOnly sessions, role checks and learner ownership checks protect account and learner data. |
| Auditability | Important actions are recorded in the audit trail. |
| Crisis language | Dedicated detection interrupts the career-advice flow and surfaces relevant support resources. |
| Minor consent | Guardian consent is required for learners under 18. |
| Data provenance | Catalogue entries identify whether information is illustrative, licensed or institution-verified. |

The AI advisor is an assistive feature, not an authority on a learner's future. The counsellor remains accountable for reviewing and releasing counselling reports.

---

## Testing and verification

Run the test suite:

```bash
npm test
```

Run the main project checks:

```bash
npm run typecheck
npm run lint
npm run build
```

The tests cover core application logic, including:

- Assessment scoring, normalisation, reverse-keyed items and response-quality checks.
- Eligibility rules and missing-information handling.
- Course-cluster and programme matching.
- AI response guardrails and crisis escalation.
- 12-month action-plan generation.
- Psychometric licence validity and seat enforcement.
- Application checklist and deadline logic.
- Calendar event generation and iCalendar formatting.
- Counsellor/admin analytics.
- Consent-age calculations.
- PDF generation for released and draft reports.

---

## Known limitations and production considerations

This repository is a reference implementation and should be reviewed before deployment with real learner data.

1. **Catalogue accuracy:** replace illustrative courses, career paths, fee information and demand indicators with institution-verified or licensed sources.
2. **Psychometric permissions:** verify the legal and contractual right to administer each instrument; configure the licence register accordingly.
3. **AI data processing:** review the Gemini API data-processing terms and decide what learner information may be sent to the model. Minimise personal data in prompts.
4. **Database operations:** use managed backups, review Row Level Security policies and apply production access controls.
5. **Secrets and sessions:** use a secret manager for production credentials and review session lifetime and cookie settings.
6. **Rate limiting:** use a shared rate-limit store for multi-instance deployments; in-process limits are not shared across instances.
7. **Retention and deletion:** define learner-data retention, export and deletion procedures appropriate to the institution and jurisdiction.
8. **Notifications and uploads:** outbound email/SMS and secure document uploads may require additional provider integrations.
9. **Operational review:** review privacy notices, consent language, access policies and incident procedures before onboarding real learners.

---

## Responsible-use statement

Northstar provides structured career exploration and counselling support. It does **not** guarantee admission, placement, salary, employment or visa outcomes, and it does not replace a qualified counsellor. Assessment outputs should be interpreted in context and reviewed by an appropriately qualified professional. Use psychometric instruments only with the required permissions or licences.
