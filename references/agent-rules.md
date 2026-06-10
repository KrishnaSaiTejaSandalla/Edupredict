# EduPredict Agent Rules

Before making any code changes:

1. Read all files inside `/references`.
2. Study all UI screenshots before modifying UI.
3. Review `bugs.md` before implementing new features.
4. Follow `architecture-decisions.md` strictly.

---

## Tech Stack Rules

Frontend

* Next.js 15 App Router
* TypeScript
* Tailwind CSS
* Shadcn UI

Backend

* Next.js Server Actions

Database

* MySQL
* Drizzle ORM

Authentication

* Better Auth

State

* Zustand

Charts

* Recharts

Maps

* Google Maps

---

## Never Use

* Prisma
* Firebase
* MongoDB
* Redux
* Supabase Auth
* Context API for global app state
* Inline CSS
* Any package not approved first

---

## UI Rules

* Follow screenshots exactly.
* Mobile responsive first.
* Reuse existing components.
* Use theme tokens from globals.css.
* Maintain visual consistency.
* Do not redesign existing pages unless requested.

---

## Coding Rules

* Strict TypeScript.
* No any types.
* No duplicate code.
* Create reusable components.
* Use server components whenever possible.
* Client components only when necessary.
* Follow clean architecture.

---

## Database Rules

* Never delete tables.
* Never modify schema without approval.
* Use Drizzle relations.
* Use migrations properly.
* Avoid N+1 queries.

---

## Authentication Rules

* Protect routes.
* Verify roles.
* Validate permissions.
* Use Better Auth conventions.

---

## Before Finishing

Always provide:

1. Files modified.
2. Reason for changes.
3. Database changes.
4. Risks introduced.
5. Suggested next steps.

Never claim a feature works unless verified.
