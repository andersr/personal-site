# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

pnpm workspace monorepo for <https://www.anders.co>, deployed on Vercel. Package manager is **pnpm** (CI and the pre-commit hook both use it; don't add an npm lockfile). Node 24 (pinned in `.nvmrc`, which the pre-commit hook uses).

- `apps/site` — Astro 7 static site + MDX blog (package name `site`)
- `apps/admin` — React Router 8 (framework mode, SSR) admin for authoring posts, served at `admin.anders.co` on Fly.io (see below)
- `packages/content` — `@repo/content`: blog frontmatter schema and content conventions shared by the site and future admin app. Exports raw `.ts` (no build step); its `zod` version must match the one Astro bundles (`astro/zod`) so both resolve to a single copy
- `apps/*` / `packages/*` — workspace globs in `pnpm-workspace.yaml`

Repo-wide tooling lives at the root: husky, lint-staged, Prettier (`.prettierrc.mjs`), CI. Each app owns its own `tsconfig.json`, `eslint.config.js`, and `.env`. Vercel's project for the site uses `apps/site` as its root directory; the admin deploys to Fly.io instead (Vercel doesn't support React Router 8 yet).

## Commands

Run from the repo root; site-specific scripts delegate via `pnpm --filter site`, repo-wide ones via `pnpm -r`.

- `pnpm dev` — site dev server on <http://localhost:4000> (`--host`, so also reachable on LAN)
- `pnpm admin:dev` — admin dev server on <http://localhost:4100>; needs `apps/admin/.env` (see `.env.example`)
- `pnpm admin:deploy` — `fly deploy` from the repo root (the Docker build context must be the whole workspace)
- `pnpm build` — static build to `apps/site/dist/`
- `pnpm preview` — builds, then serves `dist/` on port 4040
- `pnpm checks` — runs each package's `checks` (for the site: `typecheck`, `lint`, and `build` in parallel); this is what the husky pre-commit hook runs
- `pnpm typecheck` — `tsc --noEmit && astro check`. Run `pnpm astro sync` first on a fresh checkout so `.astro/types.d.ts` (content collection types) exists
- `pnpm lint` / `pnpm lint:fix` — ESLint (flat config; `no-console` is an error except `warn`/`error`/`info`)
- lint-staged auto-runs each package's `lint:fix` on its staged source files (`apps/site/src/**/*.{ts,astro}`, `packages/content/src/**/*.ts`)

There is no test suite. CI (`.github/workflows`) runs lint and typecheck on push/PR to `main`.

`BASE_URL` must be set (from `apps/site/.env`, gitignored) or `astro.config.mjs` throws at startup. CI uses `http://localhost:3000`.

## Architecture (`apps/site`)

Paths below are relative to `apps/site`.

**Content collection** — `src/content.config.ts` defines the single `blog` collection via a glob loader over `src/content/blog/**/*.mdx`, explicitly excluding `notes.mdx` and `todo.mdx` (`NON_POST_FILENAMES` in `@repo/content`). Post directories can therefore keep working notes alongside `index.mdx` without them becoming pages. A post's URL slug is its directory name (or filename for top-level `.mdx` posts); the route is `src/pages/blog/[...slug].astro`. Hero images live in each post's `assets/` and are referenced relatively in frontmatter (`heroImage: [./assets/hero.jpg, alt text]`).

**Frontmatter schema** is the source of truth for post metadata — see `createPostSchema` in `packages/content/src/postSchema.ts`. It takes the hero-image schema as an argument: the site passes Astro's `image()` (in `src/content.config.ts`); non-Astro consumers use the exported `postFrontmatterSchema`, which keeps `heroImage` as the relative path string. Notable fields:
- `isDraft: true` — post is hidden from `PostsList` in production builds but still visible in dev and Vercel preview deployments (`VERCEL_ENV === "preview"`). The post page itself is still generated in prod; only the listing filters it.
- `seriesInfo: [name, slug]` — links the post to a series index post at `/blog/<slug>`.
- `toc: true` — renders a headings list at the top of the post.
- `shareLinks` — tuple that must be a Bluesky URL then a Threads URL (validated by schema).

