# Banking App

Full-stack Angular 19 banking app with a Postgres-backed Express API, role-based feature controls, interactive chatbot actions, and deploy-ready hosting for Vercel plus Render.

## Stack

- Frontend: Angular 19
- Backend: Express 5
- Database: Postgres
- Auth: JWT, server-side session validation, password hashing, lockout protection
- Hosting target: Vercel for web, Render for API and Postgres

## Product Features

- role-based experiences for `admin`, `customer`, and `company`
- login/logout activity auditing
- dashboard, accounts, payments, company hub, profile, and user-management flows
- chatbot that can answer questions and trigger supported banking actions
- permission-aware UI and backend authorization checks
- editable profile settings
- admin/company user creation, editing, and removal

## Current Data Model

The backend no longer uses JSON blobs as its live runtime datastore.

Normalized Postgres tables now back the app:

- `users`
- `workspaces`
- `company_workspaces`
- `accounts`
- `account_transactions`
- `activity_entries`
- `chat_messages`

The seed file at [server/data/db.json](/C:/Users/adish/Downloads/myApps/portfolio/banking/server/data/db.json) is now used only to bootstrap demo data through the seed and repair scripts.

## Security Model

The app currently includes:

- hashed passwords using Node crypto
- JWT auth
- active `sessionId` binding between token and server session
- server-side session expiry
- failed login tracking
- temporary lockouts after repeated failed login attempts
- audit logging for auth and admin actions

This is a strong demo setup, but it is still not a production-grade banking security implementation.

## User Roles

### Admin

- full banking access
- company hub access
- profile editing
- permission management
- user create, edit, and delete

### Customer

- standard banking access
- reduced permissions
- no user-management access

### Company

- company workspace access
- profile editing
- user create, edit, and delete for company/customer users
- no admin-only permission-management features

## Demo Credentials

- `admin / admin2026`
- `customer / customer2026`
- `company / company2026`

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Postgres database

Create a database named `banking_app`.

### 3. Create your env file

Copy [.env.example](/C:/Users/adish/Downloads/myApps/portfolio/banking/.env.example) to `.env` and set real values:

```env
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@127.0.0.1:5432/banking_app
JWT_SECRET=replace-with-a-strong-secret
JWT_EXPIRES_IN=8h
SESSION_TTL_MS=28800000
MAX_FAILED_LOGINS=5
LOCKOUT_WINDOW_MS=900000
CLIENT_ORIGIN=http://localhost:4200
```

### 4. Run migrations and seed

```bash
npm run db:init
```

Available database commands:

- `npm run db:migrate`
- `npm run db:seed`
- `npm run db:repair-normalized`
- `npm run db:init`

### 5. Start the app

```bash
npm run dev
```

This starts:

- frontend: `http://localhost:4200`
- backend: `http://localhost:4000`

## API Notes

The frontend API client lives in [src/app/core/api.service.ts](/C:/Users/adish/Downloads/myApps/portfolio/banking/src/app/core/api.service.ts).

- local development uses `http://localhost:4000/api`
- production uses the deployed Render backend directly: `https://banking-jmkt.onrender.com/api`

This avoids relying on Vercel proxy rewrites for API requests.

## Deployment Overview

Production hosting should be split like this:

- Vercel: Angular frontend
- Render Web Service: Express API
- Render Postgres: database

## Deploy To Render

### Option 1. Blueprint from `render.yaml`

1. Push this repo to GitHub.
2. In Render, choose `New +` -> `Blueprint`.
3. Select this repo.
4. Render will read [render.yaml](/C:/Users/adish/Downloads/myApps/portfolio/banking/render.yaml) and create:
   - a web service named `banking-api`
   - a Postgres database named `banking-postgres`
5. After creation, open the web service and set or verify:
   - `JWT_SECRET`
   - `CLIENT_ORIGIN`
6. Set `CLIENT_ORIGIN` to your final Vercel domain, for example `https://your-app.vercel.app`.
7. Deploy the service.

The Render API should expose endpoints like:

- `https://your-render-service.onrender.com/api/health`
- `https://your-render-service.onrender.com/api/auth/login`

### Option 2. Manual Render setup

1. Create a new Postgres database in Render.
2. Create a new Web Service connected to this repo.
3. Configure:
   - Build Command: `npm install && npm run db:init`
   - Start Command: `npm run start:api`
4. Add env vars:
   - `DATABASE_URL` = Render Postgres connection string
   - `JWT_SECRET` = strong secret
   - `CLIENT_ORIGIN` = your Vercel frontend URL
5. Deploy.

## Deploy To Vercel

1. Create a new Vercel project from this same repo.
2. Framework preset can stay as detected/static because [vercel.json](/C:/Users/adish/Downloads/myApps/portfolio/banking/vercel.json) already defines:
   - build command
   - output directory
   - SPA fallback
3. Deploy the project.

No Vercel API rewrite is required in the current setup because the production frontend calls the Render backend directly.

## Make The App Interactive In Production

For users to fully interact with the deployed app:

1. Deploy Render first and get the live backend URL.
2. Confirm Render API health at `/api/health`.
3. Set Render `CLIENT_ORIGIN` to your Vercel domain.
4. Deploy Vercel.
5. Test login, dashboard data, chatbot actions, profile updates, and user management.

## Recommended Production Checks

After deployment, verify:

- login works for all three demo roles
- activity entries are being written
- chatbot actions persist to Postgres
- created users remain after refresh
- profile edits persist
- company data loads for the company role
- the frontend can reach `https://banking-jmkt.onrender.com/api` successfully

## Known Limits

- this is still a demo banking app, not a real banking platform
- there is no refresh-token rotation yet
- secrets management is environment-based, not enterprise-grade
- no backend integration tests yet

## Key Paths

- frontend API client: [src/app/core/api.service.ts](/C:/Users/adish/Downloads/myApps/portfolio/banking/src/app/core/api.service.ts)
- backend entry: [server/index.js](/C:/Users/adish/Downloads/myApps/portfolio/banking/server/index.js)
- Postgres layer: [server/lib/db.js](/C:/Users/adish/Downloads/myApps/portfolio/banking/server/lib/db.js)
- migrations: [server/migrations](/C:/Users/adish/Downloads/myApps/portfolio/banking/server/migrations)
- Render config: [render.yaml](/C:/Users/adish/Downloads/myApps/portfolio/banking/render.yaml)
- Vercel config: [vercel.json](/C:/Users/adish/Downloads/myApps/portfolio/banking/vercel.json)
