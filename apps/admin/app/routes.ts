import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  route("auth/github", "routes/auth.github.ts"),
  route("auth/github/callback", "routes/auth.github.callback.ts"),
  route("logout", "routes/logout.ts"),
  route("healthz", "routes/healthz.ts"),
  layout("routes/protected.tsx", [
    index("routes/home.tsx"),
    route("drafts/new", "routes/drafts.new.tsx"),
    route("drafts/:slug", "routes/drafts.$slug.tsx"),
    route("drafts/:slug/preview", "routes/drafts.$slug.preview.ts"),
    route("drafts/:slug/assets/:file", "routes/drafts.$slug.assets.$file.ts"),
    route("api/drafts/generate", "routes/api.drafts.generate.ts"),
    route("api/drafts/:slug/revise", "routes/api.drafts.$slug.revise.ts"),
  ]),
] satisfies RouteConfig;
