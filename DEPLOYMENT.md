# Deploying SchoolSync to production

This guide takes the app from local SQLite to a live, installable PWA on Vercel
with PostgreSQL and push notifications. Steps marked **(do once)** are one-time
setup; the rest repeat on every release.

---

## 0. Why this is mostly config, not code

Our schema was deliberately written to the **SQLite common denominator** — no
native enums, no `Json` columns, no scalar arrays (all modelled as `String`). The
happy side effect: the same `schema.prisma` is **PostgreSQL-compatible as-is**.
The only change for production is the datasource `provider` and the connection
URL.

---

## 1. Create a production database (do once)

Use **Supabase** (or Neon) free tier:

1. Create a project → note the **database password**.
2. Settings → Database → Connection string:
   - **Pooled** ("Transaction" / port 6543) → `DATABASE_URL` (serverless needs the pooler).
   - **Direct** (port 5432) → `DIRECT_URL` (migrations).

Then point Prisma at Postgres. In `prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"   // was "sqlite"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

> Keep a separate local `.env` with the SQLite URL for development, or switch the
> provider only on the deploy branch. Don't commit the Postgres switch if you
> still develop locally on SQLite.

## 2. Migrations: `dev` vs `deploy`

- `npx prisma migrate dev` — **development only**. It diffs your schema, *creates*
  a new migration file, applies it, and may **reset the database** if it detects
  drift. Destructive and interactive — never run against production data.
- `npx prisma migrate deploy` — **production**. It only *applies* already-created
  migration files, in order, non-interactively. No prompts, no data loss, no
  schema diffing. This is what runs against the live DB.

First production migration (do once), against the production `DATABASE_URL`:

```bash
# Generate the migration history locally (on the Postgres provider):
npx prisma migrate dev --name init        # creates prisma/migrations/* (dev DB)
# Against production:
DATABASE_URL="<prod>" npx prisma migrate deploy
DATABASE_URL="<prod>" npm run db:seed     # creates the first school + principal
```

(If you've only ever used `db push` locally, run `prisma migrate dev --name init`
once to capture the current schema as the baseline migration.)

## 3. Environment variables (do once)

Copy `.env.production.example` and set every key in **Vercel → Settings →
Environment Variables** (not in git). Generate fresh secrets:

```bash
openssl rand -base64 32                                   # NEXTAUTH_SECRET
node -e "console.log(require('web-push').generateVAPIDKeys())"  # VAPID pair
```

`.env` is git-ignored (see `.gitignore`). **Never commit real secrets** — a leak
means anyone can forge sessions (`NEXTAUTH_SECRET`) or read the DB
(`DATABASE_URL`). If one leaks: rotate it immediately in the provider + Vercel.

## 4. Deploy to Vercel

1. Push the repo to GitHub.
2. Vercel → New Project → import the repo. Framework auto-detects **Next.js**;
   build command `npm run build`, output handled automatically.
3. Add the env vars (step 3). Add a build step to apply migrations — set the
   **Build Command** to `prisma migrate deploy && next build` (or a `postinstall`
   `prisma generate`).
4. Deploy. Verify the production URL loads and login works.

**What Vercel does on each `git push`:** detects the push → runs `npm run build`
(compiles TS, bundles client JS, pre-renders static pages, turns each API route
into a **serverless function**) → uploads static assets to the **CDN** → deploys
the functions → assigns a URL. Every PR also gets its own **preview URL**.

## 5. Custom domain + HTTPS (optional)

Vercel → Domains → add `your-school.com`. Then at your DNS registrar:
- Apex (`your-school.com`) → **A record** to Vercel's IP (shown in the dashboard).
- `www` → **CNAME** to `cname.vercel-dns.com`.

DNS maps the human name to Vercel's servers; Vercel issues HTTPS automatically.
Update `NEXTAUTH_URL` to the final domain.

## 6. PWA icons & screenshots (do once)

`public/icons/` ships 192 & 512px. For the richest install experience add the
full set (72/96/128/144/152/192/384/512) and 2 screenshots, referenced from
`public/manifest.json`. Sizes map to devices: 192 = Android home screen, 512 =
splash screen, 152/167 = iPad, 180 = iOS home screen, smaller ones = legacy.

## 7. Post-deployment checklist

- Seed the production school + principal (step 2), then log in and run the full
  flow: principal → create class → add student → add parent → parent logs in.
- Test PWA install on **Android Chrome**, **iOS Safari** (Share → Add to Home
  Screen), **Desktop Chrome**.
- Test push on Android (works in background) — iOS requires the app be **installed
  to the home screen first** (iOS only allows web push for installed PWAs).
- Enable **Vercel Analytics** for performance monitoring.

## 8. Monitoring & maintenance

- **Error tracking:** add Sentry (free tier) or use Vercel's runtime logs. When a
  user hits an error, it's captured server-side with a stack trace — you find out
  without them reporting it.
- **Uptime:** add the production URL to **UptimeRobot** (pings every 5 min, alerts
  on downtime).
- **Backups:** Supabase auto-backs up on paid tiers; on free tier schedule a
  weekly `pg_dump` export of the critical tables.
