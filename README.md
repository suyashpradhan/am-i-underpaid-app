# Am I Underpaid

Am I Underpaid is a free salary comparison tool for professionals in India. A user describes their role, experience, company context, location, and current compensation. The app searches public market data, builds a comparison cohort, and returns one of three outcomes: underpaid, at market, or above market.

The product is live at [am-i-underpaid.in](https://am-i-underpaid.in).

Salary data is messy. Titles vary between companies, public sources can be incomplete, and compensation definitions are not consistent. The app is designed to return a limited-data state instead of inventing a confident answer when the evidence is weak.

## Stack

| Area | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite |
| Styling | Plain CSS |
| Backend | Convex actions, queries, and mutations |
| Database | Convex |
| Agent orchestration | Hermes by Nous Research |
| Market search | LinkUp |
| Product analytics | PostHog |
| Payments | Razorpay Standard Checkout |
| Share image export | html-to-image |
| Frontend hosting | Cloudflare |

## How a salary check works

1. The user submits a job title and a short description of their actual work.
2. The form collects IC or manager track, company type, optional company headquarters, city or remote status, experience, compensation type, and current pay.
3. Convex validates the request, checks the cache, and sends a research job to Hermes.
4. Hermes normalizes the cohort, prepares LinkUp searches, reviews the returned sources, and asks a separate verifier to challenge weak or contradictory evidence.
5. LinkUp returns public market evidence. It remains the retrieval layer; Hermes decides which research task should run next.
6. Hermes returns structured evidence with p25, median, p75, confidence, matched titles, cohort-support signals, and accepted source URLs.
7. Convex rejects invalid bands, unrelated role families, profile pages, person-name sources, social links, and sources without compensation evidence.
8. If the exact cohort is too narrow, one fallback search may relax company stage. It keeps role, responsibilities, seniority, location, headquarters market, and compensation definition intact.
9. Suspicious outliers trigger a second verification search. Conflicting searches return limited data instead of a verdict.
10. Valid results and a compact orchestration trace are cached in Convex and returned to the React app.

## Hermes orchestration

Hermes sits behind Convex, not in the browser. A salary check is split across five bounded responsibilities:

| Responsibility | What it does | Required output |
| --- | --- | --- |
| Cohort interpreter | Converts title, work description, experience, track, location, company stage, and headquarters into a comparable cohort | Normalized role family, seniority, track, geography, and compensation definition |
| Evidence scout | Builds focused LinkUp queries for the normalized cohort | Candidate sources and extracted compensation observations |
| Source auditor | Removes people profiles, social pages, duplicates, title collisions, and sources without numerical pay evidence | Accepted and rejected sources with reason codes |
| Compensation analyst | Builds a defensible p25, median, and p75 band from comparable evidence | Market band, matched titles, sample support, and assumptions |
| Trust verifier | Challenges extreme gaps, conflicting sources, and weak cohorts | `strong`, `directional`, or `no_data` with a reason |

Hermes is valuable here because salary research is not one prompt. It is a sequence of decisions where retrieval, interpretation, and verification should be independently inspectable. It also lets unrelated searches run in parallel while keeping the final verdict behind deterministic checks.

### Runtime boundary

```text
React on Cloudflare
  -> Convex salary-check action
     -> request validation, rate limit, and cache lookup
     -> Hermes orchestrator
        -> cohort interpreter
        -> LinkUp evidence scout
        -> source auditor
        -> compensation analyst
        -> trust verifier
     -> Convex band validation and persistence
  <- strong, directional, or no-data result
```

Hermes should run as a private worker or container with one authenticated endpoint called by Convex. It needs access to LinkUp, but it does not need direct access to Razorpay or PostHog. Convex remains the system of record for checks, feedback, cache entries, and payments.

Each Hermes run should have a timeout, a maximum number of agent steps, versioned JSON schemas, and a correlation ID. Convex should store the correlation ID, workflow version, accepted URLs, rejection reason codes, confidence, latency, and estimated search cost. Raw work descriptions and salary values should not be copied into analytics events.

If Hermes is unavailable, exceeds its budget, or returns an invalid schema, Convex uses the current single-pipeline fallback. If that path cannot establish a trustworthy numerical band, the UI returns `no_data`. Agent failure must never be converted into a confident salary verdict.

### Verdict rules

The returned market band represents p25 to p75 for the comparison cohort.

- Current pay below p25: `underpaid`
- Current pay between p25 and p75: `fair`
- Current pay above p75: `above`

The quote number uses the cohort median and never recommends less than the user's current compensation.

The displayed percentile is directional. It interpolates the user's pay across p25, median, and p75. It is not a percentile calculated from a complete payroll dataset.

### Result quality states

The frontend has three result states:

1. Strong result: a valid band with medium or high confidence.
2. Directional result: a valid band with limited evidence.
3. No defensible result: relevant material may exist, but there is not enough comparable numerical evidence to show a verdict.

The no-result screen repeats the submitted cohort and current compensation so the user knows the form was processed. It does not show a percentile, verdict, range, or negotiation quote.

## Role handling

The product does not use a fixed list of supported jobs. The title and work description are evaluated together. This is important for titles such as Forward Deployed Engineer, Platform Engineer, Solution Engineer, Product Designer, iOS Engineer, and company-specific leadership roles.

Known collision-prone role families have extra guardrails:

- Solution Engineer is kept separate from Software Engineer.
- Platform Engineering is kept separate from general application development.
- Product Design excludes generic graphic and web design data unless the responsibilities match.
- Mobile roles include iOS, Android, React Native, Swift, and Kotlin evidence.

For unfamiliar titles, LinkUp must return the comparable titles used to build the band. A role mismatch is rejected.

## Caching and LinkUp usage

Salary bands are cached in the `rateCache` table. The current cache key is version `v4` and includes:

- Normalized role
- Location
- Experience bucket
- IC or manager track
- Company type
- Company headquarters
- Fixed or total compensation
- A hash of the work description

LinkUp uses standard-depth searches. Extra searches run only for missing or suspicious results. This keeps search spend bounded while preserving a verification path for obvious mismatches.

## Razorpay tips

The coffee widget accepts optional tips of ₹10, ₹20, or ₹50.

Payment flow:

1. React asks `convex/razorpay.ts` to create an order.
2. Convex validates the amount and creates the order with Razorpay.
3. The frontend opens Razorpay Standard Checkout.
4. Razorpay returns the payment ID, order ID, and signature.
5. Convex verifies the HMAC signature using the order stored on the server.
6. Convex fetches the payment from Razorpay and checks the order, amount, and captured status.
7. Only captured and verified payments are marked `paid` in `razorpayOrders`.

The Razorpay secret never reaches the browser. Test keys simulate transactions. Live keys are required to collect real money.

Automatic capture should be enabled in the Razorpay dashboard. A production webhook for `payment.captured`, `payment.failed`, and `order.paid` is still recommended so a browser disconnect cannot prevent the database from receiving the final payment status.

## PostHog analytics

PostHog is optional. Missing PostHog configuration does not stop the app from loading.

The app uses deliberate custom events. Autocapture, automatic pageviews, session recording, and person profiles are disabled. PostHog persistence is limited to session storage.

No custom event includes current salary, work-description text, payment IDs, Razorpay signatures, names, email addresses, or phone numbers.

### Event catalog

| Event | Meaning |
| --- | --- |
| `landing_view` | App opened |
| `check_submitted` | Salary check started |
| `result_viewed` | Strong, directional, or no-data result returned |
| `check_failed` | Market search or backend request failed |
| `share_clicked` | Share sheet opened |
| `share_action` | Link copied, image downloaded, or a share target opened |
| `share_action_failed` | Image generation or native sharing failed |
| `result_feedback` | User reported an incorrect result |
| `broader_comparison_requested` | User requested a broader company comparison |
| `missing_role_reported` | User reported missing market data |
| `tip_clicked` | Coffee checkout started |
| `tip_checkout_opened` | Razorpay modal opened |
| `tip_cancelled` | Razorpay modal closed by the user |
| `tip_failed` | Razorpay reported payment failure |
| `tip_pending` | Payment was authorized but not captured yet |
| `tip_verification_failed` | Server-side verification failed |
| `tip_checkout_error` | Checkout script or order creation failed |
| `tip_verified` | Payment was verified and captured |

Each salary attempt receives a `check_attempt_id` so submit, result, and failure events can be joined without identifying the user.

Recommended PostHog funnel:

```text
landing_view
  -> check_submitted
  -> result_viewed
  -> share_action or tip_clicked
  -> tip_verified
```

Useful `result_viewed` breakdowns are `result_type`, `variant`, `confidence`, and `source_count`.

## Convex data model

| Table | Purpose |
| --- | --- |
| `checks` | Anonymous salary-check results used for aggregate product analysis |
| `salaryCheckStats` | O(1) public check counter |
| `rateCache` | Cached market bands and source links |
| `razorpayOrders` | Created and verified Razorpay orders |
| `resultFeedback` | Incorrect-result reports |
| `resultFeedbackStats` | Aggregate feedback count |
| `missingRoleReports` | Roles for which users requested better coverage |
| `tips` | Legacy Dodo-era table retained for schema compatibility |

## Share card

The result share sheet renders a 420 by 600 card and exports a 1260 by 1800 PNG. It supports:

- Image download
- Copy link
- Copy caption
- Share on X
- Share on LinkedIn
- Native mobile sharing with the PNG attached when supported

LinkedIn's URL share dialog cannot attach a browser-generated file. Desktop users download the image and attach it to their post. Supported mobile browsers can pass the generated image through the native share sheet.

## Local setup

### Requirements

- Node.js 20 or newer
- npm
- A Convex project
- LinkUp API access
- PostHog project, optional
- Razorpay account, optional for local salary testing

### Install

```bash
npm install
```

Configure the Convex project:

```bash
npx convex dev
```

Create `.env.local` for public frontend configuration:

```dotenv
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_POSTHOG_PROJECT_TOKEN=phc_your_project_token
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

The PostHog variables are optional. `VITE_CONVEX_URL` is required.

Set private backend values in Convex, not in the Vite environment:

```bash
npx convex env set LINKUP_API_KEY
npx convex env set RAZORPAY_KEY_ID
npx convex env set RAZORPAY_KEY_SECRET
```

The CLI prompts for values interactively, which keeps secrets out of shell history.

Start the frontend:

```bash
npm run dev
```

## Environment variables

### Cloudflare frontend

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_CONVEX_URL` | Yes | Convex production URL |
| `VITE_POSTHOG_PROJECT_TOKEN` | No | Public PostHog project token |
| `VITE_POSTHOG_HOST` | No | PostHog ingestion host |

### Convex backend

| Variable | Required | Purpose |
| --- | --- | --- |
| `LINKUP_API_KEY` | Yes | LinkUp search API key |
| `RAZORPAY_KEY_ID` | For tips | Razorpay account key ID |
| `RAZORPAY_KEY_SECRET` | For tips | Razorpay secret used for orders and verification |
| `HERMES_WORKER_URL` | When Hermes worker is enabled | Private Hermes orchestration endpoint |
| `HERMES_WORKER_TOKEN` | When Hermes worker is enabled | Server-to-server authentication token |

`AMIUNDERPAID` is supported as a legacy fallback for the LinkUp key. New deployments should use `LINKUP_API_KEY`.

Never expose `RAZORPAY_KEY_SECRET` through a `VITE_` variable. Vite variables are shipped to the browser.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite locally |
| `npm run build` | Run TypeScript checks and create the production build |
| `npm run preview` | Serve the generated build locally |
| `npm run convex` | Start Convex development mode |
| `npx convex deploy` | Deploy backend functions and schema to production |

## Deployment

### 1. Deploy Convex

Set production secrets interactively:

```bash
npx convex env set --prod LINKUP_API_KEY
npx convex env set --prod RAZORPAY_KEY_ID
npx convex env set --prod RAZORPAY_KEY_SECRET
```

Deploy functions and schema:

```bash
npx convex deploy
```

### 2. Deploy Cloudflare

Cloudflare build settings:

```text
Build command: npm run build
Output directory: dist
```

Add the frontend environment variables in the Cloudflare project settings, then deploy the current branch.

Deploy Convex before Cloudflare when a frontend change calls a new Convex function. This avoids a window where the browser references a backend function that is not deployed yet.

## Release checks

Run the production build:

```bash
npm run build
```

There is no automated test suite yet. Before a public release, manually test:

- Frontend, backend, platform, mobile, design, solution, and unfamiliar role titles
- IC and manager tracks
- City and remote comparisons
- Fixed salary and total compensation
- Strong, directional, no-data, and error screens
- Broader-market retry
- Incorrect-result and missing-role feedback
- ₹10, ₹20, and ₹50 Razorpay test payments
- Payment cancellation, failure, pending capture, and successful capture
- Share image download
- X, LinkedIn, copy-link, copy-caption, and native share actions
- Mobile layout at 360 px width
- Cloudflare production environment variables
- PostHog events in Live Events

## Project structure

```text
src/
  App.tsx                    Screen orchestration and product events
  main.tsx                   React, Convex, and PostHog providers
  ShareCard.jsx              Exportable result card
  components/
    IntakeForm.jsx           Salary-check form
    Result.jsx               Main verdict screen
    EdgeStates.jsx           Limited-data and error states
    ShareSheet.jsx           Image export and social sharing
    Payment.jsx              Razorpay checkout states

convex/
  schema.ts                  Database schema
  payCheck.ts                LinkUp search and market-band validation
  lib/verdict.ts             Cache keys and local verdict calculations
  rateCache.ts               Salary-band cache access
  checks.ts                  Anonymous checks and aggregate count
  feedback.ts                Result and missing-role reports
  razorpay.ts                Razorpay order creation and verification
  razorpayData.ts            Internal Razorpay database operations
```

## Known limitations

- Public compensation data is incomplete and can be wrong.
- The percentile is directional, not a population statistic.
- Company-stage and headquarters splits are not available for every role.
- LinkUp availability and source quality affect result coverage.
- The Hermes worker still needs to be deployed and connected to the Convex action; the current Convex and LinkUp path is the production fallback.
- No-data outcomes are expected for narrow or uncommon cohorts.
- Razorpay webhooks are not implemented yet.
- Automated tests are not implemented yet.

The product should be treated as a research starting point. Users should verify the sources and use judgment before making career or compensation decisions.
