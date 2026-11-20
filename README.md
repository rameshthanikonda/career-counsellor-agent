Career Counsellor Agent
A web-based career counselling platform that helps learners explore suitable courses and career paths through structured assessments, recommendations, and personalized planning. It also supports counsellors with a review workflow so that learner-facing reports are checked by a human counsellor before release.
Features
- Learner onboarding: Collects learner profile details and required consent.
- Career assessment: Includes interest, aptitude, and working-style questions.
- Assessment results: Calculates RIASEC interests, aptitude scores, and working-style indicators.
- Course and career recommendations: Matches learner profiles with course clusters, programmes, and career paths.
- Course comparison: Displays programme information such as fees and eligibility.
- AI career advisor: Answers career-related questions using application tools and catalogue information. A deterministic fallback is available when a valid AI API key is not configured.
- Personalized action plan: Generates a 12-month plan with milestones.
- Counsellor review: Supports report review, approval, and release before learners can access the final report.
- Reports and follow-up: Generates PDF reports and supports applications, calendar events, quarterly reviews, and feedback.
- Admin features: Includes catalogue management, licence controls, audit records, and application health checks.
Data note: The included course catalogue and career-path information are illustrative sample data. Verify and replace them with institution-approved or licensed information before real-world use. Psychometric instruments should only be administered where the required permissions or licences are in place.

Technology Stack
Area	Technology
Frontend and application framework	Next.js 15, React 19, TypeScript
Styling	Tailwind CSS
Database	Supabase / PostgreSQL
Local development storage	JSON file store
AI model integration	Google Gemini API (gemini-2.5-flash by default)
Validation and testing	TypeScript, Vitest
Report generation	PDFKit
Calendar export	iCalendar (.ics)


How the Agent Works
1. A learner creates an account, completes onboarding, and provides the required consent.
2. The learner completes the interest, aptitude, and working-style assessment.
3. The application scores the responses and matches the learner with relevant course clusters, programmes, and career paths.
4. The learner can compare options and ask the AI career advisor questions.
5. The application prepares a counselling report and a 12-month action plan.
6. A counsellor reviews the report and either returns it for changes or approves and releases it.
7. After release, the learner can access the report and continue tracking milestones, applications, and reviews.
The AI advisor can use application tools to search and compare courses and build career paths. Guardrails are used to reduce unsupported outcome promises. The counsellor remains responsible for reviewing and releasing reports.
Prerequisites
- Node.js 20.11 or later
- npm
- A Supabase project for hosted database use
- A Google Gemini API key for Gemini-powered responses (optional; the deterministic fallback can be used without it)
Setup and Run Locally
1. Clone the repository
git clone https://github.com/rameshthanikonda/career-counsellor-agent.git
cd career-counsellor-agent
2. Install dependencies
npm install
3. Configure environment variables
Create a local environment file from the example:

Windows PowerShell
Copy-Item .env.example .env.local
macOS / Linux
cp .env.example .env.local
Open .env.local and set the values required for your setup. Do not commit this file or share its secret values.

For Supabase, configure:
DATA_BACKEND=supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
AUTH_SECRET=replace_with_a_long_random_secret
For Gemini-powered AI responses, configure:
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
SUPABASE_SERVICE_ROLE_KEY is a server-side secret. Never expose it in browser code or commit it to GitHub. If Gemini is not configured with a valid key, the application can use its deterministic advisor fallback.
4. Set up the Supabase database
Apply the SQL schema from supabase/setup.sql in your Supabase project's SQL Editor, or use the migration files in supabase/migrations/ with the provided Supabase setup scripts.

After configuring the environment, check the database connection:
npm run supabase:check
If you are setting up a fresh database and intend to load the sample dataset, use:
npm run supabase:push
Review the script and database contents before running it. The push script is intended for an empty database.
5. Start the development server
npm run dev
Open http://localhost:3000 in your browser.
Local File-Store Mode (Optional)
For local development without Supabase, configure the file backend in .env.local:
DATA_BACKEND=file
Then seed the local sample data and start the application:
npm run seed
npm run dev
The local JSON data is stored under .data/. It is development data and should not be committed to the repository.
Useful Commands
Command	Purpose
npm run dev	Start the development server
npm run build	Create a production build
npm start	Start the production server
npm run typecheck	Run TypeScript checks
npm run lint	Run lint checks
npm test	Run the Vitest test suite
npm run seed	Seed the local file store
npm run supabase:check	Check Supabase connectivity and required tables
npm run supabase:push	Load the sample dataset into an empty Supabase database
npm run supabase:apply	Apply SQL migrations using DATABASE_URL
npm run report:sample	Generate a sample PDF report


Repository Structure
app/                    Next.js pages and API routes
components/             Reusable UI and feature components
lib/ai/                 Gemini integration, advisor tools, and guardrails
lib/assessment/         Assessment questions and scoring
lib/catalogue/          Courses, career paths, eligibility, and matching
lib/plans/              12-month plan generation
lib/reports/            Report narrative and PDF generation
lib/store/              Storage interface, file store, and Supabase store
scripts/                Database, environment, seed, and report scripts
supabase/migrations/    PostgreSQL schema migrations
tests/                  Automated tests
public/                 Static assets
Testing and Production Build
Run the checks before deploying:
npm run typecheck
npm test
npm run build
Important Limitations
- Course and career catalogue entries are illustrative sample data and must be verified before being used for actual counselling decisions.
- AI-generated guidance is informational and should be reviewed by a qualified counsellor. The application does not guarantee admission, employment, salary, placement, or other outcomes.
- Confirm the licences and permissions required for any psychometric instruments before administering them.
- Before production deployment, configure strong secrets, review Supabase Row Level Security policies, backups, data retention, and access controls.
License
Add the applicable project licence here before distributing or reusing this repository.