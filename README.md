# TeamAssist

TeamAssist is a multitenant project management platform built on the MERN stack. It supports collaborative workspaces, granular roles, end-to-end task workflows, and real-time clarification threads so teams can resolve blockers quickly. The repository contains both the backend API and the React client.

## Features

- Authentication with email/password sessions and Google OAuth.
- Workspace onboarding with invite-based membership and role assignment (owner, admin, member).
- Project and task management with priorities, assignees, due dates, and audit data.
- Role-aware task editing that restricts updates to owners, admins, and designated assignees.
- Clarification threads on each task so members can ask questions and owners/admins can respond.
- Workspace analytics and filtering to surface workload trends.
- Seed scripts and utility helpers to bootstrap role/permission data.

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, Mongoose, Passport (Google OAuth), Zod.
- **Frontend**: React (Vite), TypeScript, TanStack Query, Tailwind CSS, Shadcn UI, Radix primitives.
- **Database**: MongoDB.

## Repository Layout

```
.
├── backend/        # Express API, models, services, middlewares
├── client/         # React application
└── README.md       # Project overview (this file)
```

## Prerequisites

- Node.js 18+
- npm 9+ or an equivalent package manager
- MongoDB instance (local or hosted)
- Google OAuth Client credentials for optional social sign-in

## Environment Variables

Create a `.env` file under `backend/` using the template below. Ensure you keep real credentials out of version control.

```
PORT=8000
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>/teamassist
SESSION_SECRET=<session-secret>

GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
GOOGLE_CALLBACK_URL=http://localhost:8000/api/auth/google/callback

FRONTEND_ORIGIN=http://localhost:5173
FRONTEND_GOOGLE_CALLBACK_URL=http://localhost:5173/google/callback
```

## Local Development

### 1. Install dependencies

```bash
cd backend
npm install

cd ../client
npm install
```

### 2. Seed base roles (optional)

From the `backend/` directory you can populate default roles and permissions:

```bash
npm run seed:roles
```

### 3. Start the servers

Run the API:

```bash
cd backend
npm run dev
```

Run the client in a separate terminal:

```bash
cd client
npm run dev
```

The frontend defaults to `http://localhost:5173`, while the API listens on the port defined in `PORT` (8000 by default).

## Testing & Linting

- Backend scripts are defined in `backend/package.json`.
- Client linting uses the Vite/ESLint configuration in `client/eslint.config.js`.

## Security Notes

- Never commit real secrets to the repository. Use the example variables as placeholders only.
- Rotate OAuth credentials immediately if they were previously exposed.

## Further Improvements

- Add end-to-end tests for the clarification workflow.
- Integrate real-time notifications for clarification updates.
- Automate CI/CD pipelines for backend and frontend deployments.

