# Clarita project audit and roadmap

**Audit date:** 31 August 2026  
**Scope:** product promise, conversation quality, Scripture integrity, safeguarding, privacy, account/data model, accessibility, performance, maintainability, operations, and growth readiness.

## Executive assessment

Clarita already has a coherent identity, a calm responsive interface, persistent account-based conversations, dark mode, and useful conversation management. The product concept is strong: a curious Christian companion that listens before it teaches and relates a user's situation to Scripture without claiming spiritual authority.

The app is still a **private beta**, not yet ready for broad public promotion. The largest risks are not visual. They are Scripture-source integrity, crisis handling, privacy controls, unrestricted AI cost, and the absence of automated quality evaluation. Several visible settings also promise functions that do not work yet, which can weaken trust.

## What is working well

- A distinct, compassionate product voice and clear HEART conversation philosophy.
- Account-required history with owner-scoped database policies.
- Conversation rename, pin, archive, share, and delete controls.
- Responsive light/dark presentation and a focused, uncluttered composer.
- Structured AI output instead of unrestricted markup.
- A reviewed fallback when the AI provider is unavailable.
- OpenAI requests use `store: false`.
- The Supabase project is healthy; all six public user-data tables have RLS enabled.

## Launch blockers — P0

### 1. Scripture accuracy and licensing

The current experience relies on a very small local set of World English Bible passages and witnesses. This creates repetition and cannot support the breadth implied by a Bible companion. The model can explain or connect a passage, but a model must not be the authority for exact Scripture text or references.

**Required:** choose a licensed/approved Scripture provider; store canonical passage IDs and translation; retrieve exact text; validate every reference before display; support “read context”; log content versions; complete theological review of the initial content packs.

### 2. Safety coverage is too narrow

The deterministic safety classifier is based on a small set of English regular expressions. It can miss indirect, misspelled, multilingual, or context-dependent disclosures. The emergency response is Nigeria-specific even when the user's location is unknown. There is no independent output safety check.

**Required:** input and output moderation; tested high-risk categories; location-aware crisis resources; a safe country-selection fallback; abuse/report controls; clear boundaries for medical, legal, financial, and pastoral authority; human safeguarding review and an incident process.

### 3. “Permanent account only” database policy is not enforcing its name

The live database has owner policies plus a separate permissive `ALL` policy named `permanent_accounts_only`. PostgreSQL combines permissive policies with OR. An anonymous Supabase session can therefore pass an owner policy even when it fails the permanent-account policy.

**Required:** incorporate the permanent-account claim into every owner policy, or use an appropriate restrictive policy; add automated RLS tests for permanent user, anonymous user, another user, and unauthenticated access; remove unnecessary anonymous table grants. Do not rely only on UI or API-route checks.

### 4. User privacy and control are incomplete

Every conversation is retained, but there is no self-service account deletion, full export, retention choice, history-off mode, or clear privacy policy. These conversations may include highly sensitive spiritual, relationship, health, and safety information.

**Required:** plain-language consent at first save; export all data; delete account and all associated data; retention policy; history-off/temporary conversation; per-chat delete and archive are already a good foundation; document subprocessors and AI handling; age policy and child-safety decision.

### 5. AI abuse and cost protection

Authenticated users can repeatedly call the chat route without an application rate limit or quota. Turnstile protects sign-up, not model usage. A valid user could create unexpected spend or degrade service for others.

**Required:** per-user and per-IP rate limits; daily budget/usage ceilings; request size and concurrency limits; model cost/latency logging; alerts; graceful capacity messaging; administrative suspension controls.

### 6. Quality governance and evaluation

The response constitution is still a draft. There is no repeatable test set proving that Clarita asks before advising, varies its responses, quotes Scripture accurately, avoids theological overclaiming, and escalates risk correctly.

**Required:** approve the response constitution; create a versioned evaluation set; score listening, relevance, repetition, Scripture fidelity, tone, and safety; regression-test prompts before every model or prompt change; add a reviewer dashboard and response-reporting flow.

## High-priority product and UX work — P1

| Area | Current challenge | Recommended improvement |
|---|---|---|
| Conversation | Replies arrive as one block and failures are opaque | Stream responses; show clear thinking/loading state; add stop, retry, regenerate, copy, and message-level feedback |
| Listening | Heuristics use short English regex/word counts | Let users choose “listen”, “comfort”, “pray”, “understand”, or “study”; preserve the choice during the conversation |
| Continuity | Only a recent slice of messages is sent to the model | Create privacy-aware conversation summaries and user-approved memory; show and let users edit remembered details |
| History | All conversations load together and have no search | Add server pagination, search, date grouping, filters, and optional folders/tags |
| Navigation | Screens are client state on one URL | Give Talk, History, Saved, Study, and Settings real routes; support refresh, browser back, deep links, and shareable internal destinations |
| Study | The Study action currently redirects to Talk | Build a genuine passage study flow: context, themes, related passages, questions, notes, and translation selection |
| Saved content | A Scripture card component exists but the chat does not expose a complete save flow | Unify Scripture rendering; add save, note, copy, read context, and later listen controls |
| Settings | Translation, Accessibility, and Privacy buttons are inert | Hide unfinished controls or finish them; never present a button that appears functional when it is not |
| Accessibility | Some secondary text is 8–12 px and the motion preference does not control all animation | Raise small text sizes; persist text-size/contrast/motion settings; honor `prefers-reduced-motion`; test keyboard, focus, screen reader, zoom, and contrast |
| Mobile | The app is responsive but needs systematic device testing | Test common phones/tablets/laptops, virtual keyboard, safe areas, landscape, 200% zoom, long names, and long Scripture text |
| Feedback | A feedback table exists without a complete visible loop | Add helpful/not helpful, reason, report concern, and optional note; route flagged items to reviewers |
| Authentication | Email delivery and redirect configuration are external dependencies | Finish custom SMTP, verify production redirects, offer one well-tested social provider, and provide recovery/help states |

