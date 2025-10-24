# TeamAssist Client

This directory contains the React front-end of TeamAssist. It provides the workspace dashboard, task management screens, and the task clarification experience that complements the backend API.

## Scripts

- `npm run dev` – start the Vite development server on `http://localhost:5173`.
- `npm run build` – produce a production build in `dist/`.
- `npm run preview` – preview the production build locally.

## Environment

The client reads API locations and OAuth callback URLs from the backend configuration. Ensure the backend `.env` file exposes `FRONTEND_ORIGIN` and `FRONTEND_GOOGLE_CALLBACK_URL` that match the host running this app (defaults to `http://localhost:5173`).

If you need client-specific overrides, create a `.env.local` file in this directory and prefix variables with `VITE_`, for example:

```
VITE_API_BASE_URL=http://localhost:8000/api
```

## Directory Highlights

- `src/components/` – UI components, including task dialogs and clarification widgets.
- `src/hooks/` – React Query hooks for API interactions.
- `src/context/` – authentication and workspace providers.
- `src/lib/api.ts` – API client wrappers shared across hooks.

## Development Tips

- Keep API changes mirrored in `src/types/api.type.ts` to maintain type safety.
- Use the provided React Query cache keys when mutating tasks or clarifications so UI state stays in sync with the backend.
- Tailwind CSS classes live in `index.css` and `tailwind.config.js`; update them when introducing new design tokens.
