# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

JSP Credit is a micro-credit back office: admins and managers issue loans, and collectors record installments during "visits". It is a single Next.js 16 App Router app (React 19, Prisma 6, PostgreSQL, Tailwind 3 + shadcn/ui) containing both the admin web UI and the JSON API. The README is unmodified create-next-app boilerplate.

## Commands

```bash
npm run dev               # dev server on :3000
npm run build             # production build, including type check
npm start                 # serve the production build
npx tsc --noEmit          # type check only

npx prisma generate       # after editing prisma/schema.prisma
npx prisma migrate dev --name <name>   # create and apply a migration
npx prisma migrate deploy # apply existing migrations
npm run prisma:seed       # create the initial admin; fails if it already exists

node scripts/db-copy/copy-db.mjs   # overwrite the local DB with a copy of another (settings in .env.db-copy)
node scripts/check-paid-amounts.mjs # read-only: loans whose paidAmount differs from their payments
```

- There is no test suite or test runner.
- There is no linter. Use the type check instead.
- Node 22 (pinned in `engines`, which Vercel honors). Prisma is deliberately on 6.x: 7 needs a configuration and driver migration. The `overrides` in package.json patch advisories in `@prisma/config` and can be removed once Prisma is upgraded past them.
- `.env` needs `DATABASE_URL` and `JOSE_SECRET` (HS256 signing key for JWTs).

## Auth

1. `POST /api/user/login` returns a 48h JWT with `{email, name, phone, role, nic}`. The browser keeps it in `localStorage.token`, and the client in `src/lib/api.ts` attaches `Authorization: Bearer <token>`.
2. `src/middleware.ts` runs on `/api/*` only. It rejects (403) any request that already carries a `user` header, then verifies the token and writes the payload as JSON into that header. A missing or invalid token is not rejected there.
3. Each route handler does its own authentication and role check from `req.headers.get("user")`.

The handlers trust the `user` header completely, so the 403 check must stay first in the middleware, and the matcher must cover every API route.

Keep the file as `middleware.ts` despite Next's deprecation warning: renaming it to `proxy.ts` changes the runtime from Edge to Node, and with it header behavior the Android app depends on. Retest before changing it.

Anything read from a request body and used in a Prisma `where` must be type-checked: `undefined` drops the filter and an object becomes an operator (see the login route).

Pages have no server-side protection. `src/components/admin/app-shell.tsx` calls `/api/user` on each navigation and sends anyone who isn't an admin or manager to `/login`. That is UX only.

Role and account status are read from the token or at login only, so changing either doesn't affect tokens already issued.

## Roles

`admin`, `manager`, `staff` (collectors) and `customer` are plain strings with no enum. Permissions differ per handler, and the error messages are often copy-pasted, so read the condition, not the message.

- The web portal admits only admins and managers. It hides actions the API would refuse (see `useSession`), so update the UI when a route's role check changes.

## Android app (live client)

The collectors' Kotlin app (`../jsp-staff` on the owner's machine) calls production at `jsp-credit.vercel.app`. Installed copies can't be updated with a deploy, so don't change the inputs, outputs or status codes of what it uses:

- `POST /api/user/login`, `GET /api/user`, `POST /api/visit`, `GET /api/visit/current`, `GET /api/visit/current/summary`, `GET /api/user/search`, `GET /api/loan/ongoing`, `POST /api/payment`
- `user/search` is called with the **raw token, without `Bearer `**. Token parsing must keep accepting both forms.
- Error bodies on login, user and visit calls are parsed as `{message}`.
- DTO fields are matched by exact name, including the misspelled `recieptNumber` and `numberOfInstallemnts`.

## Domain model

