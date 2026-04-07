# Banking App

Full-stack Angular 19 banking app with a Node/Express backend API and Postgres persistence.

## Stack

- Frontend: Angular 19
- Backend: Express
- Auth: JWT plus server-side session validation
- Database: Postgres

## Local development

1. Create a Postgres database, for example `banking_app`
2. Copy `.env.example` to `.env` and update `DATABASE_URL` and `JWT_SECRET`
3. Install dependencies
4. Initialize the database schema and seed data
5. Run the frontend and backend

```bash
npm install
npm run db:init
npm run dev
```

This starts:

- Angular frontend on `http://localhost:4200`
- API server on `http://localhost:4000`

## What the API handles

- authentication and session bootstrap
- user role and permission lookup
- user create, edit, and remove flows
- account fetch/detail CRUD
- activity fetch/create
- profile updates
- transfers, card payments, and freeze/unfreeze actions
- chatbot requests

## Demo users

- `admin / admin2026`
- `customer / customer2026`
- `company / company2026`

The first `db:init` against an empty database seeds these demo accounts automatically.

## Environment variables

- `DATABASE_URL`: Postgres connection string
- `JWT_SECRET`: strong secret used to sign auth tokens
- `JWT_EXPIRES_IN`: token lifetime, default `8h`
- `SESSION_TTL_MS`: server session lifetime in milliseconds
- `MAX_FAILED_LOGINS`: failed login attempts before lockout
- `LOCKOUT_WINDOW_MS`: lockout duration in milliseconds
- `CLIENT_ORIGIN`: allowed frontend origin for CORS

## Deployment

- Vercel: host the Angular frontend
- Render: host the Express API and provision the Postgres database using `render.yaml`

In production, point frontend `/api` traffic at the Render backend hostname and set `CLIENT_ORIGIN` to the deployed Vercel domain.
