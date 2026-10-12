# Release 2026-10-12 — branch `release/2026-10-12`

## Live in this release
- **Public website** in the new black & white design: homepage, Architecture, Construction, Properties (buy / rent / sell), Projects, Progress, Investment, News, Contact, Privacy, Terms.
- **Buyer portal** (`/portal`): bookings, payments, documents, progress, profile, change password.
- **Admin** (`/admin`): dashboard, customers, bookings & payments, projects, properties, investments, documents, staff, permissions, website content, audit log. Admins also see incoming **leads** on `/sales`.
- Contact, callback, sell-property and investor forms (leads go to the admin's leads list).

## Built but switched off (release switches)
Set in production: `DISABLED_FEATURES="sales,pm,chatbot"`

| Switch | Effect while off |
|---|---|
| `sales` | Sales staff who sign in with the correct password see "Staff portal coming soon". Admins still use `/sales`. |
| `pm` | Same "coming soon" message for project managers. Admins still use `/pm`. |
| `chatbot` | The chat button stays; it opens a "Coming soon" panel with Call and WhatsApp. `/api/chat*` return 404. |

To turn a part on later, remove it from `DISABLED_FEATURES` and redeploy. No code change is needed.

## Production environment
| Variable | Value |
|---|---|
| `DATABASE_URL` | Hosted PostgreSQL (pooled). See `DEPLOYMENT.md` in the project folder. |
| `SITE_URL` | `https://www.faryk.com` |
| `STORAGE_DRIVER` | `s3` + `S3_*` bucket settings (local disk is not kept on serverless hosts) |
| `DISABLED_FEATURES` | `sales,pm,chatbot` |

Database: `npx prisma migrate deploy`, then (empty database only) `ALLOW_SEED_RESET=yes npm run db:seed`.

## Before go-live
- [ ] Replace demo accounts and the shared demo password; change the admin password.
- [ ] Confirm the two hero photos may be used (they show third-party brands).
- [ ] Fill Admin → Website content → Home page details (years, hours, testimonials, social links).
- [ ] Have a native speaker review the Urdu chatbot text before the chatbot is switched on.

## Checks run for this release
Typecheck, lint and production build pass. End-to-end: 24 checks with the production switches on, plus the full suite (229 checks + 16 browser checks) with everything on.