- **Customers and employees are all `User` rows**, distinguished by `role`. The primary key is `nic` (national ID), and every user foreign key (`customerId`, `issuedBy`, `collectorId`, `managerId`) holds a NIC. `email` is unique but nullable, yet the update and password routes look users up by email.
- **Prisma model casing is mixed**: `User` and `Loan`, but lowercase `visit` and `payment`. Table names match, so renaming a model requires a migration.
- **Visit lifecycle**: a collector opens a visit (`started`, one at a time). Each payment attaches to the caller's open visit, never to a visit id from the request. An admin or manager confirms the cash through `/api/visit/verify`, which sets `ended`, `managerId` and `notes`. `endDateTime` is never written.
- **Loan lifecycle**: created as `active`, despite the schema default of `pending`. Reaching `paidAmount >= totalAmount` does not change the status: the loan appears under "pending-complete" (a query, not a status) until an admin sets it to `completed`.
- **`Loan.paidAmount` is denormalized** from `payment` rows. `POST /api/payment` updates both in one transaction with a database-side `increment`; any new code that changes payments must do the same. Older data can be off (see `scripts/check-paid-amounts.mjs`).
- **Loan math** is simple interest: `total = amount + amount * rate% * durationMonths` and `installment = total / durationDays`. Months and days are independent inputs. `src/lib/loan-math.ts` calculates total and installment (and back-solves rate or days when those are edited). The server stores them as sent and recomputes only `interestAmount`, so a formula change touches both `src/lib/loan-math.ts` and `src/app/api/loan/route.ts`.
- `updatedAt` columns have no `@updatedAt` and are never updated. Money is stored as `Float`.

## API and UI contracts

- Parameters go in query strings or JSON bodies. There are no dynamic `[id]` segments.
- Response envelopes vary:
  - `/api/loan`, `/api/loan/completed` and `/api/visit` return `{<items>, pageInfo: {page, limit, total, totalPages}}`.
  - Most other lists return bare arrays.
  - The loan list routes return a bare, unpaginated array of the *caller's own* loans, not a 403, to roles without list access. For `completed` and `pending-complete` that is everyone except admin, and the status filter is dropped.
- Any `User` query whose result is returned or logged needs `omit: { password: true }`. Writes of a password need `.catch(hideQueryArgs)` (`src/lib/prisma-errors.ts`) or their own catch that doesn't expose `e.message`, because Prisma errors quote the query's arguments.
- Several handlers have branches that return no response (e.g. no `user` header, or a payment with no open visit).
- `VisitTable` fetches `/api/visit/extended` for each row, as the list routes have no names or totals.
- There is no API to edit a loan or delete a user, so the UI offers neither.
- The old summary route (`/api/summary`, no longer used by the UI) compares with `lte`, so send end-of-day ISO timestamps, not bare dates.

## Analytics dashboard

The admin home page (`src/components/dashboard/`) is a grid of widgets that users can drag, resize and configure, saved as shared layouts.

- `GET /api/analytics?metric=…&from=&to=` (admin and manager, read-only) serves every widget. Metric SQL is in `src/lib/analytics/metrics.ts`, whose header defines the rules: Sri Lanka calendar days, exact decimal sums, installments due daily from the day after issue, "as of" figures at the end of the range, and closed loans excluded from the open portfolio. `METRICS` in `definitions.ts` lists which filters each metric honours, and the UI shows the rest as ignored.
- `/api/dashboard-layouts` stores layouts in the `dashboard_layout` table, shared and editable by every admin and manager. Saves send the `version` they loaded, and a stale save gets 409. `parseConfig` in `src/lib/analytics/layout.ts` validates layouts on both server and client.
- Both new routes use `requirePortalUser` (`src/lib/server-auth.ts`) and the shared Prisma client. They were added without changing any existing table or endpoint; keep it that way.
- The metrics were verified to the cent against an independent calculation on randomized data. Any change to a metric needs the same kind of check.
- Chart colors are the three in `SERIES` (`charts.tsx`), validated for colour-blind separation and contrast. Don't add a fourth without re-validating.

## Code conventions

- Import the Prisma client with `import prisma from "@/lib/prisma"`. Most existing routes create their own `new PrismaClient()`; don't copy that.
- `src/types/*` are handwritten client-side types, not derived from Prisma, and need updating alongside schema changes.
- All admin pages are client components that fetch from the API. There are no server actions or server-side data loading.
- Colors are semantic tokens (`primary`, `brand`, `highlight`, `success`...) defined in `src/app/globals.css`. Don't use raw palette colors. Toasts use `react-hot-toast`, mounted in the root layout.
- Build screens from `src/components/shared/` (`DataTable`, `Field`, `ConfirmDialog`, `PageHeader`, feedback states) and load data with `useResource`. Don't use `window.confirm`.
- The home page (`src/app/page.tsx`) is sample copy with placeholder contact details.
- `src/components/ui/` holds primitives only. App components live in `src/components/admin/`.
