// @ts-check
import mdx from "@astrojs/mdx";
import tailwind from "@astrojs/tailwind";
import icon from "astro-icon";
import { defineConfig } from "astro/config";
import emoji from "remark-emoji";
import { loadEnv } from "vite";

const { APP_DOMAIN } = loadEnv(
  process.env.NODE_ENV ?? "development",
  process.cwd(),
  "",
);

if (!APP_DOMAIN) {
  throw new Error("APP_DOMAIN is required");
}
// https://astro.build/config
export default defineConfig({
  site: APP_DOMAIN,
  integrations: [
    tailwind(),
    icon(),
    mdx({
      remarkPlugins: [[emoji, { emoticon: true, accessible: true }]],
    }),
  ],
});
