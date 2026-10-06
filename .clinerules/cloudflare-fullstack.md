# Professional Cloudflare Full-Stack Architecture Rules

## 1. Core Architecture

This project uses a modern Cloudflare-first full-stack architecture.

### Primary stack

- Frontend: React 19 + TypeScript
- Build tool: Vite
- Styling: Tailwind CSS
- UI components: shadcn/ui
- Icons: Lucide
- Client/server state: TanStack Query
- Forms: React Hook Form
- Validation: Zod
- Backend: Cloudflare Workers
- API framework: Hono
- Database: Cloudflare D1
- ORM: Drizzle ORM
- Object/file storage: Cloudflare R2
- Optional cache/config: Cloudflare KV
- Optional background jobs: Cloudflare Queues
- Optional realtime: Durable Objects
- Optional vector search: Cloudflare Vectorize
- Testing: Vitest + Playwright
- Code quality: ESLint + Prettier
- Source control: Git
- Deployment: Cloudflare Workers

The application should be designed to run primarily on Cloudflare.

---

# 2. Cloudflare-First Rule

Prefer Cloudflare-native services whenever they satisfy the requirement.

Preferred architecture:

React/Vite
    ↓
Cloudflare Workers
    ↓
Hono API
    ↓
Drizzle ORM
    ↓
Cloudflare D1

Additional services:

R2       → files/images/documents
KV       → small cached/configuration data
Queues   → background processing
Durable Objects → realtime/stateful coordination
Vectorize → vector/semantic search

Do NOT introduce unnecessary infrastructure.

Avoid adding:

- Express
- standalone Node.js backend
- PM2
- Nginx
- Docker
- VPS servers
- AWS EC2
- separate backend servers

unless the project has a documented technical requirement that Cloudflare cannot satisfy.

---

# 3. Frontend Rules

Use:

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Lucide icons

Do not create large monolithic React components.

Prefer feature-based organization.

Recommended structure:

src/
├── components/
│   ├── ui/
│   ├── layout/
│   └── shared/
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── suppliers/
│   ├── products/
│   ├── rfqs/
│   ├── quotes/
│   ├── reports/
│   └── settings/
├── hooks/
├── lib/
├── routes/
├── services/
├── types/
├── App.tsx
└── main.tsx

Keep business logic out of presentation components whenever practical.

---

# 4. UI/UX Rules

The UI must look like a professional production application.

Use:

- consistent spacing
- responsive layouts
- accessible controls
- clear typography hierarchy
- consistent button styles
- consistent form layouts
- loading states
- empty states
- error states
- success feedback
- confirmation dialogs for destructive operations
- keyboard-accessible interactions
- mobile and desktop responsive behavior

Use shadcn/ui components where appropriate instead of recreating standard UI components from scratch.

Use Lucide icons consistently.

Avoid:

- excessive gradients
- excessive animations
- inconsistent colors
- random border radiuses
- unnecessary decorative elements
- huge text
- cluttered dashboards
- inconsistent spacing
- emoji as primary UI icons

The interface should prioritize usability and clarity over decoration.

---

# 5. Backend Rules

Use:

Cloudflare Workers + Hono + TypeScript

The Worker is the primary backend.

Recommended API structure:

/api/v1/auth
/api/v1/users
/api/v1/suppliers
/api/v1/products
/api/v1/rfqs
/api/v1/quotes
/api/v1/purchase-orders
/api/v1/reports

Use REST APIs unless there is a documented reason to use another architecture.

Use API versioning:

/api/v1/...

Do not expose database credentials or provider API keys to the frontend.

---

# 6. API Design Rules

Use standard HTTP methods:

GET
POST
PUT/PATCH
DELETE

Examples:

GET    /api/v1/suppliers
POST   /api/v1/suppliers
GET    /api/v1/suppliers/:id
PUT    /api/v1/suppliers/:id
DELETE /api/v1/suppliers/:id

Use consistent response structures.

Example success:

{
  "success": true,
  "data": {}
}

Example error:

{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid supplier data"
  }
}

Never expose internal stack traces, database errors, secrets, or credentials to the client.

---

# 7. Validation Rules

Use Zod for validation.

Validate at API boundaries.

Recommended flow:

Frontend
    ↓
Zod
    ↓
Hono
    ↓
Zod
    ↓
Business logic
    ↓
Drizzle
    ↓
