import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Server code reads config from process.env (Fly secrets in production).
  // In dev, fill it from apps/admin/.env without overriding real env vars.
  Object.assign(process.env, {
    ...loadEnv(mode, process.cwd(), ""),
    ...process.env,
  });

  return {
    plugins: [tailwindcss(), reactRouter()],
    resolve: {
      tsconfigPaths: true,
    },
  };
});