**MDX components** — components available inside post bodies are passed explicitly via `<Content components={{...}}>` in `[...slug].astro` (`CalloutBox`, `FloatBox`, `Giphy`, `Image`). Add new MDX-usable components there.

**Layouts** — `BaseLayout` (head, header, footer, Vercel analytics) → `PageLayout` (adds `<h1>` + `Typography` wrapper). `Typography.astro` centralizes Tailwind `prose` styling; pages pass overrides via a `twStyles` prop merged with `tailwind-merge`. Prefer adjusting `twStyles` over adding ad-hoc prose classes elsewhere. Tailwind 4 runs through `@tailwindcss/vite`; `src/styles/global.css` (imported in `BaseLayout`) loads `tailwind.config.mjs` via `@config`.

**Static pages** — `src/pages/about.astro` imports `src/content/static/about.mdx` directly as a component (not via a collection).

**Icons** — `astro-icon` with Iconify sets (`mdi`, `proicons`, `simple-icons`). All icon names and social link lists are centralized in `src/lib/icons.ts` (`APP_ICONS`, `ABOUT_ICON_LINKS`, `FOOTER_ICON_LINKS`).

**Markdown pipeline** — remark/rehype via `unified()` from `@astrojs/markdown-remark` set as `markdown.processor` (Astro 7 defaults to Sätteri; MDX inherits this processor). Plugins go in `unified({...})`, not on `mdx()`: `rehype-slug`, `rehype-autolink-headings`, `remark-emoji`. Code blocks via `astro-expressive-code` (`ec.config.mjs`, `github-dark-default` theme, collapsible sections plugin).

Path alias: `~/*` → `src/*`.

## Architecture (`apps/admin`)

Paths below are relative to `apps/admin`. Routes are declared explicitly in `app/routes.ts`; path alias `~/*` → `app/*`.

**GitHub App** — one app handles both sign-in and repo access (`app/lib/github.server.ts`). Sign-in uses the app's user-authorization (OAuth) web flow; the user token only identifies who signed in and isn't stored. All repo reads/writes use the app's installation token on `GITHUB_REPO`. Only `ADMIN_GITHUB_USER_ID` (numeric ID, not login) may sign in; it's re-checked on every request.

**Auth** — cookie sessions (`app/lib/session.server.ts`). `routes/protected.tsx` is a layout whose `middleware` redirects to `/login` and puts the user in `userContext`; nest every authenticated route under it.

**Env** — `app/lib/env.server.ts` validates `process.env` with zod on first use (not at import, so builds need no secrets). In dev, `vite.config.ts` loads `apps/admin/.env` into `process.env`; in production they're Fly secrets (`APP_URL` is in `fly.toml`).

**Posts** — `app/lib/posts.server.ts` reads every post's frontmatter from the default branch in one GraphQL request and validates it with `postFrontmatterSchema` from `@repo/content`. Drafts are PRs from `post/*` branches (`POST_BRANCH_PREFIX`). Values a component needs must live in non-`.server` modules (e.g. `app/lib/posts.ts`): React Router fails the build if client code imports a `.server` module.

**Deploy** — `Dockerfile` (built from the repo root, see `.dockerignore`) bundles `@repo/content` into the server build and ships only the admin's production deps via `pnpm deploy`. `react-router-serve` listens on 8080; `/healthz` is the Fly health check.

## Conventions

- Commits use conventional-commit style with gitmoji, e.g. `fix(blog): :bug: ...`. Configured scopes: `blog`, `ui`, `ops`.
- `tmp/` (repo root, gitignored) is a scratch area, not source. `dist/` is excluded from tsconfig and ESLint.
