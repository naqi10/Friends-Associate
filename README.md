# FARYK.COM — Web application

Next.js site for FARYK (architecture, construction, real estate).

**Full implementation list:** see [`../IMPLEMENTATION.md`](../IMPLEMENTATION.md) in the repo root.

## Quick start

```bash
npm install
npm run db:setup
npm run dev
```

Open http://localhost:3000

## Demo login

Password for all seed accounts: **`Faryk@2026`**

| Role | Email |
|------|--------|
| Buyer | ahmed.malik@example.com |
| Sales | sales@faryk.com |
| PM | pm@faryk.com |
| Admin | admin@faryk.com |

## Database

- Local: SQLite file `prisma/dev.db` (see `.env`)
- Production: set `DATABASE_URL` to PostgreSQL and run `prisma db push` / migrate

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run db:setup` | Create DB + seed sample data |
| `npm run db:seed` | Re-run seed only |

## Uploads

Document files go to `uploads/public` or `uploads/private`. Configure via Admin → Documents.
