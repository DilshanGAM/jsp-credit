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
```

- There is no test suite or test runner.
- There is no linter. Use the type check instead.
- Node 22 (pinned in `engines`, which Vercel honors). Prisma is deliberately on 6.x: 7 needs a configuration and driver migration.
- `.env` needs `DATABASE_URL` and `JOSE_SECRET` (HS256 signing key for JWTs).

## Auth

1. `POST /api/user/login` returns a 48h JWT with `{email, name, phone, role, nic}`. The browser keeps it in `localStorage.token`, and each call site attaches `Authorization: Bearer <token>` by hand (there is no shared API client).
2. `src/middleware.ts` runs on `/api/*` only. It rejects (403) any request that already carries a `user` header, then verifies the token and writes the payload as JSON into that header. A missing or invalid token is not rejected there.
3. Each route handler does its own authentication and role check from `req.headers.get("user")`.

The handlers trust the `user` header completely, so the 403 check must stay first in the middleware, and the matcher must cover every API route.

Keep the file as `middleware.ts` despite Next's deprecation warning: renaming it to `proxy.ts` changes the runtime from Edge to Node, and with it header behavior the Android app depends on. Retest before changing it.

Anything read from a request body and used in a Prisma `where` must be type-checked: `undefined` drops the filter and an object becomes an operator (see the login route).

Pages have no server-side protection. `src/app/admin/layout.tsx` checks that a token exists and calls `/api/user`, but it doesn't check the response status or the role.

Role and account status are read from the token or at login only, so changing either doesn't affect tokens already issued.

## Roles

`admin`, `manager`, `staff` (collectors) and `customer` are plain strings with no enum. Permissions differ per handler, and the error messages are often copy-pasted, so read the condition, not the message.

- The web login redirects only admins and managers.

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
- **Loan lifecycle**: created as `active`, despite the schema default of `pending`. Reaching `paidAmount >= totalAmount` does not change the status: the loan appears under "pending-complete" (a query, not a status) until an admin sets it to `completed`. The status select in `LoanForm` (pending/approved/rejected) is ignored by the API.
- **`Loan.paidAmount` is denormalized** from `payment` rows. `POST /api/payment` updates both in separate writes without a transaction. Any new code that changes payments must maintain it.
- **Loan math** is simple interest: `total = amount + amount * rate% * durationMonths` and `installment = total / durationDays`. Months and days are independent inputs. `LoanForm` calculates total and installment (and back-solves rate or days when those are edited). The server stores them as sent and recomputes only `interestAmount`, so a formula change touches both `src/components/LoanForm.tsx` and `src/app/api/loan/route.ts`.
- `updatedAt` columns have no `@updatedAt` and are never updated. Money is stored as `Float`.

## API and UI contracts

- Parameters go in query strings or JSON bodies. There are no dynamic `[id]` segments.
- Response envelopes vary:
  - `/api/loan`, `/api/loan/completed` and `/api/visit` return `{<items>, pageInfo: {page, limit, total, totalPages}}`.
  - Most other lists return bare arrays.
  - The loan list routes return a bare, unpaginated array of the *caller's own* loans, not a 403, to roles without list access. For `completed` and `pending-complete` that is everyone except admin, and the status filter is dropped.
- User queries have no `select`, so responses built from whole `User` rows include the password hash.
- Several handlers have branches that return no response (e.g. no `user` header, or a payment with no open visit).
- Paginated pages use `src/components/pager.tsx`. The loan pages refetch by resetting a `loansLoaded` flag through `reloader`, while the visits page refetches on `pageInfo.page` and passes a no-op.
- `VisitCard` fetches `/api/visit/extended` itself, so visit lists make one request per card.
- Some UI actions call endpoints that don't exist: loan Edit (`PUT /api/loan`) and user/customer Delete (`DELETE /api/user/<email>`).

## Code conventions

- Import the Prisma client with `import prisma from "@/lib/prisma"`. Most existing routes create their own `new PrismaClient()`; don't copy that.
- `src/types/*` are handwritten client-side types, not derived from Prisma, and need updating alongside schema changes.
- All admin pages are client components that fetch from the API. There are no server actions or server-side data loading.
- Brand colors are Tailwind tokens in `tailwind.config.ts` (e.g. `blueGreen`, `baseGreen`). Toasts use `react-hot-toast`, mounted in the root layout.
- `src/components/ui/` is mostly shadcn output, but `customer-search.tsx` there is app code that calls the API.
