# Self-hosted Backend

Node + Express + PostgreSQL replacement for the Supabase backend that the
frontend was originally built against.

## Setup

1. Create a PostgreSQL database, e.g. `health_monitoring`.
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`.
3. Install deps and run migrations:
   ```bash
   cd backend
   npm install
   npm run migrate
   ```

## Run

```bash
npm run dev
```

The API listens on `http://localhost:4000` by default.

## Endpoints

- `POST /auth/signup` — `{ email, password, full_name? }` → `{ user, session }`
- `POST /auth/signin` — `{ email, password }` → `{ user, session }`
- `POST /auth/refresh` — `{ refresh_token }` → `{ session }`
- `POST /auth/signout` — no-op
- `GET  /auth/me` — returns current user
- `GET  /rest/v1/:table?select=*&col_eq=val&col_gte=...&order=col&ascending=true&limit=5`
- `POST /rest/v1/:table` (body = row)
- `PATCH /rest/v1/:table` (body = partial row)
- `DELETE /rest/v1/:table`
- `POST /rpc/seed_demo_health_data` — `{ target_user_id }` populates demo data

All `/rest/v1` and `/rpc` routes require `Authorization: Bearer <access_token>`.

## Frontend

Set `VITE_API_URL` in the project's `.env` (defaults to `http://localhost:4000`).

The frontend's `src/lib/supabase.ts` is a drop-in replacement for the
`@supabase/supabase-js` client: the existing call sites work unchanged.