D1

Never assume frontend validation is sufficient.

All important backend inputs must be validated server-side.

---

# 8. Database Rules

Use:

Cloudflare D1 + Drizzle ORM

Do not directly scatter raw SQL throughout application code.

Prefer:

src/db/
├── schema.ts
├── migrations/
├── index.ts
└── queries/

Define database schemas using Drizzle.

Use migrations for database changes.

Never modify production database structure manually when a migration should be used.

Database design should prioritize:

- normalized relational data
- appropriate indexes
- foreign keys where appropriate
- timestamps
- predictable IDs
- constraints
- pagination for large datasets

Avoid unnecessary database reads.

Never fetch an entire table when pagination or filtering can be used.

---

# 9. D1 Performance Rules

Be careful with Cloudflare D1 row reads.

Never implement inefficient polling or repeated full-table queries.

Avoid:

SELECT * FROM large_table

when only a few columns are required.

Prefer:

SELECT id, name, status
FROM suppliers
WHERE status = ?

Use pagination for lists.

Use indexes for frequently queried fields.

Before adding a sync mechanism, understand how many database reads it can generate.

For offline-first applications, avoid repeatedly synchronizing unchanged records.

---

# 10. R2 Rules

Use Cloudflare R2 for files.

Examples:

- PDFs
- images
- CVs
- invoices
- supplier documents
- attachments
- exports

Do NOT store large binary files directly in D1.

Store metadata in D1.

Example:

documents
├── id
├── filename
├── content_type
├── r2_key
├── uploaded_by
└── created_at

Actual file:

R2
└── documents/{documentId}/{filename}

Validate:

- file type
- file size
- filename
- upload permissions

Never trust a client-provided MIME type alone.

---

# 11. Authentication and Authorization

Authentication and authorization must be enforced on the backend.

Do not rely on frontend route protection alone.

Frontend hiding:

if (!user.isAdmin) hideButton();

is NOT sufficient security.

Backend must verify:

- authenticated user
- user role
- permissions
- organization/tenant where applicable
- resource ownership where applicable

Possible roles:

ADMIN
MANAGER
USER
VIEWER

Use least-privilege access.

---

# 12. Secrets and API Keys

NEVER put secrets in:

- React source code
- frontend environment variables
- localStorage
- sessionStorage
- public configuration
- GitHub repositories
- client-side JavaScript

External API calls requiring secrets must go through Cloudflare Workers.

Correct:

React
 ↓
Cloudflare Worker
 ↓
External API

Incorrect:

React
 ↓
External API
 ↓
SECRET API KEY IN BROWSER

Use Cloudflare Worker secrets/environment bindings.

Never commit secrets to Git.

---

# 13. TanStack Query Rules

Use TanStack Query for server state.

Prefer:

React
 ↓
TanStack Query
 ↓
API
 ↓
Worker
 ↓
D1

Use it for:

- fetching
- caching
- mutations
- retries
- invalidation
- refetching
- loading states
- error states

Do not create unnecessary custom global state for server data.

Use React state/context only for appropriate client-side state.

---

# 14. Forms

Use:

React Hook Form + Zod

Recommended flow:

React Hook Form
      ↓
Zod validation
      ↓
API
      ↓
Server-side Zod validation
      ↓
Database

Forms must provide:

- field validation
- useful error messages
- loading state
- disabled submit during mutation
- success feedback
- server error handling

Do not lose user-entered data unnecessarily when an API request fails.

---

# 15. Cloudflare KV Rules

Use KV only when appropriate.

Good use cases:

- cached configuration
- feature flags
- small frequently-read values
- temporary application state where eventual consistency is acceptable

Do not use KV as the primary relational database.

D1 should remain the source of truth for relational application data.

---

# 16. Cloudflare Queues Rules

Use Queues for work that does not need to block the user's request.

Examples:

User uploads PDF
    ↓
Worker
    ↓
Queue
    ↓
Background Worker
    ↓
Process PDF
    ↓
Save result to D1/R2

Good candidates:

- document processing
- AI processing
- large imports
- notifications
- report generation
- batch operations

Do not make users wait for long-running operations when they can safely be processed asynchronously.

---

# 17. Durable Objects Rules

Use Durable Objects only when stateful coordination or realtime functionality is required.

Good use cases:

- WebSockets
- realtime collaboration
- live dashboards
- shared state
- coordination between clients