## Engineering and operational challenges — P1

- **Dependency reproducibility:** many packages use `latest`. Pin exact versions, declare the Node engine, and use automated dependency PRs with CI.
- **Testing:** add unit tests for phase/safety logic, schema contract tests, RLS tests, API integration tests, and Playwright flows for auth/chat/history/delete/archive. Add accessibility and responsive visual checks.
- **Observability:** record request IDs, provider/model, latency, token usage, estimated cost, fallback rate, safety tier, and errors without logging private conversation text by default. Add uptime and error alerts.
- **Data consistency:** add request/idempotency IDs and explicit failed-message states so retries cannot duplicate turns or leave confusing partial conversations.
- **Scale:** paginate conversations, messages, saved passages, and notes. Avoid fetching a user's entire history into one client component.
- **Architecture:** split the large client app into route-level features and a server-side data/service layer. Generate Supabase types from the schema instead of maintaining duplicate definitions.
- **Security hardening:** add a Content Security Policy and related headers, validate request origin where appropriate, minimize grants, rotate secrets, document restoration, and rehearse backup recovery.
- **Database lifecycle:** use preview/staging environments and migration CI before production changes. The current production Security Advisor also reports leaked-password protection disabled.
- **PWA expectations:** a manifest alone is not offline support. Add a service worker, offline states, install/update handling, and explicit rules about which private data may be cached.

## Valuable later features — P2

- Voice input and optional read-aloud after text safety and privacy are mature.
- User-controlled response preferences, reading level, translation, and denominational context—without presenting one tradition as universal.
- Prayer journal, reading plans, follow-up reminders, and progress based on meaningful reflection rather than engagement time.
- Localization and culturally appropriate crisis resources.
- Optional private sharing/export of a selected conversation, never public by default.
- A content/reviewer console for passages, explanations, reports, prompt versions, and audit history.

Avoid community feeds, streak pressure, public spiritual rankings, or dependency-forming notifications in the near term. They conflict with the product's calm, private purpose.

## Recommended delivery order

### Phase A — Trust foundation (next 1–2 weeks)

1. Correct and test the permanent-account RLS design.
2. Enable leaked-password protection and verify production email/redirect flows.
3. Add rate limits, budgets, request IDs, error tracking, and basic cost metrics.
4. Add export, account deletion, privacy/terms pages, and a retention decision.
5. Select the Scripture source/licence and crisis-resource provider.

### Phase B — Conversation quality (following 2–4 weeks)

1. Integrate verified Scripture retrieval and reference validation.
2. Add mode choice, streaming, retry/stop/copy, feedback, and report controls.
3. Build the evaluation suite and reviewer workflow.
4. Add safe long-conversation summaries and user-controlled memory.
5. Complete Saved and Study rather than showing inactive promises.

### Phase C — Scalable experience

1. Introduce real routes, pagination, search, and filters.
2. Complete accessibility and device-matrix testing.
3. Add staging, CI, automated security/RLS tests, and restoration drills.
4. Run an invited beta, measure quality and safety, then decide whether voice, localization, or reading plans should come next.

## Metrics that match Clarita's purpose

- Percentage of conversations where users say they felt understood.
- Helpful/not-helpful rate by response phase and model/prompt version.
- Scripture-reference validation pass rate (target: 100%).
- Repetition rate across a user's recent conversations.
- Safety recall on the reviewed test set and time to review flagged responses.
- Chat completion, retry, fallback, and error rates.
- P50/P95 first-response latency and cost per completed conversation.
- Data export/deletion success rate and support volume.

Do not optimize primarily for time spent, streaks, or message count. Clarita should help a person reach clarity, Scripture, prayer, or an appropriate human source of support—not keep them dependent on the app.

## Current audit evidence

- Production Supabase project: `ACTIVE_HEALTHY`, PostgreSQL 17.
- RLS: enabled on all six public user-data tables.
- Security Advisor: one warning—leaked-password protection disabled.
- Performance Advisor: two currently unused indexes; with only two conversations this is informational, not a reason to remove them yet.
- Current production data volume at audit time: 2 conversations and 16 messages; scalability has not yet been tested by real volume.
- Automated verification presently consists of lint and production build; there are no unit, end-to-end, prompt-evaluation, accessibility, or RLS regression suites.
- Favicon repair: the old mark was replaced with the current open-book/light mark, and a Next.js `app/icon.svg` metadata icon was added.
