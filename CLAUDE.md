# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Astro 5 static site + MDX blog for <https://www.anders.co>, deployed on Vercel. Package manager is **pnpm** (CI and the pre-commit hook both use it; don't add an npm lockfile). Node 22.

## Commands

- `pnpm dev` — dev server on <http://localhost:4000> (`--host`, so also reachable on LAN)
- `pnpm build` — static build to `dist/`
- `pnpm preview` — builds, then serves `dist/` on port 4040
- `pnpm checks` — runs `typecheck`, `lint`, and `build` in parallel; this is what the husky pre-commit hook runs
- `pnpm typecheck` — `tsc --noEmit`. Run `pnpm astro sync` first on a fresh checkout so `.astro/types.d.ts` (content collection types) exists
- `pnpm lint` / `pnpm lint:fix` — ESLint (flat config; `no-console` is an error except `warn`/`error`/`info`)
- lint-staged auto-runs `lint:fix` on staged `src/**/*.{ts,astro}`

There is no test suite. CI (`.github/workflows`) runs lint and typecheck on push/PR to `main`.

`BASE_URL` must be set (from `.env`, gitignored) or `astro.config.mjs` throws at startup. CI uses `http://localhost:3000`.

## Architecture

**Content collection** — `src/content.config.ts` defines the single `blog` collection via a glob loader over `src/content/blog/**/*.mdx`, explicitly excluding `notes.mdx` and `todo.mdx`. Post directories can therefore keep working notes alongside `index.mdx` without them becoming pages. A post's URL slug is its directory name (or filename for top-level `.mdx` posts); the route is `src/pages/blog/[...slug].astro`. Hero images live in each post's `assets/` and are referenced relatively in frontmatter (`heroImage: [./assets/hero.jpg, alt text]`).

**Frontmatter schema** is the source of truth for post metadata — see the zod schema in `src/content.config.ts`. Notable fields:
- `isDraft: true` — post is hidden from `PostsList` in production builds but still visible in dev and Vercel preview deployments (`VERCEL_ENV === "preview"`). The post page itself is still generated in prod; only the listing filters it.
- `seriesInfo: [name, slug]` — links the post to a series index post at `/blog/<slug>`.
- `toc: true` — renders a headings list at the top of the post.
- `shareLinks` — tuple that must be a Bluesky URL then a Threads URL (validated by schema).

**MDX components** — components available inside post bodies are passed explicitly via `<Content components={{...}}>` in `[...slug].astro` (`CalloutBox`, `FloatBox`, `Giphy`, `Image`). Add new MDX-usable components there.

**Layouts** — `BaseLayout` (head, header, footer, Vercel analytics) → `PageLayout` (adds `<h1>` + `Typography` wrapper). `Typography.astro` centralizes Tailwind `prose` styling; pages pass overrides via a `twStyles` prop merged with `tailwind-merge`. Prefer adjusting `twStyles` over adding ad-hoc prose classes elsewhere.

**Static pages** — `src/pages/about.astro` imports `src/content/static/about.mdx` directly as a component (not via a collection).

**Icons** — `astro-icon` with Iconify sets (`mdi`, `proicons`, `simple-icons`). All icon names and social link lists are centralized in `src/lib/icons.ts` (`APP_ICONS`, `ABOUT_ICON_LINKS`, `FOOTER_ICON_LINKS`).

**Markdown pipeline** — `rehype-slug` + `rehype-autolink-headings` globally; `remark-emoji` for MDX; code blocks via `astro-expressive-code` (`ec.config.mjs`, `github-dark-default` theme, collapsible sections plugin).

Path alias: `~/*` → `src/*`.

## Conventions

- Commits use conventional-commit style with gitmoji, e.g. `fix(blog): :bug: ...`. Configured scopes: `blog`, `ui`, `ops`.
- `tmp/` and `dist/` are excluded from tsconfig and ESLint; `tmp/` is a scratch area, not source.