Do not introduce Durable Objects for ordinary CRUD applications.

---

# 18. AI Integration Rules

AI API keys must remain server-side.

Architecture:

React
 ↓
Hono
 ↓
Cloudflare Worker
 ↓
AI provider

Never expose:

- OpenAI keys
- Qwen keys
- Groq keys
- Gemini keys
- other provider secrets

to the browser.

For document AI:

React
 ↓
Worker
 ↓
R2
 ↓
Queue
 ↓
AI processing
 ↓
D1/R2

For semantic search:

Documents
 ↓
Embeddings
 ↓
Vectorize
 ↓
Semantic retrieval
 ↓
LLM
 ↓
Response

---

# 19. Routing Rules

Use a clear frontend routing architecture.

Separate:

- public routes
- authenticated routes
- administrative routes

Example:

/login
/dashboard
/suppliers
/products
/rfqs
/quotes
/reports
/settings

Admin:

/admin/users
/admin/settings
/admin/audit-log

Protect routes according to permissions.

---

# 20. Error Handling

Every production feature must handle:

- loading
- success
- empty
- validation error
- authentication error
- authorization error
- network error
- server error

Do not allow unhandled errors to create broken UI.

Provide useful user-facing messages.

Do not expose technical implementation details to users.

Log useful technical information server-side when appropriate.

---

# 21. Testing

Use:

Vitest
Playwright

Unit/integration tests should cover important business logic and API behavior.

Playwright should cover critical user workflows.

Important workflows include:

- login
- creating records
- editing records
- deleting records
- searching
- filtering
- uploading files
- permissions
- important business workflows

Do not write tests merely to increase coverage numbers.

Prioritize critical behavior.

---

# 22. Code Quality

Use:

TypeScript
ESLint
Prettier

Prefer strict TypeScript.

Avoid:

any

unless there is a documented reason.

Prefer explicit types.

Keep functions small and focused.

Avoid duplicated business logic.

Create reusable utilities when duplication is meaningful.

Do not prematurely abstract trivial code.

---

# 23. Git Rules

Use Git with meaningful commits.

Examples:

feat: add supplier management
fix: prevent duplicate RFQ submission
refactor: extract supplier service
test: add supplier API tests
docs: update deployment instructions

Never commit:

- API keys
- passwords
- tokens
- private certificates
- database credentials
- .env files containing secrets

---

# 24. Environment Configuration

Use separate configurations for:

development
preview
production

Never hardcode environment-specific URLs.

Example:

Development:

http://localhost:8787

Production:

Cloudflare Worker URL

Use environment bindings/configuration appropriately.

---

# 25. Deployment

Production deployment should target Cloudflare Workers.

Preferred flow:

Developer
    ↓
Git
    ↓
GitHub
    ↓
CI
    ├── install
    ├── typecheck
    ├── lint
    ├── test
    └── build
         ↓
Cloudflare
         ↓
Workers

Use Wrangler for Cloudflare development and deployment.

Do not manually upload production files when an automated deployment process is available.

---

# 26. Project Structure

A professional default structure:

/
├── src/
│   ├── components/
│   ├── features/
│   ├── hooks/
│   ├── lib/
│   ├── routes/
│   ├── services/
│   ├── types/
│   ├── db/
│   │   ├── schema.ts
│   │   ├── migrations/
│   │   └── index.ts
│   ├── worker/
│   │   ├── index.ts
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── services/
│   ├── App.tsx
│   └── main.tsx
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── public/
│
├── drizzle.config.ts
├── wrangler.jsonc
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md

Adapt the structure to project complexity. Do not create unnecessary folders for a small application.

---

# 27. Architecture Decision Rule

Before introducing a new dependency or Cloudflare service:

1. Determine whether the existing stack already solves the problem.
2. Prefer the simplest solution.
3. Prefer Cloudflare-native infrastructure when appropriate.
4. Avoid unnecessary external services.
5. Avoid unnecessary abstractions.
6. Consider performance, security, maintainability and cost.
7. Explain the reason before introducing a significant architectural change.

Do not add technology simply because it is available.

---

# 28. Existing Project Rule

Before modifying an existing project:

1. Inspect the existing architecture.
2. Inspect package.json.
3. Inspect the Cloudflare configuration.
4. Inspect database schema and migrations.
5. Inspect existing routes/API endpoints.
6. Inspect authentication.
7. Inspect existing UI components.
8. Identify what already works.
9. Avoid unnecessary rewrites.
10. Preserve working functionality unless the requested change requires modification.

Do not replace an existing implementation merely because you prefer another implementation.

---

# 29. Change Management Rule

Before making large changes:

- explain the intended architecture
- identify affected files
- identify database changes
- identify API changes
- identify migration requirements
- identify potential breaking changes

For small changes, proceed directly.

For large changes, implement in logical phases.

---

# 30. Database Migration Safety

Before changing database schema:

1. Inspect the current schema.
2. Create a migration.
3. Ensure existing data is preserved.
4. Consider backward compatibility.
5. Test the migration.
6. Do not destroy production data without explicit confirmation.

Never casually execute destructive database operations.

---

# 31. Performance Rules

Prioritize:

- minimal unnecessary API calls
- efficient D1 queries
- pagination
- caching where appropriate
- lazy loading
- code splitting
- optimized images
- efficient React rendering
- debounced search
- avoiding duplicate requests

Do not optimize prematurely.

Measure or identify the bottleneck before introducing complex optimization.

---

# 32. Accessibility

UI should follow accessible web practices.

Use:

- semantic HTML
- labels for form fields
- keyboard navigation
- visible focus states
- accessible dialogs
- accessible buttons
- sufficient contrast
- meaningful error messages
- ARIA only when necessary

Do not use div elements as buttons when a button element is appropriate.

---

# 33. Responsive Design

Applications must work across:

- desktop
- laptop
- tablet
- mobile

Use responsive Tailwind utilities.

Do not design only for the developer's monitor.

For business dashboards, prioritize:

desktop → tablet → mobile

while maintaining usable mobile layouts.

---

# 34. Professional Development Workflow

When implementing a feature:

1. Understand the requirement.
2. Inspect the existing code.
3. Identify affected frontend components.
4. Identify affected API endpoints.
5. Identify database changes.
6. Define validation.
7. Implement backend.
8. Implement frontend.
9. Add loading/error/empty states.
10. Add tests.
11. Run type checking.
12. Run linting.
13. Run tests.
14. Build the application.
15. Review for security issues.
16. Review for unnecessary complexity.

Do not claim a feature is complete until the relevant checks have been performed.

---

# 35. Cline Behavior

When working on this project, Cline should behave as a senior full-stack engineer.

Priorities:

1. Correctness
2. Security
3. Maintainability
4. Data integrity
5. Performance
6. Accessibility
7. User experience
8. Simplicity

Do not blindly follow a requested implementation if it introduces an obvious security, data-integrity or architectural problem.

When there are multiple technically valid approaches, prefer the approach that:

- fits the existing architecture
- uses fewer unnecessary dependencies
- is easier to maintain
- works well with Cloudflare
- is secure
- is testable
- is understandable to another developer

---

# 36. Final Architecture

Default architecture:

┌─────────────────────────────────────┐
│             React 19                │
│        TypeScript + Vite            │
│     Tailwind + shadcn/ui            │
└──────────────────┬──────────────────┘
                   │
                   ▼
          TanStack Query
                   │
                   ▼
┌─────────────────────────────────────┐
│       Cloudflare Workers            │
│              Hono                   │
│       Authentication / API          │
└──────────────────┬──────────────────┘
                   │
             Drizzle ORM
                   │
       ┌───────────┼───────────┐
       ▼           ▼           ▼
   Cloudflare   Cloudflare   Cloudflare
      D1           R2           KV
   Database      Files       Cache/Config
                   │
                   ▼
             Cloudflare
               Queues
                   │
                   ▼
          Background Workers
                   │
             ┌─────┴─────┐
             ▼           ▼
            AI       Vectorize
```

This is the default architecture unless the project's requirements justify a different design.

### Where to put it

For a **single project**, use:

```text
your-project/
└── .clinerules/
    └── cloudflare-fullstack.md
```

If you want these rules to apply to **every project you open with Cline**, put the equivalent rules in your Cline global rules/configuration instead.

**One important recommendation:** don't make Cline blindly apply every section to every project. The rule explicitly says to use optional Cloudflare services only when needed, so a simple CRUD app doesn't suddenly get D1 + R2 + KV + Queues + Durable Objects + Vectorize just because they're available.