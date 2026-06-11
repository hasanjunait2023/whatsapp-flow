# whatsapp-flow (self-hosted)

pnpm monorepo migrating off Supabase cloud to a self-hosted Node/Hono + SQLite backend.

## Workspace layout

```
apps/web/        # Vite React SPA (moved from repo root; zero logic changes)
apps/server/     # Hono + Drizzle (SQLite) + better-auth backend
packages/shared/ # API contract types shared by web and server
supabase/        # legacy reference: 71 edge functions + migrations (ported in later phases)
```

## Quickstart (local dev)

```sh
pnpm install                       # requires Node >= 22, pnpm 9
# server env
cp apps/server/.env.example apps/server/.env   # set AUTH_SECRET (32+ chars)

pnpm --filter server migrate       # apply SQLite schema (drizzle)
pnpm --filter server seed          # demo tenant + owner@demo.test / demo-password-123
pnpm dev                           # runs web (8080) + server (3000); /api proxied in dev
```

## Scripts (root)

- `pnpm dev` — web + server in parallel
- `pnpm build` — web (vite) + server (tsc)
- `pnpm test` — server + web vitest suites
- `pnpm --filter server migrate` / `seed`

The SPA talks to the backend through a drop-in supabase shim
(`apps/web/src/integrations/supabase/client.ts`), so existing call sites are unchanged.

---

# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
