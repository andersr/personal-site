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
  layout("routes/protected.tsx", [index("routes/home.tsx")]),
] satisfies RouteConfig;
