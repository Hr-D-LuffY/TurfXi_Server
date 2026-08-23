# TurfXI — Backend

Base project setup for the TurfXI backend. This is a skeleton only — routes,
controllers, and services are stubbed with `TODO` comments, ready for each
module owner to fill in.

## Tech stack

| Layer | Tool |
|---|---|
| Framework | Express 5 (TypeScript, native ESM) |
| Database | PostgreSQL |
| ORM | Prisma 7 (driver-adapter architecture — no Rust query engine) |
| Auth | Passport.js (JWT + Google OAuth) |
| Cache / real-time backbone | Redis (ioredis) |
| Background jobs | BullMQ |
| Real-time | Socket.io (Redis adapter) |
| Validation | Zod 4 |
| Payments | SSLCommerz (sandbox) |
| Security | Helmet, express-rate-limit |
| Runtime | tsx — TypeScript runs directly, no separate build step |

## Getting started

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL, JWT secrets, etc.
npx prisma generate         # generates the Prisma client into src/generated/prisma
npx prisma migrate dev      # creates the DB schema from prisma/schema.prisma
npm run dev                 # starts the API on http://localhost:5000
```

To run the background worker (BullMQ) as a separate process:

```bash
npm run worker:dev    # dev, with watch
npm run worker:start  # plain start
```

### Note on Prisma 7

Prisma 7 dropped the old Rust query-engine binary entirely — it connects
through a **driver adapter** instead (`@prisma/adapter-pg`, using the `pg`
package directly). A few things that are different from Prisma 5/6 setups
you may have seen before:

- Connection config lives in `prisma.config.ts` at the project root, not
  in `schema.prisma` — `DATABASE_URL` is still read from `.env`, just via
  that file now.
- `schema.prisma`'s generator block outputs the client to
  `src/generated/prisma` instead of `node_modules` — this folder is
  git-ignored and gets created by `npx prisma generate`. **You need real
  internet access for this** — it still needs to reach Prisma's CDN for
  one binary (the schema engine, used by the CLI for parsing/migrations;
  the actual query engine is gone).
- `src/config/db.ts` builds a `PrismaPg` adapter from `DATABASE_URL` and
  passes it into `new PrismaClient({ adapter })` — a bare `new
  PrismaClient()` is no longer valid in v7.

### Note on `verbatimModuleSyntax`

This tsconfig has `verbatimModuleSyntax: true`. In practice: anything
imported *only* for its type (like Express's `Request`/`Response`) must use
`import type { ... }`, not `import { ... }`. TypeScript will error and tell
you exactly which import needs it if you get it wrong — it's a compile
error, not a lint warning, so you'll never miss it.

### Note on imports — no `.js` extensions

`moduleResolution` here is `"bundler"`, and both `dev`/`start` run the
TypeScript source directly through `tsx` (never a compiled `dist/*.js` via
plain `node`) — so relative imports stay extension-free (`from './env'`,
not `from './env.js'`).

## Project structure

```
src/
  server.ts        # HTTP + Socket.io bootstrap
  app.ts            # Express app: middleware + route mounting
  config/           # env validation, Prisma client, Redis, Passport, Socket.io setup
  middleware/        # requireAuth, requireRole, requireTier, error handler
  modules/           # one folder per feature — routes / controller / service
    auth/
    turfs/
    bookings/
    wallet/
    splitBilling/
    cancellations/
    missingPlayers/
    teams/
    matchStats/
    tournaments/
    notifications/
    messaging/
    ratings/
    admin/
  jobs/              # BullMQ queue + worker
  types/             # shared TS type augmentations (e.g. req.user)
  utils/             # logger, etc.
  generated/         # git-ignored — Prisma 7's generated client lands here
prisma/
  schema.prisma      # starter schema — build this out together first
prisma.config.ts      # Prisma 7 connection config
```

Each module follows the same shape:

```
modules/<name>/
  <name>.routes.ts       # Express router, mounted in src/app.ts
  <name>.controller.ts   # request handlers
  <name>.service.ts      # business logic / Prisma queries
```

## Before splitting into individual work

Everyone should agree on and build together first:

1. **Full Prisma schema** — all models/relations for turfs, bookings,
   wallet, split-billing, teams, tournaments, etc. Only `User` exists so far.
2. **Auth flow** — email/password + Google OAuth, JWT issuing + refresh.
3. **Shared middleware** — `requireAuth`, `requireRole`, `requireTier` in
   `src/middleware/auth.ts` are stubbed; confirm the shape of `req.user`
   once the User model is finalized.

See `docs/tracking/` (separate deliverable) for how this team is tracking
that work.

## Known upstream issue

`npm install` currently reports 3 high-severity advisories. All three trace
back to `deepmerge-ts`, a transitive dependency inside Prisma's own CLI
config-loading code (`@prisma/config`) — not your runtime app code. Fixing
it means downgrading Prisma below v7, which defeats the purpose of this
upgrade. Worth re-checking `npm audit` occasionally in case Prisma ships a
patched release.

## Module ownership

| Module(s) | Owner |
|---|---|
| turfs, bookings | |
| wallet, splitBilling | |
| cancellations, missingPlayers, teams | |
| matchStats, tournaments | |
| notifications, messaging, ratings, admin | |
